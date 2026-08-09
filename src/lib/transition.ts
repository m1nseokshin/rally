// 온보딩 "시작하기"처럼, 다음 페이지 전환만 예외적으로 다른 애니메이션을
// 쓰고 싶을 때 쓰는 1회성 플래그. sessionStorage에 심어두고 PageTransition이
// 다음 마운트에서 한 번 소비한다 — 그 뒤 탭 이동은 다시 기본 page-in으로 돌아간다.
const KEY = "rally-next-transition";

export type TransitionKind = "slide-up";

export function requestTransition(kind: TransitionKind) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, kind);
}

/** 한 번 읽으면 즉시 지운다 — 다음 전환에는 영향을 주지 않는다 */
export function consumeTransition(): TransitionKind | null {
  if (typeof window === "undefined") return null;
  const value = sessionStorage.getItem(KEY);
  if (!value) return null;
  sessionStorage.removeItem(KEY);
  return value as TransitionKind;
}

/**
 * 탭 바의 기본 화면에서 한 단계 "들어가는" 상세 페이지들.
 * 이 경로들은 오른쪽에서 밀려 들어오고, 뒤로 갈 땐 오른쪽으로 빠져나간다.
 */
const DETAIL_ROUTES = ["/profile", "/login"];

export function isDetailRoute(pathname: string) {
  return DETAIL_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

/**
 * 나가는 애니메이션을 위해 PageTransition이 자기 루트 엘리먼트를 등록해 둔다.
 *
 * 리액트는 라우트가 바뀌면 이전 화면을 즉시 언마운트해서, 순수 CSS만으로는
 * "나가는" 애니메이션을 걸 방법이 없다(이미 DOM에서 사라진 뒤라서).
 * 그래서 뒤로가기를 가로채 → 나가는 애니메이션을 먼저 재생 → 끝나면
 * 실제로 router.back()을 부르는 방식으로 처리한다.
 */
let transitionRoot: HTMLElement | null = null;

export function registerTransitionRoot(el: HTMLElement | null) {
  transitionRoot = el;
}

/** 상세 페이지가 오른쪽으로 빠져나가는 애니메이션. 끝나면 resolve된다. */
export function playDetailExit(): Promise<void> {
  const el = transitionRoot;
  if (!el || typeof window === "undefined") return Promise.resolve();

  // 모션을 줄여달라는 사용자에겐 기다리게 하지 않는다
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return Promise.resolve();
  }

  el.classList.remove("detail-in");
  el.classList.add("detail-out");

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.removeEventListener("animationend", finish);
      resolve();
    };
    el.addEventListener("animationend", finish);
    // animationend가 안 오는 경우(탭 백그라운드 등)에도 갇히지 않게 안전장치
    setTimeout(finish, 500);
  });
}
