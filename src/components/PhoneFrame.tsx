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
  const outerRef = useRef<HTMLDivElement>(null);
  const scalerRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const outer = outerRef.current;
    const el = scalerRef.current;
    const frame = frameRef.current;
    if (!outer || !el || !frame) return;

    const fit = () => {
      const { innerWidth: w, innerHeight: h } = window;

      // iOS 홈 화면에 추가한 스탠드얼론 PWA에서 100dvh가 실제 화면 높이보다
      // 살짝 작게 잡히는 경우가 있다 — 그러면 프레임이 진짜 화면 아래까지
      // 못 닿고, 그 틈으로 배경(흰색)이 그대로 보인다. 탭바 색이 배경과
      // 같아서 경계가 안 보일 뿐 여백은 실재한다. window.innerHeight를
      // 직접 재서 픽셀로 박아 넣는 게 dvh보다 신뢰할 수 있다 — standalone
      // 모드의 실제 가시 높이를 그대로 반영하기 때문이다.
      outer.style.height = `${h}px`;

      // 실기기 폭에선 프레임을 쓰지 않으므로 축소도, 높이 강제도 안 한다 —
      // PC 프레임 모드의 고정 874px(md:h-[874px])을 이 인라인 스타일이
      // 덮어쓰면 안 되기 때문에 여기서만 지운다.
      if (w < FRAME_BP) {
        el.style.setProperty("--s", "1");
        frame.style.height = `${h}px`;
        return;
      }

      frame.style.removeProperty("height");
      const scale = Math.min(
        1,
        (h - GUTTER) / (DEVICE_H + BEZEL),
        (w - GUTTER) / (DEVICE_W + BEZEL),
      );
      el.style.setProperty("--s", String(scale));
    };

    fit();
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", fit);
    // 스탠드얼론 사파리는 주소창이 없어 resize가 안 나가는 경우가 있다 —
    // visualViewport가 더 안정적으로 신호를 준다
    window.visualViewport?.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", fit);
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <div
      ref={outerRef}
      className="flex h-dvh w-full items-center justify-center overflow-hidden bg-canvas md:bg-cloud"
    >
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
          ref={frameRef}
          className="relative flex h-dvh w-screen flex-col overflow-hidden bg-canvas md:h-[874px] md:w-[402px] md:rounded-[54px] md:shadow-[0_0_0_11px_#111111,0_28px_60px_-12px_rgba(0,0,0,0.4)]"
          style={{ transform: "translateZ(0)" }}
        >
          {/* overflow-x-hidden — 상세 페이지가 오른쪽에서 밀려 들어올 때
              화면 밖 영역이 가로 스크롤로 잡히지 않게 막는다.
              탭바가 흐름에서 빠져 바닥에 고정됐으므로, 그 높이(68px + 하단
              세이프에어리어)만큼 아래 여백을 줘야 마지막 항목이 안 가린다. */}
          <main
            className="rail flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pt-[env(safe-area-inset-top)]"
            style={{
              paddingBottom: hideTabBar
                ? undefined
                : "calc(68px + env(safe-area-inset-bottom))",
            }}
          >
            {children}
          </main>
          {!hideTabBar && <TabBar />}
        </div>
      </div>
    </div>
  );
}
