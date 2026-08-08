"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "rally-profile-name";

// useTheme/useLocale와 같은 이유로 useSyncExternalStore 기반 공유 스토어를 쓴다 —
// 컴포넌트별 useState면 프로필 페이지에서 이름을 바꿔도 ProfileMenu 아바타
// 옆 이름 표시가 따라오지 않는다.
let currentName: string | null = null; // null = 아직 커스텀 이름 없음(기본값 사용)
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot() {
  return currentName;
}

function getServerSnapshot(): string | null {
  return null;
}

let hydrated = false;
function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const stored = localStorage.getItem(KEY);
  if (stored && stored !== currentName) {
    currentName = stored;
    notify();
  }
}

function setGlobalName(next: string) {
  const trimmed = next.trim();
  currentName = trimmed || null;
  if (trimmed) localStorage.setItem(KEY, trimmed);
  else localStorage.removeItem(KEY);
  notify();
}

/** 커스텀 이름이 없으면 null — 호출부가 언어별 기본 이름으로 폴백한다 */
export function useProfileName() {
  const name = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (typeof window !== "undefined" && !hydrated) {
    queueMicrotask(hydrateOnce);
  }

  const setName = useCallback((next: string) => setGlobalName(next), []);

  return { name, setName };
}
