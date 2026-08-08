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
