"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CURL_CLOSED_RATIO,
  CURL_OPEN_RATIO,
  SPEED_FULL,
  SWING_COOLDOWN,
  SWING_REARM,
  SWING_TRIGGER,
} from "./rallyConfig";

export type HandPose = {
  /** 손바닥 중심 — 화면에 보이는(미러링된) 좌표 기준 0~1 */
  x: number;
  y: number;
  /** 손목→중지 방향 각도(라디안) — 라켓을 쥔 손의 기울기로 쓴다 */
  angle: number;
  present: boolean;
  /** 0(편 손바닥) ~ 1(꽉 쥔 주먹) */
  curl: number;
  /**
   * max(curl, 1-curl) — 주먹이든 편 손바닥이든 "명확한 포즈"면 1에 가깝고,
   * 반쯤 굽힌 애매한 손이면 0.5에 가깝다. 절대 스윙을 막지 않는다 —
   * 라켓이 손을 얼마나 확신하고 따라갈지 가중치로만 쓴다.
   */
  clarity: number;
  /** 화면 좌표계 기준 손 속도(단위/초), EMA 적용 */
  vx: number;
  vy: number;
  /** hypot(vx,vy)/SPEED_FULL 을 0~1로 클램프 */
  speed: number;
};

/** 휘두르는 제스처가 감지된 순간 */
export type Swing = {
  /** 0(살살) ~ 1(풀스윙) */
  power: number;
  x: number;
  y: number;
  /** 스윙 방향(라디안) */
  dir: number;
  at: number;
  source: "hand" | "motion";
};

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

/**
 * MediaPipe는 메인 스레드에서 돈다 — 60Hz로 추론하면 Three.js 렌더 루프가
 * 굶어서 오히려 게임이 끊긴다. 30Hz면 손 추적 체감은 그대로다.
 */
const DETECT_INTERVAL_MS = 28;

/** 검지·중지·약지·새끼의 [MCP, TIP]. 엄지는 그립에서 가려지고 개인차가 커서 뺐다 */
const FINGERS: [number, number][] = [
  [5, 8],
  [9, 12],
  [13, 16],
  [17, 20],
];

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- 동적 import 타입, 모듈 로드 실패도 흔해 엄격 타입 이득이 적다
let landmarkerPromise: Promise<any> | null = null;

async function loadLandmarker() {
  if (landmarkerPromise) return landmarkerPromise;
  landmarkerPromise = (async () => {
    const { HandLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
    const files = await FilesetResolver.forVisionTasks(WASM_URL);
    try {
      return await HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numHands: 1,
      });
    } catch {
      // GPU 델리게이트를 지원 안 하는 기기(구형 안드로이드 등)는 CPU로 재시도
      return HandLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
        runningMode: "VIDEO",
        numHands: 1,
      });
    }
  })();
  return landmarkerPromise;
}

type Landmark = { x: number; y: number; z: number };

/**
 * 손가락이 얼마나 말려 있는가 — 0(폄) ~ 1(주먹).
 *
 * 손목→중지MCP 거리로 정규화하기 때문에 손이 카메라에서 멀든 가깝든,
 * 손을 어느 방향으로 돌리든 같은 값이 나온다.
 *
 * 알려진 한계: 손가락을 카메라 정면으로 곧게 뻗으면 원근 단축 때문에
 * 짧게 보여 주먹으로 오검출된다. 라켓을 쥐는 자연스러운 자세가 아니라
 * 실사용에선 거의 안 부딪힌다.
 */
function measureCurl(hand: Landmark[]): number | null {
  const scale = Math.hypot(hand[9].x - hand[0].x, hand[9].y - hand[0].y);
  if (scale < 1e-4) return null;

  let sum = 0;
  for (const [mcp, tip] of FINGERS) {
    const ratio = Math.hypot(hand[tip].x - hand[mcp].x, hand[tip].y - hand[mcp].y) / scale;
    sum += clamp((CURL_OPEN_RATIO - ratio) / (CURL_OPEN_RATIO - CURL_CLOSED_RATIO), 0, 1);
  }
  return sum / FINGERS.length;
}

/**
 * 카메라 프레임에서 손 위치를 실시간으로 읽어 라켓을 그 위치로 부드럽게
 * 따라 움직이게 하고, 휘두르는 제스처를 감지해 onSwing으로 알린다.
 * 모델 로드가 실패하면(오프라인, 구형 기기 등) ready가 false로 남고,
 * 호출부는 모션 카메라 + 자이로 기반 동작으로 자연히 폴백한다.
 *
 * videoRef는 리액트 ref라 .current가 바뀌어도 이펙트가 재실행되지 않는다 —
 * 그래서 active(카메라가 실제로 재생 중인 시점에 true가 되는 state)를
 * 트리거로 쓰고, 그 순간 videoRef.current를 읽는다.
 */
