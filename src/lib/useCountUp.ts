"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 0에서 목표값까지 숫자가 올라가는 효과.
 *
 * setInterval로 일정 간격씩 더하지 않고 rAF + 경과시간으로 계산한다 —
 * 프레임을 건너뛰어도 총 길이가 항상 duration으로 유지되고, 마지막 프레임에
 * 정확히 목표값으로 떨어진다(간격 누적 방식은 오차가 남아 99에서 멈추곤 한다).
 *
 * 감속 곡선(easeOutCubic)을 써서 처음엔 빠르게 훑고 끝에서 천천히 멎는다.
 */
export function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 모션을 줄여달라는 사용자에겐 곧장 최종값을 보여준다.
    // 이펙트 본문에서 바로 setState하지 않도록 한 틱 미룬다
    // (react-hooks/set-state-in-effect — 프로젝트 공통 패턴).
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = setTimeout(() => setValue(target), 0);
      return () => clearTimeout(id);
    }

    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}
