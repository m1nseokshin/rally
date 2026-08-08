"use client";

// 카카오 로그인 — Kakao JS SDK를 브라우저에서 그대로 쓰는 방식이라
// Spotify PKCE와 달리 별도 토큰 교환 서버가 필요 없다(퍼블릭 JS 키만 노출).
// 실제로 로그인 버튼이 동작하려면 https://developers.kakao.com 에서 앱을
// 만들고 JavaScript 키를 .env.local의 NEXT_PUBLIC_KAKAO_JS_KEY로 등록해야 한다.

const JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "";
const SDK_SRC = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";

declare global {
  interface Window {
    Kakao?: {
      init: (key: string) => void;
      isInitialized: () => boolean;
      Auth: {
        login: (opts: { success: (auth: unknown) => void; fail: (err: unknown) => void }) => void;
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

export type KakaoProfile = { id: string; name: string; email?: string };

/** 카카오 로그인 → 사용자 프로필까지 받아온다 */
export async function loginWithKakao(): Promise<KakaoProfile> {
  if (!JS_KEY) {
    throw new Error("NEXT_PUBLIC_KAKAO_JS_KEY가 설정되지 않았어요. .env.local을 확인하세요.");
  }

  await loadSdk();
  const Kakao = window.Kakao;
  if (!Kakao) throw new Error("카카오 SDK를 불러오지 못했어요.");
  if (!Kakao.isInitialized()) Kakao.init(JS_KEY);

  await new Promise<void>((resolve, reject) => {
    Kakao.Auth.login({
      success: () => resolve(),
      fail: (err) => reject(err instanceof Error ? err : new Error("카카오 로그인에 실패했어요.")),
    });
  });

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
