"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { consumeTransition } from "@/lib/transition";

/**
 * 탭을 이동할 때마다 살짝 떠오르며 들어오는 전환 효과.
 * pathname을 key로 써서 라우트가 바뀔 때마다 이 div를 새로 마운트시키고,
 * 그 마운트 순간에 CSS 애니메이션(page-in)이 재생되게 한다 —
 * 별도 애니메이션 라이브러리 없이 React의 key 리마운트만으로 구현.
 *
 * 온보딩 "시작하기"처럼 특정 전환만 다르게 연출하고 싶을 때는
 * lib/transition.ts의 requestTransition()으로 1회성 플래그를 심어두면
 * 이 컴포넌트가 다음 마운트에서 그 값을 소비해 다른 클래스를 쓴다.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // PageTransition 자체는 라우트가 바뀌어도 리마운트되지 않는다(리마운트되는
  // 건 아래 키를 가진 div뿐) — 그래서 이 컴포넌트 인스턴스 안에서 pathname이
  // "바뀐 순간"에만 플래그를 소비해야 한다. useMemo를 pathname에 의존시키면
  // 같은 pathname으로 일어나는 다른 리렌더에서는 다시 호출되지 않는다.
  // consumeTransition()은 pathname을 읽지 않지만, "바뀐 시점에만 1회 소비"가 목적이라 의도적으로 의존성에 넣는다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const kind = useMemo(() => consumeTransition(), [pathname]);
  const className = kind === "slide-up" ? "slide-up-in" : "page-in";

  const rootRef = useRef<HTMLDivElement>(null);
  // PhoneFrame의 <main>은 라우트가 바뀌어도 리마운트되지 않아 이전 페이지의
  // 스크롤 위치를 그대로 들고 있다 — 새 페이지가 더 짧으면 화면이 스크롤된
  // 채로 시작해 콘텐츠가 뷰포트 밖으로 밀려 "빈 화면"처럼 보이는 버그가 났다.
  // 페이지가 새로 마운트될 때마다 스크롤 컨테이너를 맨 위로 되돌린다.
  useLayoutEffect(() => {
    rootRef.current?.closest(".overflow-y-auto")?.scrollTo({ top: 0 });
  }, []);

  return (
    <div key={pathname} ref={rootRef} className={className}>
      {children}
    </div>
  );
}
