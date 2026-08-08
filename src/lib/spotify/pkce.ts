/**
 * Authorization Code + PKCE용 검증기/챌린지 생성.
 * Client Secret이 필요 없는 공개 클라이언트 플로우 — 모바일/SPA에 적합.
 * https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow
 */

function base64UrlEncode(bytes: ArrayBuffer) {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateCodeVerifier(length = 64) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const random = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(random, (b) => chars[b % chars.length]).join("");
}

export async function generateCodeChallenge(verifier: string) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(digest);
}
