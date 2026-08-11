"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { BASE_PATH, TRAILING_SLASH } from "@/lib/basePath";
import { useLocale } from "@/lib/i18n/useLocale";
import type { HostStatus } from "@/lib/rally/remote/usePeerHost";

/**
 * 폰 컨트롤러 페어링 안내 — QR과 코드 네 글자를 같이 보여준다.
 *
 * QR만 두면 카메라가 잘 안 잡히는 상황(화면 반사, 저조도)에서 막히고,
 * 코드만 두면 매번 손으로 쳐야 한다. 둘 다 두는 게 실제로 제일 빠르다.
 */
export default function PairingPanel({
  code,
  status,
  error,
  onUseCamera,
}: {
  code: string | null;
  status: HostStatus;
  error: string | null;
  onUseCamera: () => void;
}) {
  const { t } = useLocale();
  const [qr, setQr] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    let cancelled = false;

    (async () => {
      // 절대 URL이어야 한다 — 폰은 이 페이지를 열고 있지 않으니 상대 경로로는
      // 갈 곳을 모른다. GitHub Pages의 서브패스와 끝 슬래시까지 맞춘다.
      const target = `${window.location.origin}${BASE_PATH}/controller${TRAILING_SLASH}?c=${code}`;
      // QR 생성이 비동기라, 상태 갱신이 전부 이 await 뒤에서 일어난다 —
      // 덕분에 이펙트 본문에서 동기로 setState하는 일이 없다.
      const dataUrl = await QRCode.toDataURL(target, {
        margin: 1,
        width: 320,
        color: { dark: "#111111", light: "#ffffff" },
      }).catch(() => null);
      if (cancelled) return;
      setUrl(target);
      // QR을 못 만들어도 코드를 손으로 치는 길이 남아 있으니 그대로 진행한다
      setQr(dataUrl);
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-between bg-black/90 p-6">
      <div>
        <p className="type-eyebrow text-[11px] font-medium uppercase text-primary">
          {t("rally.pair.eyebrow")}
        </p>
        <h1 className="type-display mt-2 whitespace-pre-line text-[34px] leading-[0.95] text-white">
          {t("rally.pair.title")}
        </h1>
      </div>

      <div className="flex flex-col items-center">
        {status === "connected" ? (
          <>
            <span className="flex size-16 items-center justify-center rounded-full bg-success-bright/15 text-[28px]">
              ✓
            </span>
            <p className="mt-4 text-[17px] font-semibold text-white">
              {t("rally.pair.connected")}
            </p>
            <p className="type-caption mt-2 text-center text-[12px] leading-relaxed text-white/60">
              {t("rally.pair.connectedHint")}
            </p>
          </>
        ) : status === "error" ? (
          <p className="type-caption text-center text-[13px] leading-relaxed text-primary">
            {error ?? t("rally.pair.error")}
          </p>
        ) : qr ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- 런타임 생성 data URL */}
            <img
              src={qr}
              alt=""
              className="size-40 rounded-lg bg-white p-2"
            />
            <p className="type-caption mt-4 whitespace-pre-line text-center text-[12px] leading-relaxed text-white/60">
              {t("rally.pair.scanHint")}
            </p>
            <p className="type-display mt-3 text-[40px] tracking-[0.25em] text-white">
              {code}
            </p>
            {url && (
              <p className="type-caption mt-2 break-all text-center text-[10px] text-white/30">
                {url}
              </p>
            )}
          </>
        ) : (
          <p className="type-caption text-[13px] text-white/60">{t("rally.pair.opening")}</p>
        )}
      </div>

      <button
        type="button"
        onClick={onUseCamera}
        className="tap type-caption h-12 w-full text-[13px] font-medium text-white/60 underline underline-offset-4"
      >
        {t("rally.pair.useCamera")}
      </button>
    </div>
  );
}
