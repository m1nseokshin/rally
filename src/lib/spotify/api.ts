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
  album: { images: { url: string }[]; release_date?: string };
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
    // release_date는 "2024", "2024-03", "2024-03-15" 중 아무 형태나 온다 —
    // 앞 4자리만 쓰면 셋 다 안전하게 처리된다
    year: t.album.release_date
      ? Number(t.album.release_date.slice(0, 4)) || undefined
      : undefined,
  };
}

export type TopRange = "short_term" | "medium_term" | "long_term";

export async function fetchTopTracks(
  limit = 50,
  range: TopRange = "short_term",
): Promise<Track[]> {
  const data = await spotifyFetch(`/me/top/tracks?limit=${limit}&time_range=${range}`);
  const items: SpotifyApiTrack[] = data.items ?? [];
  if (items.length === 0) {
    // 최근 청취 이력이 없으면 저장한 곡으로 폴백
    return fetchSavedTracks(limit);
  }
  return items.map(toTrack);
}

/** 라이브러리에 저장(하트)한 곡 */
export async function fetchSavedTracks(limit = 50): Promise<Track[]> {
  const data = await spotifyFetch(`/me/tracks?limit=${limit}`);
  return (data.items ?? []).map((it: { track: SpotifyApiTrack }) => toTrack(it.track));
}

/**
 * id 목록으로 곡 정보를 한 번에 받아온다 — 즐겨찾기 구버전(id만 저장) 복구용.
 * 한 요청에 50개가 상한이라 그 이상은 잘라 보낸다.
 */
export async function fetchTracksByIds(ids: string[]): Promise<Track[]> {
  if (ids.length === 0) return [];
  const data = await spotifyFetch(`/tracks?ids=${ids.slice(0, 50).join(",")}`);
  return ((data.tracks ?? []) as (SpotifyApiTrack | null)[])
    .filter((t): t is SpotifyApiTrack => t !== null)
    .map(toTrack);
}

/** 최근 재생한 곡 — 같은 곡이 여러 번 들어오므로 id로 중복을 제거한다 */
export async function fetchRecentTracks(limit = 50): Promise<Track[]> {
  const data = await spotifyFetch(`/me/player/recently-played?limit=${limit}`);
  const seen = new Set<string>();
  const out: Track[] = [];
  for (const it of (data.items ?? []) as { track: SpotifyApiTrack }[]) {
    if (!it.track || seen.has(it.track.id)) continue;
    seen.add(it.track.id);
    out.push(toTrack(it.track));
  }
  return out;
}

/**
 * Spotify 검색 한 페이지 최대치.
 *
 * 문서상으로는 50인데 이 앱 등급에서는 **11 이상이면 `Invalid limit` 400**이
 * 떨어진다(/me/top/tracks 같은 다른 엔드포인트는 50이 그대로 통한다).
 * 그래서 검색만 따로 10으로 묶고, 모자란 만큼은 offset을 밀어 여러 페이지를
 * 받아 채운다.
 */
export const SEARCH_PAGE_MAX = 10;

/** 검색 한 번에 채우려는 곡 수 — 페이지를 몇 장 받을지가 여기서 정해진다 */
const SEARCH_TARGET = 50;

/**
 * 곡 검색.
 *
 * 한 페이지가 10곡뿐이라 목표 수를 채우려면 여러 장을 받아야 한다. 페이지는
 * offset이 미리 정해져 있으니 순차로 기다릴 이유가 없어 병렬로 던진다
 * (5개 정도는 레이트 리밋에 걸리지 않는다 — 예전에 곡마다 audio-features를
 * 부르다 429를 맞은 것과는 규모가 다르다).
 *
 * 같은 곡이 페이지 경계에서 겹쳐 오는 경우가 있어 id로 중복을 제거한다.
 */
export async function searchTracks(
  query: string,
  limit = SEARCH_TARGET,
  offset = 0,
): Promise<Track[]> {
  const q = query.trim();
  if (!q) return [];

  const pages = Math.max(1, Math.ceil(limit / SEARCH_PAGE_MAX));
  const encoded = encodeURIComponent(q);

  const results = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      spotifyFetch(
        `/search?type=track&limit=${SEARCH_PAGE_MAX}&offset=${
          offset + i * SEARCH_PAGE_MAX
        }&q=${encoded}`,
      ).catch(() => null),
    ),
  );

  // 한 장도 못 받았으면 인증 문제일 수 있으니 조용히 빈 목록으로 넘기지 않는다
  if (results.every((r) => r === null)) {
    throw new Error("Spotify 검색에 실패했어요.");
  }

  const seen = new Set<string>();
  const out: Track[] = [];
  for (const data of results) {
    const items: SpotifyApiTrack[] = data?.tracks?.items ?? [];
    for (const it of items) {
      if (!it || seen.has(it.id)) continue;
      seen.add(it.id);
      out.push(toTrack(it));
    }
  }

  // offset이 결과 범위를 넘어서면 아무것도 안 온다 — 그땐 처음부터 다시 받아
  // "다른 곡 보기를 눌렀더니 목록이 사라졌다"는 상황을 막는다.
  if (out.length === 0 && offset > 0) {
    return searchTracks(query, limit, 0);
  }
  return out;
}
