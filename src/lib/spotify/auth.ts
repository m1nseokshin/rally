"use client";

import { generateCodeChallenge, generateCodeVerifier } from "./pkce";
import { BASE_PATH } from "@/lib/basePath";

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID ?? "";
const TOKEN_KEY = "rally_spotify_token";
const VERIFIER_KEY = "rally_spotify_verifier";

// 곡 목록 조회 + 브라우저 내 재생(streaming, Premium 계정 한정).
// streaming/user-read-email/user-read-private 세 개는 Spotify Web Playback SDK
// 공식 문서가 요구하는 필수 조합 — 하나라도 빠지면 SDK가 authentication_error를 던진다.
const SCOPES = [
  "user-top-read",
  "user-library-read",
  "user-read-email",
  "user-read-private",
  "streaming",
  "user-read-playback-state",
  "user-modify-playback-state",
].join(" ");

export type SpotifyToken = {
  access_token: string;
  refresh_token: string;
  /** epoch ms */
  expires_at: number;
  /** 발급 당시 승인된 권한 — 공백 구분. streaming 권한 추가 전에 로그인한
   *  토큰은 이 값이 없거나 streaming이 빠져 있어, 재생 시도 전에 걸러낼 수 있다. */
  scope?: string;
};

function redirectUri() {
  // 등록된 리다이렉트 URI와 정확히 일치해야 한다.
  // Spotify는 2025년부터 http://localhost 대신 http://127.0.0.1을 요구한다.
  // BASE_PATH — GitHub Pages(/rally 서브패스)에선 origin만으론 실제 콜백
  // 페이지 경로가 안 나온다(콜백 페이지 자체가 /rally/callback/spotify에 있다).
  return `${window.location.origin}${BASE_PATH}/callback/spotify`;
}

export function getStoredToken(): SpotifyToken | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(TOKEN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SpotifyToken;
  } catch {
    return null;
  }
}

function storeToken(token: SpotifyToken) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

/** 로그인 시작 — Spotify 인증 페이지로 리다이렉트 */
export async function loginWithSpotify() {
  if (!CLIENT_ID) {
    throw new Error(
      "NEXT_PUBLIC_SPOTIFY_CLIENT_ID가 설정되지 않았어요. .env.local을 확인하세요.",
    );
  }
  const verifier = generateCodeVerifier();
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  const challenge = await generateCodeChallenge(verifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: redirectUri(),
    scope: SCOPES,
    code_challenge_method: "S256",
    code_challenge: challenge,
  });

  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

/** 콜백 페이지에서 code를 access token으로 교환 */
export async function exchangeCodeForToken(code: string): Promise<SpotifyToken> {
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) throw new Error("인증 세션이 만료됐어요. 다시 연동해주세요.");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(),
      code_verifier: verifier,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`토큰 교환 실패: ${res.status} ${body}`);
  }

  const data = await res.json();
  const token: SpotifyToken = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    scope: data.scope,
  };
  storeToken(token);
  sessionStorage.removeItem(VERIFIER_KEY);
  return token;
}

async function refreshAccessToken(prev: SpotifyToken): Promise<SpotifyToken> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: prev.refresh_token,
    }),
  });

  if (!res.ok) throw new Error("토큰 갱신 실패");

  const data = await res.json();
  const token: SpotifyToken = {
    access_token: data.access_token,
    // Spotify가 새 refresh_token을 안 주면 기존 것을 유지한다
    refresh_token: data.refresh_token ?? prev.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    // scope도 안 내려주면 기존 값을 유지 — 갱신으로 권한이 줄어들진 않는다
    scope: data.scope ?? prev.scope,
  };
  storeToken(token);
  return token;
}

/** Web Playback SDK가 요구하는 필수 스코프 세 개 — 하나라도 빠지면 재생이 거부된다 */
const PLAYBACK_SCOPES = ["streaming", "user-read-email", "user-read-private"];

/** 현재 저장된 토큰이 실제 곡 재생에 필요한 권한을 전부 갖고 있는지 */
export function hasStreamingScope(): boolean {
  const granted = getStoredToken()?.scope?.split(" ") ?? [];
  return PLAYBACK_SCOPES.every((s) => granted.includes(s));
}

/** 만료 임박이면 자동 갱신한 유효 access token을 반환. 미연동이면 null */
export async function getValidAccessToken(): Promise<string | null> {
  const token = getStoredToken();
  if (!token) return null;

  // 만료 60초 전이면 미리 갱신
  if (Date.now() > token.expires_at - 60_000) {
    try {
      const refreshed = await refreshAccessToken(token);
      return refreshed.access_token;
    } catch {
      clearToken();
      return null;
    }
  }
  return token.access_token;
}
