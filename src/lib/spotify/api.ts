"use client";

import type { Track } from "@/lib/data";
import { getValidAccessToken } from "./auth";

const API = "https://api.spotify.com/v1";

export class SpotifyAuthError extends Error {}

async function spotifyFetch(path: string) {
  const token = await getValidAccessToken();
  if (!token) throw new SpotifyAuthError("Spotify 연동이 필요해요.");

  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) throw new SpotifyAuthError("인증이 만료됐어요. 다시 연동해주세요.");
  if (!res.ok) throw new Error(`Spotify API 오류: ${res.status}`);
  return res.json();
}

export type SpotifyProfile = {
  id: string;
  displayName: string;
  email?: string;
  image?: string;
};

export async function fetchSpotifyProfile(): Promise<SpotifyProfile> {
  const me = await spotifyFetch("/me");
  return {
    id: me.id,
    displayName: me.display_name ?? me.id,
    email: me.email,
    image: me.images?.[0]?.url,
  };
}

type SpotifyApiTrack = {
  id: string;
  name: string;
  duration_ms: number;
  artists: { name: string }[];
  album: { images: { url: string }[] };
  preview_url: string | null;
};

/**
 * 결정적 시드 기반 의사난수 — 트랙 id로 매번 같은 결과를 재현한다.
 * 실제 비트 타임스탬프(Spotify Audio Analysis)는 신규 앱에 더 이상
 * 발급되지 않아, tempo/energy로부터 시각화용 포인트를 근사 생성한다.
 */
function seededPoints(seed: string, count: number) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const points: number[] = [];
  for (let i = 0; i < count; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    const jitter = (h % 1000) / 1000 / (count * 1.5);
    points.push(Math.min(0.97, (i + 0.5) / count + jitter - 1 / (count * 3)));
  }
  return points.sort((a, b) => a - b);
}

/** 트랙 id를 안정적인 32bit 해시로 — 같은 곡이면 언제나 같은 값이 나온다 */
function hashId(seed: string) {
  let h = 2166136261 >>> 0;
  for (const ch of seed) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

/**
 * 곡마다 다른 템포를 만들어 낸다.
 *
 * 중요: 이건 실제 분석값이 아니라 **추정치**다. Spotify가 2024년 11월부터
 * 신규 앱에 /audio-features(실제 BPM)를 403으로 막아서 진짜 템포를 받을
 * 방법이 없다. 그렇다고 전부 110 BPM으로 고정하면 어떤 곡을 골라도 똑같은
 * 게임이 되니, 곡 id에서 결정적으로 뽑아 88~168 사이 값을 준다 —
 * 같은 곡은 항상 같은 템포이고, 곡마다는 확실히 다르다.
 * UI에서도 "추정"이라고 분명히 표시한다.
 */
function estimateTempo(id: string) {
  return 88 + (hashId(id) % 81); // 88~168
}

function difficultyFrom(tempo: number) {
  // 88 → 1, 168 → 5
  return Math.min(5, Math.max(1, Math.round((tempo - 78) / 20)));
}

/**
 * Spotify 트랙 → 우리 Track 형태로 변환. **네트워크 호출이 없다.**
 *
 * 예전엔 곡마다 /audio-features를 한 번씩 더 불렀는데, 그 엔드포인트가
 * 신규 앱엔 403이라 검색 한 번에 15개의 실패 요청이 나갔다. 그 15배 트래픽이
 * Spotify 레이트 리밋(429)을 때려서 정작 /search까지 같이 죽는 게
 * "검색 결과가 안 뜨는" 진짜 원인이었다. 호출을 아예 없앴다.
 */
function toTrack(t: SpotifyApiTrack): Track {
  const bpm = estimateTempo(t.id);
  const difficulty = difficultyFrom(bpm);
  return {
    id: t.id,
    title: t.name,
    artist: t.artists.map((a) => a.name).join(", "),
    provider: "spotify",
    duration: Math.round(t.duration_ms / 1000),
    bpm,
    // 실제 오디오 분석이 아니라 추정 — UI가 이 값으로 문구를 가른다
    analyzed: false,
    difficulty,
    hits: seededPoints(t.id, 6 + difficulty * 2),
    cover: ["#f24822", "#ffb199"],
    image: t.album.images[0]?.url,
    previewUrl: t.preview_url ?? undefined,
  };
}

export async function fetchTopTracks(limit = 20): Promise<Track[]> {
  const data = await spotifyFetch(`/me/top/tracks?limit=${limit}&time_range=short_term`);
  const items: SpotifyApiTrack[] = data.items ?? [];
  if (items.length === 0) {
    // 최근 청취 이력이 없으면 저장한 곡으로 폴백
    const saved = await spotifyFetch(`/me/tracks?limit=${limit}`);
    return (saved.items ?? []).map((it: { track: SpotifyApiTrack }) => toTrack(it.track));
  }
  return items.map(toTrack);
}

/** 곡 제목/아티스트로 검색해 직접 지정할 수 있게 한다 — 요청 한 번이면 끝난다 */
export async function searchTracks(query: string, limit = 20): Promise<Track[]> {
  const q = query.trim();
  if (!q) return [];
  const data = await spotifyFetch(`/search?type=track&limit=${limit}&q=${encodeURIComponent(q)}`);
  const items: SpotifyApiTrack[] = data.tracks?.items ?? [];
  return items.map(toTrack);
}
