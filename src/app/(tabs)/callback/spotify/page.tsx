"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { exchangeCodeForToken } from "@/lib/spotify/auth";
import { useLocale } from "@/lib/i18n/useLocale";

function SpotifyCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // setState가 이펙트 안에서 동기적으로 실행되지 않도록 한 틱 미룬다
    // (react-hooks/set-state-in-effect 대응).
    const id = setTimeout(() => {
      const code = params.get("code");
      const authError = params.get("error");

      if (authError) {
        setError(authError === "access_denied" ? t("callback.cancelled") : authError);
        return;
      }
      if (!code) {
        setError(t("callback.invalid"));
        return;
      }

      exchangeCodeForToken(code)
        .then(() => router.replace("/play"))
        .catch((e) => setError(e instanceof Error ? e.message : t("callback.failed")));
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t는 locale이 바뀔 때만 새로 만들어지고, 이 콜백 처리 자체는 처음 진입 시 한 번만 돌면 된다
  }, [params, router]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
      {error ? (
        <>
          <p className="text-[15px] font-semibold text-ink">{t("callback.failedTitle")}</p>
          <p className="type-caption text-[13px] text-mute">{error}</p>
          <button
            type="button"
            onClick={() => router.replace("/play")}
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

export default function SpotifyCallbackPage() {
  return (
    <Suspense fallback={null}>
      <SpotifyCallbackInner />
    </Suspense>
  );
}
