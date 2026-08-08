const KEY = "rally-onboarded";

// 지금은 "새로고침하면 항상 온보딩부터" 보이게 하는 테스트 모드라 localStorage는
// 무시한다. 대신 완료 여부를 모듈 스코프 변수(=이 탭의 현재 페이지 로드 동안만
// 유지)에 기억해둔다 — 그래야 온보딩을 막 끝내고 홈으로 넘어간 직후에
// OnboardingGate가 다시 온보딩으로 돌려보내는 루프에 걸리지 않는다.
// 진짜 새로고침을 하면 이 변수도 초기화되니 요청대로 다시 온보딩부터 보인다.
// 원래대로(한 번 보면 브라우저를 꺼도 다시 안 보이게) 되돌리려면
// hasCompletedOnboarding을 아래 주석 처리된 localStorage 버전으로 바꾸면 된다.
let completedThisLoad = false;

export function hasCompletedOnboarding() {
  return completedThisLoad;
  // if (typeof window === "undefined") return true; // SSR에선 판단 불가 — 클라이언트에서 다시 확인한다
  // return localStorage.getItem(KEY) === "1";
}

export function markOnboardingComplete() {
  completedThisLoad = true;
  localStorage.setItem(KEY, "1");
}
