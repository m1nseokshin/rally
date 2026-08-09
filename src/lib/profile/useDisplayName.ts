"use client";

import { useAuth } from "@/lib/auth/useAuth";
import { useLocale } from "@/lib/i18n/useLocale";
import { useProfileName } from "./useProfileName";

/**
 * 화면에 보여줄 이름 — 우선순위가 있다.
 *
 *  1. 프로필에서 직접 고친 이름
 *  2. 회원가입할 때 입력한 이름
 *  3. 사전의 기본값
 *
 * 2번이 빠져 있어서 가입할 때 이름을 뭘 넣든 "강민석"으로 고정돼 보였다.
 * 각 화면이 제각기 `name ?? t(...)`로 폴백하던 걸 여기로 모아,
 * 한 군데만 고치면 전부 같이 따라오게 했다.
 */
export function useDisplayName() {
  const { name } = useProfileName();
  const { user } = useAuth();
  const { t } = useLocale();
  return name ?? user?.name ?? t("settings.account.profileValue");
}
