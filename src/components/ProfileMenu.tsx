"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/useLocale";
import { useProfileName } from "@/lib/profile/useProfileName";
import { useProfileAvatar } from "@/lib/profile/useProfileAvatar";

/**
 * 홈 우측 상단 원형 아바타 — 누르면 곧장 프로필 편집으로 간다.
 *
 * 예전엔 드롭다운을 띄워 테마 토글과 설정 링크를 담았는데, 아바타를 누르는
 * 의도는 거의 항상 "내 프로필을 보거나 고치겠다"였다. 한 단계를 없앴다.
 * 테마 토글은 설정에 그대로 있어서 잃는 기능은 없다.
 *
 * ?edit=1 — 프로필 페이지가 이 값을 보고 이름 입력칸을 바로 연다.
 */
export default function ProfileMenu() {
  const { t } = useLocale();
  const { name } = useProfileName();
  const { avatar } = useProfileAvatar();
  const displayName = name ?? t("settings.account.profileValue");

  return (
    <Link
      href="/profile?edit=1"
      aria-label={t("settings.account.profile")}
      className="tap flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink text-[14px] font-semibold text-canvas"
    >
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL, next/image 최적화 대상 아님
        <img src={avatar} alt="" className="size-full object-cover" />
      ) : (
        displayName.slice(0, 1)
      )}
    </Link>
  );
}
