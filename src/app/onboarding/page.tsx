"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { markOnboardingComplete } from "@/lib/onboarding";
import { requestTransition } from "@/lib/transition";
import { IconWave, IconPaddle, IconInsight, IconSpotify } from "@/components/icons";
import { useLocale } from "@/lib/i18n/useLocale";
import type { DictKey } from "@/lib/i18n/dictionary";

type Step = {
  eyebrowKey: DictKey;
  titleKey: DictKey;
  descKey: DictKey;
  Icon: typeof IconWave;
  bg: string;
};

const STEPS: Step[] = [
  {
    eyebrowKey: "onboarding.step0.eyebrow",
    titleKey: "onboarding.step0.title",
    descKey: "onboarding.step0.desc",
    Icon: IconWave,
    bg: "radial-gradient(120% 90% at 20% 0%, #f24822 0%, #7a1f0c 45%, #111111 100%)",
  },
  {
    eyebrowKey: "onboarding.step1.eyebrow",
    titleKey: "onboarding.step1.title",
    descKey: "onboarding.step1.desc",
    Icon: IconSpotify,
    bg: "radial-gradient(120% 90% at 80% 0%, #1eaa52 0%, #0a3d20 45%, #111111 100%)",
  },
  {
    eyebrowKey: "onboarding.step2.eyebrow",
    titleKey: "onboarding.step2.title",
    descKey: "onboarding.step2.desc",
    Icon: IconPaddle,
    bg: "radial-gradient(120% 90% at 20% 100%, #f24822 0%, #4a0f05 45%, #111111 100%)",
  },
  {
    eyebrowKey: "onboarding.step3.eyebrow",
    titleKey: "onboarding.step3.title",
    descKey: "onboarding.step3.desc",
    Icon: IconInsight,
    bg: "radial-gradient(120% 90% at 80% 100%, #1151ff 0%, #0a1d5c 45%, #111111 100%)",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  function finish(slideUp: boolean) {
    markOnboardingComplete();
    // "시작하기"를 누른 경우에만 홈 화면이 하단에서 스윽 올라오는 큰 전환을
    // 쓴다 — "건너뛰기"는 이탈에 가까운 동작이라 평소의 은은한 전환을 유지한다.
    if (slideUp) requestTransition("slide-up");
    router.replace("/");
  }

  function next() {
    if (isLast) finish(true);
    else setStep((s) => s + 1);
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-black">
      {/* 배경 — 스텝마다 다른 브랜드 톤 그라디언트 */}
      <div
        className="absolute inset-0 transition-[background] duration-500"
        style={{ background: current.bg }}
      />

      {/* 건너뛰기 */}
      {!isLast && (
        <button
          type="button"
          onClick={() => finish(false)}
          className="tap type-caption relative z-10 ml-auto mr-6 mt-6 text-[13px] font-medium text-white/70"
        >
          {t("onboarding.skip")}
        </button>
      )}

      {/* 아이콘 — 스텝이 바뀔 때마다 key로 리마운트시켜 페이드+스케일 재생 */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <span
          key={step}
          className="pop-in flex size-32 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm"
        >
          <current.Icon size={56} className="text-white" />
        </span>
      </div>

      {/* 본문 — 텍스트도 스텝마다 새로 떠오르게 */}
      <div key={step} className="page-in relative z-10 px-6 pb-8">
        <p className="type-eyebrow text-[12px] font-medium uppercase text-primary">
          {t(current.eyebrowKey)}
        </p>
        <h1 className="type-display mt-2 whitespace-pre-line text-[36px] leading-[1.05] text-white">
          {t(current.titleKey)}
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-white/70">{t(current.descKey)}</p>

        {/* 페이지 도트 */}
        <div className="mt-6 flex gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-white" : "w-1.5 bg-white/30"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={next}
          className="tap mt-6 h-14 w-full rounded-lg bg-white text-[16px] font-semibold text-black"
        >
          {isLast ? t("onboarding.start") : t("onboarding.next")}
        </button>
      </div>
    </div>
  );
}