export function useHandTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  active: boolean,
  onSwing?: (s: Swing) => void,
) {
  const poseRef = useRef<HandPose>({
    x: 0.5,
    y: 0.85,
    angle: 0,
    present: false,
    curl: 0,
    clarity: 0,
    vx: 0,
    vy: 0,
    speed: 0,
  });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const rafRef = useRef<number | null>(null);

  // onSwing이 매 렌더 새 함수여도 rAF 루프가 재시작되지 않도록 ref에 담는다
  // (useMotionCamera와 같은 패턴)
  const onSwingRef = useRef(onSwing);
  useEffect(() => {
    onSwingRef.current = onSwing;
  }, [onSwing]);

  useEffect(() => {
    const video = videoRef.current;
    if (!active || !video) return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let landmarker: any = null;

    let lastDetect = 0;
    let prevX = 0.5;
    let prevY = 0.85;
    let prevT = 0;
    let armed = true;
    let lastSwingAt = 0;

    loadLandmarker()
      .then((lm) => {
        if (cancelled) return;
        landmarker = lm;
        setReady(true);

        const tick = () => {
          rafRef.current = requestAnimationFrame(tick);
          if (video.readyState < 2) return;

          const now = performance.now();
          if (now - lastDetect < DETECT_INTERVAL_MS) return;
          lastDetect = now;

          const result = landmarker.detectForVideo(video, now);
          const hand = result.landmarks?.[0] as Landmark[] | undefined;
          if (!hand) {
            // 손을 놓쳐도 속도는 0으로 죽인다 — 안 그러면 마지막 속도가 남아
            // 손이 다시 잡히는 순간 유령 스윙이 나간다
            poseRef.current = { ...poseRef.current, present: false, vx: 0, vy: 0, speed: 0 };
            prevT = 0;
            return;
          }

          // 손바닥 중심 — 손목/검지·중지·약지·새끼 뿌리 다섯 점 평균이
          // 손끝 하나만 볼 때보다 흔들림이 적다
          const idx = [0, 5, 9, 13, 17];
          let cx = 0;
          let cy = 0;
          for (const i of idx) {
            cx += hand[i].x;
            cy += hand[i].y;
          }
          cx /= idx.length;
          cy /= idx.length;

          const wrist = hand[0];
          const middleMcp = hand[9];
          const angle = Math.atan2(middleMcp.x - wrist.x, wrist.y - middleMcp.y);

          // 카메라 영상은 셀피처럼 좌우 반전해서 보여준다 — 감지는 원본
          // 프레임 기준이라 화면에 보이는 좌표로 맞추려면 x를 뒤집어야 한다
          const x = 1 - cx;
          const y = cy;

          const prev = poseRef.current;
          const rawCurl = measureCurl(hand);
          // 한 프레임 오검출이 그립 표시를 끊지 않도록 완만하게 따라간다
          const curl = rawCurl === null ? prev.curl : lerp(prev.curl, rawCurl, 0.35);

          let vx = prev.vx;
          let vy = prev.vy;
          let speed = prev.speed;
          const dt = prevT === 0 ? 0 : (now - prevT) / 1000;
          if (dt > 0.005 && dt < 0.2) {
            // 가벼운 EMA — 피크를 죽이면 강하게 휘둘러도 power가 안 오른다
            vx = lerp(vx, (x - prevX) / dt, 0.5);
            vy = lerp(vy, (y - prevY) / dt, 0.5);
            speed = clamp(Math.hypot(vx, vy) / SPEED_FULL, 0, 1);
          }
          prevX = x;
          prevY = y;
          prevT = now;

          poseRef.current = {
            x,
            y,
            angle: -angle,
            present: true,
            curl,
            clarity: Math.max(curl, 1 - curl),
            vx,
            vy,
            speed,
          };

          // 휘두르는 제스처 판정 — 한 번 휘두르는 동안 연발하지 않도록
          // 속도가 충분히 떨어져야 재장전된다.
          if (speed < SWING_REARM) armed = true;
          if (armed && speed > SWING_TRIGGER && now - lastSwingAt > SWING_COOLDOWN) {
            armed = false;
            lastSwingAt = now;
            // 속도 "피크"를 기다리면 power가 더 정확하지만 최대 140ms가 밀린다.
            // PERFECT_WINDOW가 0.12초인 리듬 게임에선 치명적이라 임계를
            // 넘는 순간 바로 발화한다 — 타이밍이 정확도보다 우선이다.
            onSwingRef.current?.({
              power: clamp((speed - 0.3) / 0.55, 0, 1),
              x,
              y,
              dir: Math.atan2(vy, vx),
              at: now,
              source: "hand",
            });
          }
        };
        tick();
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [videoRef, active]);

  const getPose = useCallback(() => poseRef.current, []);

  return { getPose, ready, failed };
}
