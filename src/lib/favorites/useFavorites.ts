"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Track } from "@/lib/data";

const KEY = "rally-favorites";

/**
 * 즐겨찾기 — useTheme/useLocale와 같은 useSyncExternalStore 공유 스토어.
 *
 * 곡 정보를 통째로 저장한다. 예전엔 id만 저장했는데, 그러면 "즐겨찾기 목록"을
 * 그릴 때 제목·아티스트·앨범아트가 없어서 매번 Spotify에 다시 물어봐야 하고
 * 오프라인이면 아예 못 본다. 하트를 누르는 시점엔 이미 곡 정보를 들고 있으니
 * 그대로 저장하는 게 맞다.
 *
 * 구버전(문자열 배열)으로 저장된 값도 버리지 않는다 — legacyIds로 남겨두고
 * 호출부가 Spotify에서 메타데이터를 받아와 adopt()로 채워 넣는다.
 */
type Stored = Track[] | string[];

let currentTracks: Track[] = [];
let currentIds: Set<string> = new Set();
let legacyIds: string[] = [];
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

// useSyncExternalStore는 스냅샷이 참조로 안정적이어야 한다 — 매번 새 배열/Set을
// 만들면 무한 렌더에 빠진다. 그래서 변경이 있을 때만 새 참조로 교체한다.
function getTracks() {
  return currentTracks;
}
function getIds() {
  return currentIds;
}
function getLegacy() {
  return legacyIds;
}

let hydrated = false;
function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const raw = localStorage.getItem(KEY);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Stored;
    if (!Array.isArray(parsed) || parsed.length === 0) return;

    if (typeof parsed[0] === "string") {
      // 구버전 — id만 있다. 하트 표시는 바로 되게 하고, 메타데이터는 나중에 채운다.
      legacyIds = parsed as string[];
      currentIds = new Set(legacyIds);
    } else {
      currentTracks = parsed as Track[];
      currentIds = new Set(currentTracks.map((t) => t.id));
    }
    notify();
  } catch {
    // 손상된 값이면 무시
  }
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(currentTracks));
}

function toggle(track: Track) {
  if (currentIds.has(track.id)) {
    currentTracks = currentTracks.filter((t) => t.id !== track.id);
    legacyIds = legacyIds.filter((id) => id !== track.id);
  } else {
    // 최근에 추가한 게 위로
    currentTracks = [track, ...currentTracks];
  }
  currentIds = new Set(currentTracks.map((t) => t.id));
  // 구버전 id 중 아직 메타데이터를 못 채운 것도 하트는 계속 켜져 있어야 한다
  for (const id of legacyIds) currentIds.add(id);
  persist();
  notify();
}

/** 구버전 id에 해당하는 곡 정보를 받아와 채워 넣는다 */
function adopt(tracks: Track[]) {
  if (tracks.length === 0) return;
  const have = new Set(currentTracks.map((t) => t.id));
  currentTracks = [...currentTracks, ...tracks.filter((t) => !have.has(t.id))];
  legacyIds = [];
  currentIds = new Set(currentTracks.map((t) => t.id));
  persist();
  notify();
}

export function useFavorites() {
  const tracks = useSyncExternalStore(subscribe, getTracks, getTracks);
  const favorites = useSyncExternalStore(subscribe, getIds, getIds);
  const pendingIds = useSyncExternalStore(subscribe, getLegacy, getLegacy);

  if (typeof window !== "undefined" && !hydrated) {
    queueMicrotask(hydrateOnce);
  }

  return {
    /** 하트 표시용 id 집합 */
    favorites,
    /** 즐겨찾기 목록 — 최근 추가 순 */
    tracks,
    /** 아직 메타데이터를 못 채운 구버전 id */
    pendingIds,
    toggleFavorite: useCallback((track: Track) => toggle(track), []),
    adoptTracks: useCallback((list: Track[]) => adopt(list), []),
  };
}
