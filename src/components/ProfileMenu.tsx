"use client";

import { useState } from "react";
import Link from "next/link";
import { useTheme, type ThemeSetting } from "@/lib/theme/useTheme";
import { useLocale } from "@/lib/i18n/useLocale";
import { useProfileName } from "@/lib/profile/useProfileName";
import { useProfileAvatar } from "@/lib/profile/useProfileAvatar";

/**
 * 홈 우측 상단 원형 아바타 — 누르면 드롭다운 패널이 뜬다.
 * 패널 자체는 새로 만든 컴포넌트라 Spotify 박스 레이아웃(8px 라운드,
 * 강한 그림자, 8px 기준 조밀한 패딩)을 그대로 적용했다 — 컬러는 Rally 것.
 */
export default function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const { setting, setTheme } = useTheme();
  const { t } = useLocale();
  const { name } = useProfileName();
  const { avatar } = useProfileAvatar();
  const displayName = name ?? t("settings.account.profileValue");
  const initial = displayName.slice(0, 1);

  const themeOptions: { value: ThemeSetting; label: string }[] = [
    { value: "light", label: t("settings.theme.light") },
    { value: "dark", label: t("settings.theme.dark") },
    { value: "system", label: t("settings.theme.system") },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("settings.account.profile")}
        aria-expanded={open}
        className="tap flex size-10 items-center justify-center overflow-hidden rounded-full bg-ink text-[14px] font-semibold text-canvas"
      >
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL, next/image 최적화 대상 아님
          <img src={avatar} alt="" className="size-full object-cover" />
        ) : (
          initial
        )}
      </button>

      {open && (
        <>
          {/* 바깥 탭하면 닫기 */}
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            className="pop-in absolute right-0 top-12 z-50 w-64 bg-canvas p-2"
            style={{ borderRadius: "var(--radius-panel)", boxShadow: "var(--shadow-elevated)" }}
          >
            {/* 여기를 누르면 자세한 프로필 페이지로 — 지금까진 이름/플랜만
                보여주고 눌러도 반응이 없었다 */}
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="tap flex items-center gap-3 p-2"
            >
              <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink text-[14px] font-semibold text-canvas">
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element -- data URL, next/image 최적화 대상 아님
                  <img src={avatar} alt="" className="size-full object-cover" />
                ) : (
                  initial
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold text-ink">{displayName}</p>
                <p className="truncate text-[12px] text-mute">{t("profile.plan")}</p>
              </div>
              <span className="type-caption text-[11px] text-primary">
                {t("profile.viewProfile")}
              </span>
            </Link>

            <div className="my-2 h-px bg-hairline-soft" />

            {/* 테마 — 8px 갭의 조밀한 세그먼트, Spotify 필 버튼 스페이싱 */}
            <div className="flex gap-1 p-1">
              {themeOptions.map((opt) => {
                const active = setting === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setTheme(opt.value)}
                    aria-pressed={active}
                    className={`flex-1 py-2 text-[12px] font-medium transition-colors ${
                      active ? "bg-ink text-canvas" : "bg-cloud text-mute"
                    }`}
                    style={{ borderRadius: "var(--radius-panel)" }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="my-2 h-px bg-hairline-soft" />

            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="tap block p-2 text-[13px] font-medium text-ink"
            >
              {t("profile.goToSettings")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
