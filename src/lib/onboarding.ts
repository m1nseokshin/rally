const KEY = "rally-onboarded";

// 지금은 새로고침해도 항상 온보딩부터 보이도록 완료 여부를 무시하고 있다.
// 원래대로(한 번 보면 다시 안 보이게) 되돌리려면 아래 return을 지우고
// 원래 코드(주석 처리된 줄)로 바꾸면 된다.
export function hasCompletedOnboarding() {
  return false;
  // if (typeof window === "undefined") return true; // SSR에선 판단 불가 — 클라이언트에서 다시 확인한다
  // return localStorage.getItem(KEY) === "1";
}

export function markOnboardingComplete() {
  localStorage.setItem(KEY, "1");
}
