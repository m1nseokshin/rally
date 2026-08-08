"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type HandPose = {
  /** 손바닥 중심 — 화면에 보이는(미러링된) 좌표 기준 0~1 */
  x: number;
  y: number;
  /** 손목→중지 방향 각도(라디안) — 라켓을 쥔 손의 기울기로 쓴다 */
  angle: number;
  present: boolean;
};

const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

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

/**
 * 카메라 프레임에서 손 위치를 실시간으로 읽어 라켓을 그 위치로 부드럽게
 * 따라 움직이게 한다. 모델 로드가 실패하면(오프라인, 구형 기기 등)
 * ready가 false로 남고, 호출부는 자이로 기반 동작으로 자연히 폴백한다.
 *
 * videoRef는 리액트 ref라 .current가 바뀌어도 이펙트가 재실행되지 않는다 —
 * 그래서 active(카메라가 실제로 재생 중인 시점에 true가 되는 state)를
 * 트리거로 쓰고, 그 순간 videoRef.current를 읽는다.
 */
export function useHandTracking(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  active: boolean,
) {
  const poseRef = useRef<HandPose>({ x: 0.5, y: 0.85, angle: 0, present: false });
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!active || !video) return;
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let landmarker: any = null;

    loadLandmarker()
      .then((lm) => {
        if (cancelled) return;
        landmarker = lm;
        setReady(true);

        const tick = () => {
          rafRef.current = requestAnimationFrame(tick);
          if (video.readyState < 2) return;
          const result = landmarker.detectForVideo(video, performance.now());
          const hand = result.landmarks?.[0];
          if (!hand) {
            poseRef.current = { ...poseRef.current, present: false };
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
          poseRef.current = { x: 1 - cx, y: cy, angle: -angle, present: true };
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
