"use client";

import { useCallback, useSyncExternalStore } from "react";
import { todaySessions, type SessionLog } from "@/lib/data";

const KEY = "rally-sessions";

// useTheme/useLocale/useProfileName과 같은 useSyncExternalStore 공유 스토어 패턴.
// 랠리 게임 결과(/rally)가 여기 addSession으로 쌓이고, 홈/인사이트가 같은
// 스토어를 구독해 즉시 반영된다 — 컴포넌트별 useState면 랠리에서 저장해도
// 다른 탭으로 돌아왔을 때 보이지 않는다.
let currentSessions: SessionLog[] = todaySessions;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot() {
  return currentSessions;
}

function getServerSnapshot(): SessionLog[] {
  return todaySessions;
}

let hydrated = false;
function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const stored = localStorage.getItem(KEY);
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored) as SessionLog[];
    if (Array.isArray(parsed)) {
      currentSessions = parsed;
      notify();
    }
  } catch {
    // 손상된 값이면 무시하고 기본 목업을 유지한다
  }
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(currentSessions));
}

function addGlobalSession(entry: Omit<SessionLog, "id">) {
  const session: SessionLog = { ...entry, id: `s-${Date.now()}` };
  // 최신 세션이 위로 오도록 앞에 붙인다
  currentSessions = [session, ...currentSessions];
  persist();
  notify();
}

export function useSessionLog() {
  const sessions = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (typeof window !== "undefined" && !hydrated) {
    queueMicrotask(hydrateOnce);
  }

  const addSession = useCallback((entry: Omit<SessionLog, "id">) => addGlobalSession(entry), []);

  return { sessions, addSession };
}
