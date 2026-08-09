"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import { consumeTransition, isDetailRoute, registerTransitionRoot } from "@/lib/transition";

/**
 * 화면 전환. pathname을 key로 써서 라우트가 바뀔 때마다 이 div를 새로
 * 마운트시키고, 그 마운트 순간에 CSS 애니메이션이 재생되게 한다 —
 * 별도 애니메이션 라이브러리 없이 React의 key 리마운트만으로 구현.
 *
 * 방향 규칙:
 *  - 탭 바의 기본 화면끼리 이동 → page-in (그냥 스윽 떠오른다)
 *  - 상세 페이지(프로필·로그인 등) → detail-in (오른쪽에서 밀려 들어온다)
 *  - 온보딩 "시작하기" → slide-up (아래에서 올라온다, 1회성 플래그)
 *
 * 나가는 애니메이션은 여기서 못 한다 — 라우트가 바뀌면 이전 화면이 즉시
 * 언마운트되기 때문이다. 그래서 뒤로가기 쪽(useDetailBack)에서 먼저
 * 애니메이션을 재생하고 그다음 라우터를 되돌린다.
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // PageTransition 자체는 라우트가 바뀌어도 리마운트되지 않는다(리마운트되는
  // 건 아래 키를 가진 div뿐) — 그래서 이 컴포넌트 인스턴스 안에서 pathname이
  // "바뀐 순간"에만 플래그를 소비해야 한다.
  // consumeTransition()은 pathname을 읽지 않지만, "바뀐 시점에만 1회 소비"가 목적이라 의도적으로 의존성에 넣는다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const kind = useMemo(() => consumeTransition(), [pathname]);

  // page-stagger — 어느 화면이든 최상단 섹션부터 차례로 뜨게 하는 공통 처리
  const className =
    (kind === "slide-up"
      ? "slide-up-in"
      : isDetailRoute(pathname)
        ? "detail-in"
        : "page-in") + " page-stagger";

  const rootRef = useRef<HTMLDivElement>(null);

  // 나가는 애니메이션을 걸 대상을 전역에 등록해 둔다(useDetailBack이 쓴다)
  useLayoutEffect(() => {
    registerTransitionRoot(rootRef.current);
    return () => registerTransitionRoot(null);
  }, [pathname]);

  // PhoneFrame의 <main>은 라우트가 바뀌어도 리마운트되지 않아 이전 페이지의
  // 스크롤 위치를 그대로 들고 있다 — 새 페이지가 더 짧으면 화면이 스크롤된
  // 채로 시작해 콘텐츠가 뷰포트 밖으로 밀려 "빈 화면"처럼 보이는 버그가 났다.
  // behavior: "instant" — 컨테이너에 scroll-behavior: smooth가 걸려 있어서
  // 그냥 두면 새 페이지가 들어오는 동안 스크롤이 위로 기어올라가는 게 같이 보인다.
  useLayoutEffect(() => {
    rootRef.current
      ?.closest(".overflow-y-auto")
      ?.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);

  return (
    <div key={pathname} ref={rootRef} className={className}>
      {children}
    </div>
  );
}
