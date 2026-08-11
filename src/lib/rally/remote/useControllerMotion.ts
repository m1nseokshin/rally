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
const TILT_RANGE_Y = 32;
/** 폰을 세로로 들었을 때의 beta 기준값 — 여기서 얼마나 벗어났는지로 위아래를 읽는다 */
const BETA_NEUTRAL = 90;

/**
 * 스윙으로 칠 가속도(m/s²). 손을 뻗어 라켓을 휘두르면 20~30이 나오고,
 * 폰을 들고 가만히 서 있으면 1~2를 넘지 않는다. 걷거나 폰을 고쳐 쥐는
 * 정도(5~8)에서 오발동하지 않도록 14에 뒀다.
 */
const SWING_TRIGGER_ACCEL = 14;
/** 이 아래로 떨어져야 다음 스윙을 받는다 — 한 번 휘두르는 동안 연발 방지 */
const SWING_REARM_ACCEL = 6;
/** 풀파워로 치는 가속도 — 이 위는 전부 power 1 */
const SWING_FULL_ACCEL = 36;
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
  const poseRef = useRef<ControllerPose>({ x: 0.5, y: 0.6, roll: 0 });
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

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta === null && e.gamma === null) return;
      if (!sawEvent) {
        sawEvent = true;
        setLive(true);
      }
      const gamma = e.gamma ?? 0;
      const beta = e.beta ?? BETA_NEUTRAL;

      const x = clamp(0.5 + gamma / (TILT_RANGE_X * 2), 0, 1);
      // beta가 커지면(뒤로 눕히면) 라켓이 내려간다 — 폰을 세우면 위,
      // 눕히면 아래. 실제로 라켓을 들었다 내리는 손목 각도와 방향이 같다.
      const y = clamp(0.5 + (beta - BETA_NEUTRAL) / (TILT_RANGE_Y * 2), 0, 1);

      const prev = poseRef.current;
      // 자이로는 미세하게 계속 떨린다 — 그대로 쓰면 라켓이 잘게 진동한다.
      // 살짝 붙잡아 두되, 스윙 타이밍이 밀리지 않을 만큼만 완만하게.
      poseRef.current = {
        x: lerp(prev.x, x, 0.35),
        y: lerp(prev.y, y, 0.35),
        roll: (gamma * Math.PI) / 180,
      };
    };

    const onMotion = (e: DeviceMotionEvent) => {
      // acceleration은 중력이 빠진 값이라 이게 있으면 그대로 쓴다.
      // 없는 기기는 중력 포함값에서 크기만 보고 1G를 빼서 근사한다 —
      // 정밀하진 않지만 "휘둘렀나"를 가리는 데는 충분하다.
      const a = e.acceleration;
      const g = e.accelerationIncludingGravity;
      let ax = 0;
      let ay = 0;
      let mag = 0;

      if (a && (a.x !== null || a.y !== null || a.z !== null)) {
        ax = a.x ?? 0;
        ay = a.y ?? 0;
        mag = Math.hypot(ax, ay, a.z ?? 0);
      } else if (g && (g.x !== null || g.y !== null || g.z !== null)) {
        ax = g.x ?? 0;
        ay = g.y ?? 0;
        mag = Math.abs(Math.hypot(ax, ay, g.z ?? 0) - 9.81);
      } else {
        return;
      }

      if (!sawEvent) {
        sawEvent = true;
        setLive(true);
      }

      const now = performance.now();
      if (mag < SWING_REARM_ACCEL) armed = true;
      if (armed && mag > SWING_TRIGGER_ACCEL && now - lastSwingAt > SWING_COOLDOWN_MS) {
        armed = false;
        lastSwingAt = now;
        // 카메라 쪽과 같은 판단 — 가속도 "정점"을 기다리면 세기가 더
        // 정확하지만 그만큼 늦게 발화한다. PERFECT_WINDOW가 0.12초라
        // 타이밍이 세기보다 우선이므로 임계를 넘는 즉시 보낸다.
        const power = clamp(
          (mag - SWING_TRIGGER_ACCEL) / (SWING_FULL_ACCEL - SWING_TRIGGER_ACCEL),
          0,
          1,
        );
        onSwingRef.current?.(power, Math.atan2(ay, ax));
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
