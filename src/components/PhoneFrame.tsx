"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import TabBar from "./TabBar";

/** iPhone 17 논리 해상도 — PC 테스트용 프레임 크기 */
const DEVICE_W = 402;
const DEVICE_H = 874;
/** 베젤(box-shadow ring 11px) 포함 실제 점유 크기 */
const BEZEL = 22;
/** 프레임 주변 최소 여백 */
const GUTTER = 32;
/** 프레임 모드로 전환되는 폭 — Tailwind md */
const FRAME_BP = 768;

/** 첫 페인트 전에 스케일을 잡아야 잘린 프레임이 한 프레임도 보이지 않는다 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * 실기기에선 전체 화면 그대로, PC에선 402×874 프레임 안에 담아 테스트한다.
 * 뷰포트가 프레임보다 작으면 원본 비율을 유지한 채 transform으로 축소한다.
 * 상태바·홈 인디케이터는 OS가 그리므로 여기서 흉내내지 않는다.
 */
export default function PhoneFrame({
  children,
  hideTabBar,
}: {
  children: ReactNode;
  /** 온보딩처럼 탭 화면이 아닌 전용 플로우에선 하단 탭바를 숨긴다 */
  hideTabBar?: boolean;
}) {
  const scalerRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = scalerRef.current;
    if (!el) return;

    const fit = () => {
      const { innerWidth: w, innerHeight: h } = window;

      // 실기기 폭에선 프레임을 쓰지 않으므로 축소도 하지 않는다
      if (w < FRAME_BP) {
        el.style.setProperty("--s", "1");
        return;
      }

      const scale = Math.min(
        1,
        (h - GUTTER) / (DEVICE_H + BEZEL),
        (w - GUTTER) / (DEVICE_W + BEZEL),
      );
      el.style.setProperty("--s", String(scale));
    };

    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  return (
    <div className="flex h-dvh w-full items-center justify-center overflow-hidden bg-canvas md:bg-cloud">
      <div
        ref={scalerRef}
        className="origin-center"
        style={{ transform: "scale(var(--s, 1))" }}
      >
        {/*
          transform을 걸어 이 div가 position:fixed 자식들의 컨테이닝 블록이 되게 한다.
          이게 없으면 바텀시트(fixed inset-0)의 기준이 바깥 scaler가 돼서,
          프레임의 overflow-hidden과 둥근 모서리를 무시하고 폰 화면 밖으로
          삐져나온다. translateZ(0)은 렌더링 결과를 바꾸지 않으면서
          컨테이닝 블록만 만들어 주는 표준 수법이다.
        */}
        <div
          className="relative flex h-dvh w-screen flex-col overflow-hidden bg-canvas md:h-[874px] md:w-[402px] md:rounded-[54px] md:shadow-[0_0_0_11px_#111111,0_28px_60px_-12px_rgba(0,0,0,0.4)]"
          style={{ transform: "translateZ(0)" }}
        >
          <main className="rail flex-1 overflow-y-auto overscroll-contain pt-[env(safe-area-inset-top)]">
            {children}
          </main>
          {!hideTabBar && <TabBar />}
        </div>
      </div>
    </div>
  );
}
