"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { completeKakaoLogin, consumeKakaoContext } from "@/lib/kakao/auth";
import { markOnboardingComplete } from "@/lib/onboarding";
import { requestTransition } from "@/lib/transition";
import { useAuth } from "@/lib/auth/useAuth";
import { useLocale } from "@/lib/i18n/useLocale";

export default function KakaoCallbackPage() {
  const router = useRouter();
  const { t } = useLocale();
  const { signInWithKakao } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // setState가 이펙트 안에서 동기적으로 실행되지 않도록 한 틱 미룬다
    // (react-hooks/set-state-in-effect 대응).
    const id = setTimeout(() => {
      const context = consumeKakaoContext();

      completeKakaoLogin()
        .then((profile) => {
          if (!profile) {
            setError(t("callback.cancelled"));
            return;
          }
          signInWithKakao(profile);

          if (context === "onboarding") {
            markOnboardingComplete();
            requestTransition("slide-up");
            router.replace("/");
          } else {
            router.replace("/settings");
          }
        })
        .catch((e) => setError(e instanceof Error ? e.message : t("callback.failed")));
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 진입 시 한 번만 처리하면 된다
  }, []);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      {error ? (
        <>
          <p className="text-[15px] font-semibold text-ink">{t("callback.failedTitle")}</p>
          <p className="type-caption text-[13px] text-mute">{error}</p>
          <button
            type="button"
            onClick={() => router.replace("/login")}
            className="tap mt-2 h-11 rounded-lg bg-ink px-6 text-[14px] font-semibold text-canvas"
          >
            {t("callback.goBack")}
          </button>
        </>
      ) : (
        <>
          <span className="size-8 animate-spin rounded-full border-2 border-hairline border-t-primary" />
          <p className="type-caption text-[13px] text-mute">{t("callback.connecting")}</p>
        </>
      )}
    </div>
  );
}
