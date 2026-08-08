"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** 모션 감지 결과 — 화면을 좌/우로 나눠 어느 쪽에서 스윙이 났는지 판단 */
export type MotionEvent = {
  /** 움직임 세기 0~1 */
  intensity: number;
  /** 움직임 중심의 가로 위치 0(왼쪽)~1(오른쪽) — 화면에 보이는 대로(미러링 반영) */
  x: number;
  at: number;
};

type Options = {
  /** 스윙으로 인정할 최소 세기 */
  threshold?: number;
  /** 연속 감지를 막는 쿨다운(ms) */
  cooldownMs?: number;
  onSwing?: (e: MotionEvent) => void;
};

/**
 * 카메라 프레임 차분(frame differencing)으로 스윙 동작을 감지한다.
 * 매 프레임을 저해상도 그레이스케일로 줄여 이전 프레임과 픽셀 차이를 계산 —
 * 별도 ML 모델 없이 브라우저만으로 동작하고, 연산량도 가볍다.
 */
export function useMotionCamera({
  threshold = 0.055,
  cooldownMs = 260,
  onSwing,
}: Options = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null);
  const lastSwingRef = useRef(0);
  const onSwingRef = useRef(onSwing);

  // 최신 콜백을 ref에 담아둔다 — rAF 루프를 재시작하지 않고도 갱신되도록
  useEffect(() => {
    onSwingRef.current = onSwing;
  }, [onSwing]);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(0);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    prevFrameRef.current = null;
    setReady(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      // 브라우저는 HTTPS(또는 localhost)에서만 카메라를 허용한다.
      // 폰에서 http://192.168.x.x로 접속하면 여기서 걸리는데,
      // 원인을 모르면 권한 문제로 오해하기 쉬워 따로 안내한다.
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "카메라는 HTTPS에서만 열려요. 폰에서 테스트하려면 `npm run dev:https`로 실행한 뒤 https:// 주소로 접속하세요.",
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error("비디오 엘리먼트를 찾지 못했어요.");
      video.srcObject = stream;
      await video.play();
      setReady(true);

      // 분석용 저해상도 캔버스 — 64×48이면 스윙 감지엔 충분하고 연산이 가볍다
      const W = 64;
      const H = 48;
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

      const tick = () => {
        rafRef.current = requestAnimationFrame(tick);
        if (video.readyState < 2) return;

        ctx.drawImage(video, 0, 0, W, H);
        const frame = ctx.getImageData(0, 0, W, H).data;
        const prev = prevFrameRef.current;

        if (prev) {
          let changed = 0;
          let weightedX = 0;
          for (let i = 0; i < frame.length; i += 4) {
            // 그레이스케일 근사 — 정확한 휘도 대신 합산으로 충분
            const now = frame[i] + frame[i + 1] + frame[i + 2];
            const before = prev[i] + prev[i + 1] + prev[i + 2];
            if (Math.abs(now - before) > 90) {
              changed++;
              weightedX += ((i / 4) % W) / W;
            }
          }
          const total = frame.length / 4;
          const ratio = changed / total;
          setIntensity(ratio);

          const now = performance.now();
          if (ratio > threshold && now - lastSwingRef.current > cooldownMs) {
            lastSwingRef.current = now;
            onSwingRef.current?.({
              intensity: Math.min(1, ratio / (threshold * 3)),
              // 배경 <video>가 scale-x-[-1]로 뒤집혀 보이므로 여기서도 뒤집어
              // HandPose.x(이미 1-cx로 미러링됨)와 좌표계를 맞춘다 —
              // 안 맞추면 두 스윙 소스가 서로 반대편을 가리킨다.
              x: changed > 0 ? 1 - weightedX / changed : 0.5,
              at: now,
            });
          }
        }
        prevFrameRef.current = new Uint8ClampedArray(frame);
      };
      tick();
    } catch (e) {
      const message =
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "카메라 권한이 필요해요. 브라우저 설정에서 허용해주세요."
          : e instanceof Error
            ? e.message
            : "카메라를 열지 못했어요.";
      setError(message);
      setReady(false);
    }
  }, [threshold, cooldownMs]);

  useEffect(() => stop, [stop]);

  // 매 렌더마다 새 객체를 돌려주면 이 값을 의존성으로 쓰는 이펙트가
  // 계속 재실행돼 카메라 루프가 꺼진다. 참조를 안정적으로 유지한다.
  return useMemo(
    () => ({ videoRef, start, stop, ready, error, intensity }),
    [start, stop, ready, error, intensity],
  );
}
