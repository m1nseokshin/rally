"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "rally-favorites";

// useTheme/useLocale와 같은 useSyncExternalStore 공유 스토어 패턴 — Play 페이지를
// 벗어났다 돌아와도(또는 다른 컴포넌트가 즐겨찾기를 참조해도) 값이 유지되도록
// localStorage에 트랙 id 배열로 저장한다. API 표면은 기존 useState<Set>과 동일하게
// Set으로 노출해 호출부 변경을 최소화한다.
let currentIds: Set<string> = new Set();
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot() {
  return currentIds;
}

function getServerSnapshot(): Set<string> {
  return currentIds;
}

let hydrated = false;
function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const stored = localStorage.getItem(KEY);
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored) as string[];
    if (Array.isArray(parsed) && parsed.length > 0) {
      currentIds = new Set(parsed);
      notify();
    }
  } catch {
    // 손상된 값이면 무시
  }
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(Array.from(currentIds)));
}

function toggleGlobalFavorite(id: string) {
  const next = new Set(currentIds);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  currentIds = next;
  persist();
  notify();
}

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (typeof window !== "undefined" && !hydrated) {
    queueMicrotask(hydrateOnce);
  }

  const toggleFavorite = useCallback((id: string) => toggleGlobalFavorite(id), []);

  return { favorites, toggleFavorite };
}
