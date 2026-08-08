"use client";

import { useCallback, useSyncExternalStore } from "react";

export type NotificationPref = "all" | "summary" | "off";

const DIFFICULTY_KEY = "rally-pref-difficulty";
const NOTIFICATION_KEY = "rally-pref-notification";

// useTheme/useLocale와 같은 useSyncExternalStore 공유 스토어 패턴 — 설정 화면의
// "기본 난이도"/"알림" 액션시트에서 고른 값을 저장한다.
let currentDifficulty = 3;
let currentNotification: NotificationPref = "summary";
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getDifficultySnapshot() {
  return currentDifficulty;
}
function getNotificationSnapshot() {
  return currentNotification;
}
function getServerDifficulty() {
  return 3;
}
function getServerNotification(): NotificationPref {
  return "summary";
}

let hydrated = false;
function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const d = localStorage.getItem(DIFFICULTY_KEY);
  const n = localStorage.getItem(NOTIFICATION_KEY);
  let changed = false;
  if (d) {
    const parsed = Number(d);
    if (parsed >= 1 && parsed <= 5) {
      currentDifficulty = parsed;
      changed = true;
    }
  }
  if (n === "all" || n === "summary" || n === "off") {
    currentNotification = n;
    changed = true;
  }
  if (changed) notify();
}

function setGlobalDifficulty(next: number) {
  currentDifficulty = next;
  localStorage.setItem(DIFFICULTY_KEY, String(next));
  notify();
}

function setGlobalNotification(next: NotificationPref) {
  currentNotification = next;
  localStorage.setItem(NOTIFICATION_KEY, next);
  notify();
}

export function useSessionPrefs() {
  const difficulty = useSyncExternalStore(subscribe, getDifficultySnapshot, getServerDifficulty);
  const notification = useSyncExternalStore(
    subscribe,
    getNotificationSnapshot,
    getServerNotification,
  );

  if (typeof window !== "undefined" && !hydrated) {
    queueMicrotask(hydrateOnce);
  }

  const setDifficulty = useCallback((n: number) => setGlobalDifficulty(n), []);
  const setNotification = useCallback((n: NotificationPref) => setGlobalNotification(n), []);

  return { difficulty, notification, setDifficulty, setNotification };
}
