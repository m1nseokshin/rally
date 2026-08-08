"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "rally-profile-avatar";

// useProfileName과 같은 useSyncExternalStore 공유 스토어 패턴 — 프로필 페이지에서
// 등록한 사진이 ProfileMenu의 홈 아바타에도 즉시 반영되게 한다.
// data URL 그대로 localStorage에 저장한다(백엔드가 없으니 업로드 대신 이 방식).
let currentAvatar: string | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot() {
  return currentAvatar;
}

function getServerSnapshot(): string | null {
  return null;
}

let hydrated = false;
function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const stored = localStorage.getItem(KEY);
  if (stored && stored !== currentAvatar) {
    currentAvatar = stored;
    notify();
  }
}

function setGlobalAvatar(dataUrl: string | null) {
  currentAvatar = dataUrl;
  if (dataUrl) {
    try {
      localStorage.setItem(KEY, dataUrl);
    } catch {
      // localStorage 용량 초과(큰 이미지) — 메모리 값만 유지하고 조용히 넘어간다
    }
  } else {
    localStorage.removeItem(KEY);
  }
  notify();
}

export function useProfileAvatar() {
  const avatar = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (typeof window !== "undefined" && !hydrated) {
    queueMicrotask(hydrateOnce);
  }

  const setAvatar = useCallback((dataUrl: string | null) => setGlobalAvatar(dataUrl), []);

  return { avatar, setAvatar };
}
