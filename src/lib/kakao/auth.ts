"use client";

import { BASE_PATH } from "@/lib/basePath";

// 카카오 로그인 — Kakao Developers 콘솔에서 안내하는 표준 방식(Kakao.Auth.authorize +
// 리다이렉트 후 쿠키로 토큰 전달)을 그대로 따른다. 팝업 기반 Auth.login()과 달리
// 페이지 전체가 카카오 로그인 화면으로 이동했다가 돌아오는 방식이라, "로그인 시작"과
// "로그인 완료 처리"가 서로 다른 페이지 로드에서 일어난다 — 그래서 두 함수로 나뉜다.
// 실제로 동작하려면 https://developers.kakao.com 에서:
//   1) JavaScript 키를 .env.local의 NEXT_PUBLIC_KAKAO_JS_KEY로 등록
//   2) 플랫폼 > Web에 이 앱이 실행되는 도메인 등록
//   3) 제품 설정 > 카카오 로그인 > Redirect URI에 kakaoRedirectUri()가 만드는
//      주소를 정확히 등록 (아래 함수 참고)

const JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "";
const SDK_SRC = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.1/kakao.min.js";
const CONTEXT_KEY = "rally-kakao-context";
const TOKEN_COOKIE = "authorize-access-token";

declare global {
  interface Window {
    Kakao?: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Auth: {
        authorize: (opts: { redirectUri: string }) => void;
        setAccessToken: (token: string | null) => void;
      };
      API: {
        request: (opts: {
          url: string;
          success: (res: unknown) => void;
          fail: (err: unknown) => void;
        }) => void;
      };
    };
  }
}

let sdkPromise: Promise<void> | null = null;

function loadSdk(): Promise<void> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    if (window.Kakao) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("카카오 SDK 로드에 실패했어요."));
    document.head.appendChild(script);
  });
  return sdkPromise;
}

async function ensureKakao() {
  if (!JS_KEY) {
    throw new Error("NEXT_PUBLIC_KAKAO_JS_KEY가 설정되지 않았어요. .env.local을 확인하세요.");
  }
  await loadSdk();
  const Kakao = window.Kakao;
  if (!Kakao) throw new Error("카카오 SDK를 불러오지 못했어요.");
  if (!Kakao.isInitialized()) Kakao.init(JS_KEY);
  return Kakao;
}

/** 등록해야 하는 Redirect URI — Spotify와 같은 이유로 BASE_PATH를 붙인다
 *  (GitHub Pages 서브패스에선 origin만으론 실제 콜백 경로가 안 나온다). */
export function kakaoRedirectUri() {
  return `${window.location.origin}${BASE_PATH}/callback/kakao`;
}

export type KakaoLoginContext = "onboarding" | "login";

/** 로그인 시작 — 카카오 로그인 화면으로 전체 페이지 이동한다.
 *  돌아왔을 때(콜백 페이지) 어디서 시작됐는지 알아야 하므로 컨텍스트를 남겨둔다. */
export async function startKakaoLogin(context: KakaoLoginContext) {
  const Kakao = await ensureKakao();
  sessionStorage.setItem(CONTEXT_KEY, context);
  Kakao.Auth.authorize({ redirectUri: kakaoRedirectUri() });
}

/** 콜백 페이지 진입 시 한 번만 읽고 지운다 */
export function consumeKakaoContext(): KakaoLoginContext | null {
  const value = sessionStorage.getItem(CONTEXT_KEY);
  if (!value) return null;
  sessionStorage.removeItem(CONTEXT_KEY);
  return value as KakaoLoginContext;
}

function getCookie(name: string): string | null {
  const parts = document.cookie.split(`${name}=`);
  if (parts.length !== 2) return null;
  return parts[1].split(";")[0] || null;
}

export type KakaoProfile = { id: string; name: string; email?: string };

/** 콜백 페이지에서 호출 — 카카오가 리다이렉트하며 심어둔 쿠키에서 토큰을 읽어
 *  프로필까지 가져온다. 쿠키가 없으면(취소/실패) null을 반환한다. */
export async function completeKakaoLogin(): Promise<KakaoProfile | null> {
  const token = getCookie(TOKEN_COOKIE);
  if (!token) return null;

  const Kakao = await ensureKakao();
  Kakao.Auth.setAccessToken(token);

  const me = await new Promise<Record<string, unknown>>((resolve, reject) => {
    Kakao.API.request({
      url: "/v2/user/me",
      success: (res) => resolve(res as Record<string, unknown>),
      fail: (err) => reject(err instanceof Error ? err : new Error("프로필 조회에 실패했어요.")),
    });
  });

  const kakaoAccount = (me.kakao_account ?? {}) as Record<string, unknown>;
  const profileObj = (kakaoAccount.profile ?? {}) as Record<string, unknown>;

  return {
    id: String(me.id),
    name: (profileObj.nickname as string) || "카카오 사용자",
    email: kakaoAccount.email as string | undefined,
  };
}
