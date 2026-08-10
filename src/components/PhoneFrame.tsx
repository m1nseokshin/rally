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

      // 실기기 폭에선 프레임을 쓰지 않으므로 축소하지 않는다. 높이는 여기서
      // 강제하지 않는다 — h-full(퍼센트) 체인이 담당한다(아래 설명).
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
    window.addEventListener("orientationchange", fit);
    window.visualViewport?.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", fit);
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, []);

  return (
    // 높이를 dvh나 window.innerHeight로 재지 않는다 — iOS 26부터 Safari가
    // 툴바를 "떠 있는" 방식으로 그리면서, 스탠드얼론(홈 화면 추가) 상태에서도
    // 그 둘 다 실제 화면보다 짧게 보고하는 경우가 보고되고 있다(둘 다 같은
    // 내부 측정치에 기대는 값이라 같이 틀린다). 이 div가 짧아지면 바깥의
    // items-center가 그 부족분을 위아래로 반씩 나눠 빈 여백을 만든다 —
    // 위/아래에 대칭으로 잘리는 게 정확히 그 증상이다.
    // 대신 html,body의 height:100%를 그대로 물려받는 퍼센트 체인을 쓴다.
    // 이건 브라우저가 실제로 박스를 배치할 때 쓰는 핵심 레이아웃 경로라,
    // 저 새로 생긴 버그가 낀 리포팅 API(dvh 단위·innerHeight 프로퍼티)를
    // 아예 거치지 않는다.
    <div className="flex h-full w-full items-center justify-center overflow-hidden bg-canvas md:bg-cloud">
      <div
        ref={scalerRef}
        // h-full — items-center가 교차축 stretch를 꺼버려서, 이 div가 퍼센트
        // 높이를 안 받으면 안쪽 frame/main의 h-full·flex-1이 전부 "auto"로
        // 풀려 콘텐츠 높이만큼 끝없이 늘어난다(실측: 1537px). 여기서 한 번
        // 더 이어줘야 퍼센트 체인이 frame까지 안전하게 내려간다.
        className="h-full origin-center"
        style={{ transform: "scale(var(--s, 1))" }}
      >
        {/*
          transform을 걸어 이 div가 position:fixed 자식들의 컨테이닝 블록이 되게 한다.
          이게 없으면 바텀시트(fixed inset-0)의 기준이 바깥 scaler가 돼서,
          프레임의 overflow-hidden과 둥근 모서리를 무시하고 폰 화면 밖으로
          삐져나온다. translateZ(0)은 렌더링 결과를 바꾸지 않으면서
          컨테이닝 블록만 만들어 주는 표준 수법이다. 덤으로 이 프레임 안의
          바텀시트(fixed inset-0)는 진짜 뷰포트가 아니라 이 컨테이너에 대해
          고정되므로, iOS 26의 "떠 있는 툴바 아래로 fixed 요소가 못 내려간다"
          버그도 원천적으로 비껴간다 — 애초에 브라우저 뷰포트 기준 fixed가
          아니기 때문이다.
        */}
        <div
          className="relative flex h-full w-screen flex-col overflow-hidden bg-canvas md:h-[874px] md:w-[402px] md:rounded-[54px] md:shadow-[0_0_0_11px_#111111,0_28px_60px_-12px_rgba(0,0,0,0.4)]"
          style={{ transform: "translateZ(0)" }}
        >
          {/* overflow-x-hidden — 상세 페이지가 오른쪽에서 밀려 들어올 때
              화면 밖 영역이 가로 스크롤로 잡히지 않게 막는다.
              탭바가 흐름에서 빠져 바닥에 고정됐으므로, 그 전체 높이
              (아이콘 줄 68px + 홈 인디케이터용 여백 20px, TabBar.tsx 참고)
              만큼 아래 여백을 줘야 마지막 항목이 안 가린다. */}
          <main
            className="rail flex-1 overflow-y-auto overflow-x-hidden overscroll-contain"
            style={{ paddingBottom: hideTabBar ? undefined : "88px" }}
          >
            {children}
          </main>
          {!hideTabBar && <TabBar />}
        </div>
      </div>
    </div>
  );
}
