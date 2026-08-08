"use client";

import { useLocale } from "@/lib/i18n/useLocale";
import type { Locale } from "@/lib/i18n/dictionary";

// 카카오 공식 로그인 버튼 리소스 — developers.kakao.com/tool/resource/login에서
// 받는 표준 디자인. 다운로드 페이지가 언어별로 골라받는 방식이라 코드에서 URL을
// 알아낼 수 없었고, 지금은 한국어 버전 하나만 확보한 상태라 en도 같은 이미지를
// 쓴다 — 영어 전용 버튼 이미지 URL이 생기면 여기만 바꾸면 된다.
const KAKAO_BUTTON_SRC: Record<Locale, string> = {
  ko: "https://k.kakaocdn.net/14/dn/btroDszwNrM/I6efHub1SN5KCJqLm1Ovx1/o.jpg",
  en: "https://k.kakaocdn.net/14/dn/btroDszwNrM/I6efHub1SN5KCJqLm1Ovx1/o.jpg",
};

export default function KakaoLoginButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  const { locale, t } = useLocale();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={t("login.kakao")}
      className="tap block w-full overflow-hidden rounded-lg disabled:opacity-60"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- 카카오 공식 CDN 브랜드 에셋, next/image 최적화 대상 아님 */}
      <img src={KAKAO_BUTTON_SRC[locale]} alt={t("login.kakao")} className="block w-full" />
    </button>
  );
}
