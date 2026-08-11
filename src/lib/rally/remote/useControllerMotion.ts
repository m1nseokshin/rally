"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ControllerPose = { x: number; y: number; roll: number };

type IOSDeviceOrientationEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};
type IOSDeviceMotionEvent = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/**
 * 기울기를 라켓 위치로 옮길 때 쓰는 각도 범위(도).
 * 손목만 까딱해서 코트 끝까지 닿아야 해서 넉넉하게 잡지 않았다 — 이보다
 * 넓히면 팔을 크게 휘둘러야 하고, 좁히면 조금만 흔들려도 라켓이 튄다.
 */
const TILT_RANGE_X = 38;

/**
 * 라켓 높이를 여기에 고정한다. 위아래는 아예 입력으로 받지 않는다 —
 * 좌우만 맞추면 높이는 늘 맞도록 해서, 폰으로도 확실하게 칠 수 있게 하려는
 * 의도다.
 *
 * 0.7632라는 값은 RallyScene의 매핑을 거꾸로 푼 것이다:
 *   worldY = -2.15 + (1 - y) * 1.9  이고, 공이 도착하는 높이가
 *   CONTACT_Y(-1.7)이므로  y = 1 - (-1.7 + 2.15) / 1.9 = 0.7632.
 * 즉 라켓이 항상 공이 지나가는 바로 그 높이에 있게 된다. 씬의 세로
 * 판정 반경(HIT_RADIUS_Y_*)이 넉넉히 남으므로 세로는 사실상 항상 통과하고,
 * 좌우(dx)만 판정에 관여한다.
 */
const FIXED_Y = 0.7632;

/**
 * 앞으로 휘두를 때 나오는 가속도(m/s²)의 문턱값.
 *
 * 3축 크기가 아니라 "화면면에 수직인 성분"만 본다. 폰을 라켓처럼 쥐면
 * 화면이 곧 라켓 면이라, 앞으로 미는 스윙은 그 면의 법선(z축) 방향으로
 * 나온다. 부호는 보지 않는다 — 화면을 앞으로 두고 쥐든 뒤로 두고 쥐든
 * 같게 동작해야 하기 때문이다. 이렇게 하면 좌우로 흔들거나 걸을 때
 * 생기는 흔들림은 z에 거의 안 실려서 걸러진다.
 *
 * 3축 합이 아니라 한 축만 보므로 예전(14)보다 낮춰 잡았다.
 */
const SWING_TRIGGER_ACCEL = 11;
/** 이 아래로 떨어져야 다음 스윙을 받는다 — 한 번 휘두르는 동안 연발 방지 */
const SWING_REARM_ACCEL = 5;
/** 풀파워로 치는 가속도 — 이 위는 전부 power 1 */
const SWING_FULL_ACCEL = 30;
const SWING_COOLDOWN_MS = 280;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * 폰을 라켓처럼 쓰는 쪽(컨트롤러) 센서 읽기.
 *
 * 기울기(deviceorientation)로 라켓 위치를, 가속도(devicemotion)로 휘두르는
 * 순간을 잡는다. 카메라 손 추적이 하던 일과 같은데, 조명·배경·손이 프레임을
 * 벗어나는 문제가 원천적으로 없다.
 *
 * 좌표계는 카메라 쪽 HandPose와 맞춘다 — x는 화면 왼쪽 0 ~ 오른쪽 1,
 * y는 위 0 ~ 아래 1. 그래야 호스트가 두 입력을 구분 없이 씬에 넘길 수 있다.
 */
