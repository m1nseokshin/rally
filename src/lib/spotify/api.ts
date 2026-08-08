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

function difficultyFrom(tempo: number, energy: number) {
  const score = tempo / 40 + energy * 2.2;
  return Math.min(5, Math.max(1, Math.round(score)));
}

/**
 * 오디오 특성(BPM 등)까지 붙여 우리 Track 형태로 변환.
 * /audio-features는 2024년 11월 이후 신규 앱엔 403으로 막혀 있을 수 있어
 * 실패해도 트랙 자체는 보여주고 "분석 대기 중" 상태로 표시한다.
 */
async function toTrack(t: SpotifyApiTrack): Promise<Track> {
  const base: Track = {
    id: t.id,
    title: t.name,
    artist: t.artists.map((a) => a.name).join(", "),
    provider: "spotify",
    duration: Math.round(t.duration_ms / 1000),
    bpm: 0,
    analyzed: false,
    difficulty: 0,
    hits: [],
    cover: ["#f24822", "#ffb199"],
    image: t.album.images[0]?.url,
    previewUrl: t.preview_url ?? undefined,
  };

  try {
    const features = await spotifyFetch(`/audio-features/${t.id}`);
    const tempo = Math.round(features.tempo);
    const difficulty = difficultyFrom(tempo, features.energy ?? 0.5);
    return {
      ...base,
      bpm: tempo,
      analyzed: true,
      difficulty,
      hits: seededPoints(t.id, 6 + difficulty * 2),
    };
  } catch {
    // audio-features 접근 불가 — 목록엔 노출하되 분석은 대기 상태로 둔다
    return base;
  }
}

export async function fetchTopTracks(limit = 20): Promise<Track[]> {
  const data = await spotifyFetch(`/me/top/tracks?limit=${limit}&time_range=short_term`);
  const items: SpotifyApiTrack[] = data.items;
  if (items.length === 0) {
    // 최근 청취 이력이 없으면 저장한 곡으로 폴백
    const saved = await spotifyFetch(`/me/tracks?limit=${limit}`);
    return Promise.all(
      saved.items.map((it: { track: SpotifyApiTrack }) => toTrack(it.track)),
    );
  }
  return Promise.all(items.map(toTrack));
}

/** 곡 제목/아티스트로 검색해 직접 지정할 수 있게 한다 */
export async function searchTracks(query: string, limit = 15): Promise<Track[]> {
  const q = query.trim();
  if (!q) return [];
  const data = await spotifyFetch(`/search?type=track&limit=${limit}&q=${encodeURIComponent(q)}`);
  const items: SpotifyApiTrack[] = data.tracks?.items ?? [];
  return Promise.all(items.map(toTrack));
}
