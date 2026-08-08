const KEY = "rally-onboarded";

export function hasCompletedOnboarding() {
  if (typeof window === "undefined") return true; // SSR에선 판단 불가 — 클라이언트에서 다시 확인한다
  return localStorage.getItem(KEY) === "1";
}

export function markOnboardingComplete() {
  localStorage.setItem(KEY, "1");
}
