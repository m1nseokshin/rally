"use client";

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/**
 * 바텀시트를 손잡이(핸들 바)에서 아래로 끌어 닫는 제스처.
 *
 * 지금까지 시트는 배경을 탭해야만 닫혔다 — 아래로 끄는 몸짓 자체엔
 * 반응하지 않았다. 이 훅은 손가락을 그대로 따라가다가(1:1, 실시간),
 * 손을 뗀 순간에만 "이만큼 끌었으면 닫는다 / 아니면 제자리로 돌아간다"를
 * 판정한다 — onboarding의 StepsCarousel 스와이프와 같은 패턴이다.
 *
 * 위로는 못 끈다 — 시트가 이미 다 펼쳐진 상태라 위로 끌어봐야 더 보여줄
 * 내용이 없고, 아래로 끄는 것만 "닫기"로 자연스럽게 읽힌다.
 */

/** 이만큼 끌면 손을 놓아도 닫힌다(px) */
const CLOSE_THRESHOLD_PX = 90;
/** 이보다 빠르게 튕기면 짧게 끌어도 닫힌다(px/ms) — "휙 내리는" 동작 */
const CLOSE_VELOCITY = 0.6;

export function useSheetDrag(onClose: () => void) {
  const pointerIdRef = useRef<number | null>(null);
  const startYRef = useRef(0);
  const startTRef = useRef(0);
  const [dragY, setDragY] = useState(0);

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerIdRef.current = e.pointerId;
    startYRef.current = e.clientY;
    startTRef.current = performance.now();
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    setDragY(Math.max(0, e.clientY - startYRef.current));
  }, []);

  const endDrag = useCallback(
    (e: ReactPointerEvent) => {
      if (pointerIdRef.current !== e.pointerId) return;
      pointerIdRef.current = null;
      const elapsedMs = performance.now() - startTRef.current;
      const velocity = dragY / Math.max(1, elapsedMs);
      const shouldClose = dragY > CLOSE_THRESHOLD_PX || velocity > CLOSE_VELOCITY;
      setDragY(0);
      if (shouldClose) onClose();
    },
    [dragY, onClose],
  );

  return {
    /** 손잡이(또는 헤더)에 그대로 펼쳐서 붙이는 포인터 핸들러 */
    handleProps: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
    /** 시트 루트 div의 style에 그대로 합친다 — 드래그 중엔 손가락을 1:1로 따라간다 */
    sheetStyle: dragY
      ? { transform: `translateY(${dragY}px)`, transition: "none" }
      : undefined,
  };
}