export function useControllerMotion(onSwing?: (power: number, dir: number) => void) {
  const poseRef = useRef<ControllerPose>({ x: 0.5, y: FIXED_Y, roll: 0 });
  const [granted, setGranted] = useState(false);
  const [denied, setDenied] = useState(false);
  /** 센서가 실제로 값을 주고 있는가 — 권한만 받고 조용한 기기를 구분한다 */
  const [live, setLive] = useState(false);

  const onSwingRef = useRef(onSwing);
  useEffect(() => {
    onSwingRef.current = onSwing;
  }, [onSwing]);

  useEffect(() => {
    if (!granted) return;

    let armed = true;
    let lastSwingAt = 0;
    let sawEvent = false;
    /** accelerationIncludingGravity만 주는 기기용 z축 중력 추정치 */
    let gravityZ: number | null = null;

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta === null && e.gamma === null) return;
      if (!sawEvent) {
        sawEvent = true;
        setLive(true);
      }
      const gamma = e.gamma ?? 0;
      const x = clamp(0.5 + gamma / (TILT_RANGE_X * 2), 0, 1);

      const prev = poseRef.current;
      // 자이로는 미세하게 계속 떨린다 — 그대로 쓰면 라켓이 잘게 진동한다.
      // 살짝 붙잡아 두되, 스윙 타이밍이 밀리지 않을 만큼만 완만하게.
      // y는 건드리지 않는다 — 위아래는 입력으로 받지 않고 FIXED_Y에 고정이다.
      poseRef.current = {
        x: lerp(prev.x, x, 0.35),
        y: FIXED_Y,
        roll: (gamma * Math.PI) / 180,
      };
    };

    const onMotion = (e: DeviceMotionEvent) => {
      // 앞으로 미는 성분(화면면의 법선 = z축)만 본다.
      // acceleration은 중력이 이미 빠진 값이라 그대로 쓴다. 없는 기기는
      // 중력 포함값에서 z축 중력 성분을 저역통과로 추정해 빼낸다 —
      // 폰을 든 자세가 바뀌면 그쪽으로 서서히 따라가고, 스윙처럼 빠른
      // 변화는 추정치에 거의 안 섞여서 그대로 남는다.
      const a = e.acceleration;
      const g = e.accelerationIncludingGravity;
      let az: number;

      if (a && a.z !== null && a.z !== undefined) {
        az = a.z;
      } else if (g && g.z !== null && g.z !== undefined) {
        // 첫 샘플은 통째로 중력으로 본다 — 0에서 시작하면 그 차이가
        // 그대로 가짜 스윙이 된다.
        gravityZ = gravityZ === null ? g.z : lerp(gravityZ, g.z, 0.08);
        az = g.z - gravityZ;
      } else {
        return;
      }

      if (!sawEvent) {
        sawEvent = true;
        setLive(true);
      }

      // 부호는 보지 않는다 — 화면을 앞으로 두고 쥐든 뒤로 두고 쥐든
      // 같은 동작으로 쳐져야 한다.
      const forward = Math.abs(az);

      const now = performance.now();
      if (forward < SWING_REARM_ACCEL) armed = true;
      if (armed && forward > SWING_TRIGGER_ACCEL && now - lastSwingAt > SWING_COOLDOWN_MS) {
        armed = false;
        lastSwingAt = now;
        // 카메라 쪽과 같은 판단 — 가속도 "정점"을 기다리면 세기가 더
        // 정확하지만 그만큼 늦게 발화한다. PERFECT_WINDOW가 0.12초라
        // 타이밍이 세기보다 우선이므로 임계를 넘는 즉시 보낸다.
        const power = clamp(
          (forward - SWING_TRIGGER_ACCEL) / (SWING_FULL_ACCEL - SWING_TRIGGER_ACCEL),
          0,
          1,
        );
        onSwingRef.current?.(power, 0);
      }
    };

    window.addEventListener("deviceorientation", onOrient);
    window.addEventListener("devicemotion", onMotion);
    return () => {
      window.removeEventListener("deviceorientation", onOrient);
      window.removeEventListener("devicemotion", onMotion);
    };
  }, [granted]);

  /**
   * iOS는 클릭 핸들러 안에서, 다른 await보다 먼저 불러야만 권한 창이 뜬다.
   * 기울기와 가속도가 별도 권한이라 둘 다 요청해야 한다.
   */
  const requestPermission = useCallback(async () => {
    const DOE = (
      typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent : undefined
    ) as IOSDeviceOrientationEvent | undefined;
    const DME = (
      typeof DeviceMotionEvent !== "undefined" ? DeviceMotionEvent : undefined
    ) as IOSDeviceMotionEvent | undefined;

    if (!DOE && !DME) {
      setDenied(true);
      return false;
    }

    try {
      if (DOE?.requestPermission) {
        if ((await DOE.requestPermission()) !== "granted") {
          setDenied(true);
          return false;
        }
      }
      if (DME?.requestPermission) {
        if ((await DME.requestPermission()) !== "granted") {
          setDenied(true);
          return false;
        }
      }
    } catch {
      setDenied(true);
      return false;
    }

    setGranted(true);
    return true;
  }, []);

  const getPose = useCallback(() => poseRef.current, []);

  return { getPose, requestPermission, granted, denied, live };
}
