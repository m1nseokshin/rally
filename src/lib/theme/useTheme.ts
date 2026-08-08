"use client";

import { useEffect, useCallback, useSyncExternalStore } from "react";

export type ThemeSetting = "light" | "dark" | "system";

const KEY = "rally-theme";

/**
 * 모듈 스코프 공유 스토어 — useLocale과 같은 이유. ProfileMenu 드롭다운과
 * 설정 페이지가 동시에 떠 있을 때, 한쪽에서 테마를 바꾸면 실제 화면
 * (data-theme 속성)은 바로 바뀌지만 다른 쪽 세그먼트 버튼의 "선택됨"
 * 표시는 컴포넌트별 useState라 안 따라오는 문제가 있었다.
 */
let currentSetting: ThemeSetting = "system";
const listeners = new Set<() => void>();

function resolve(setting: ThemeSetting): "light" | "dark" {
  if (setting !== "system") return setting;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function apply(setting: ThemeSetting) {
  document.documentElement.setAttribute("data-theme", resolve(setting));
}

function notify() {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot() {
  return currentSetting;
}

function getServerSnapshot(): ThemeSetting {
  return "system";
}

let hydrated = false;
function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const stored = localStorage.getItem(KEY) as ThemeSetting | null;
  if (stored && stored !== currentSetting) {
    currentSetting = stored;
    notify();
  }
}

function setGlobalTheme(next: ThemeSetting) {
  currentSetting = next;
  localStorage.setItem(KEY, next);
  apply(next);
  notify();
}

/**
 * 라이트/다크/시스템 3단 토글. layout.tsx의 인라인 스크립트가 첫 페인트
 * 전에 이미 data-theme을 정해두므로, 여기서는 설정값만 상태로 들고 있다가
 * 변경 시 반영한다 — 초기 렌더에서 깜빡임(FOUC)이 없다.
 */
export function useTheme() {
  const setting = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (typeof window !== "undefined" && !hydrated) {
    queueMicrotask(hydrateOnce);
  }

  // 시스템 설정을 따르는 중엔 OS 다크모드 전환에도 실시간 반응
  useEffect(() => {
    if (setting !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [setting]);

  const setTheme = useCallback((next: ThemeSetting) => setGlobalTheme(next), []);

  return { setting, setTheme };
}
