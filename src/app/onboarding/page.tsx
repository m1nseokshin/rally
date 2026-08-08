"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { markOnboardingComplete } from "@/lib/onboarding";
import { requestTransition } from "@/lib/transition";
import { IconWave, IconPaddle, IconInsight, IconSpotify } from "@/components/icons";
import { useLocale } from "@/lib/i18n/useLocale";
import { useAuth } from "@/lib/auth/useAuth";
import { loginWithKakao } from "@/lib/kakao/auth";
import type { DictKey, Locale } from "@/lib/i18n/dictionary";

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

/** 다음 칸으로 넘어갔다고 인정하는 최소 드래그 비율 — 화면 폭의 18% */
const SWIPE_THRESHOLD_RATIO = 0.18;
/** 첫/마지막 칸을 더 끌어당길 때 고무줄처럼 저항을 준다 */
const OVERSCROLL_RESISTANCE = 0.35;
/** 스플래시가 떠 있는 시간 */
const SPLASH_MS = 2000;

type Phase = "splash" | "language" | "steps";

export default function OnboardingPage() {
  const [phase, setPhase] = useState<Phase>("splash");

  useEffect(() => {
    const id = setTimeout(() => setPhase("language"), SPLASH_MS);
    return () => clearTimeout(id);
  }, []);

  if (phase === "splash") return <Splash />;
  if (phase === "language") return <LanguagePicker onContinue={() => setPhase("steps")} />;
  return <StepsCarousel />;
}

/** 1) 스플래시 — 브랜드 워드마크만 잠깐 보여준다 */
function Splash() {
  const { t } = useLocale();
  return (
    <div className="pop-in flex h-full flex-col items-center justify-center bg-black">
      <p className="type-display text-[56px] leading-none text-white">Rally</p>
      <p className="type-caption mt-3 text-[13px] text-white/50">{t("splash.tagline")}</p>
    </div>
  );
}

/** 2) 언어 선택 — 온보딩 설명을 어떤 언어로 보여줄지 먼저 고른다 */
function LanguagePicker({ onContinue }: { onContinue: () => void }) {
  const { locale, setLocale, t } = useLocale();

  const options: { value: Locale; label: string }[] = [
    { value: "ko", label: "한국어" },
    { value: "en", label: "English" },
  ];

  return (
    <div className="page-in flex h-full flex-col justify-between bg-black p-6">
      <div className="pt-[12dvh]">
        <p className="type-eyebrow text-[12px] font-medium uppercase text-primary">
          {t("onboarding.language.eyebrow")}
        </p>
        <h1 className="type-display mt-2 whitespace-pre-line text-[36px] leading-[1.05] text-white">
          {t("onboarding.language.title")}
        </h1>

        <div className="mt-8 flex flex-col gap-3">
          {options.map((opt) => {
            const active = locale === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setLocale(opt.value)}
                aria-pressed={active}
                className={`tap flex h-14 items-center justify-between rounded-lg px-5 text-[16px] font-semibold ${
                  active ? "bg-white text-black" : "bg-white/10 text-white"
                }`}
              >
                {opt.label}
                {active && <span className="text-[13px] font-medium">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="tap h-14 w-full rounded-lg bg-white text-[16px] font-semibold text-black"
      >
        {t("onboarding.language.continue")}
      </button>
    </div>
  );
}

/** 3) 앱 설명 — 좌우 스와이프 가능한 캐러셀, 마지막 칸에서 시작하기/카카오 로그인 */
function StepsCarousel() {
  const router = useRouter();
  const { t } = useLocale();
  const { signInWithKakao } = useAuth();
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [kakaoError, setKakaoError] = useState<string | null>(null);

  // 터치 드래그 — 실시간으로 손가락을 그대로 따라가다가(1:1), 손을 떼는
  // 순간에만 스냅 애니메이션을 켠다. dragX는 렌더 중 transform에 바로 반영해야
  // "실시간 반응"이 되므로 state로 둔다.
  const trackWrapRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const dragStartXRef = useRef(0);
  // 렌더 중(배경/도트의 실시간 반응 계산)에 읽어야 해서 ref가 아니라 state로 둔다 —
  // ref.current는 렌더 중에 읽으면 안 된다(react-hooks/refs).
  const [width, setWidth] = useState(1);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);

  function onPointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointerIdRef.current = e.pointerId;
    dragStartXRef.current = e.clientX;
    setWidth(trackWrapRef.current?.clientWidth || 1);
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== e.pointerId) return;
    let delta = e.clientX - dragStartXRef.current;
    const atStart = step === 0 && delta > 0;
    const atEnd = isLast && delta < 0;
    if (atStart || atEnd) delta *= OVERSCROLL_RESISTANCE;
    setDragX(delta);
  }

  function endDrag(e: ReactPointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    const threshold = width * SWIPE_THRESHOLD_RATIO;
    let nextStep = step;
    if (dragX < -threshold && step < STEPS.length - 1) nextStep = step + 1;
    else if (dragX > threshold && step > 0) nextStep = step - 1;
    setStep(nextStep);
    setDragX(0);
    setDragging(false);
  }

  // 드래그 중엔 목적지가 아니라 "지금 손가락이 가리키는 칸"을 보여줘야
  // 배경·도트가 실시간으로 반응한다.
  const rawProgress = step - dragX / (width || 1);
  const visualIndex = Math.min(STEPS.length - 1, Math.max(0, Math.round(rawProgress)));
  const visual = STEPS[visualIndex];

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

  async function startWithKakao() {
    setKakaoError(null);
    setKakaoLoading(true);
    try {
      const profile = await loginWithKakao();
      signInWithKakao(profile);
      finish(true);
    } catch (e) {
      setKakaoError(e instanceof Error ? e.message : t("login.kakao.missingKey"));
      setKakaoLoading(false);
    }
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-black">
      {/* 배경 — 드래그 중엔 손가락이 가리키는 칸 기준으로 실시간 크로스페이드 */}
      <div
        className="absolute inset-0 transition-[background] duration-500"
        style={{ background: visual.bg }}
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

      {/* 좌우로 스와이프 가능한 트랙 — 손가락 이동에 1:1로 실시간 반응한다 */}
      <div
        ref={trackWrapRef}
        className="relative z-10 flex-1 touch-none select-none overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="flex h-full"
          style={{
            width: `${STEPS.length * 100}%`,
            transform: `translateX(calc(-${(step * 100) / STEPS.length}% + ${dragX}px))`,
            transition: dragging ? "none" : "transform 320ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          {STEPS.map((s, i) => (
            <div
              key={i}
              className="flex h-full flex-col items-center justify-center"
              style={{ width: `${100 / STEPS.length}%` }}
            >
              <span className="flex size-32 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                <s.Icon size={56} className="text-white" />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 본문 — 아이콘과 같은 칸 안에서 같이 스와이프되진 않지만, 어느 칸을
          보고 있는지는(step) 실시간 드래그가 아니라 손을 뗀 뒤 확정값을 쓴다.
          텍스트가 손가락 따라 매 프레임 바뀌면 읽기 힘들어서 확정 시점에만 바꾼다. */}
      <div className="relative z-10 px-6 pb-8">
        <p className="type-eyebrow text-[12px] font-medium uppercase text-primary">
          {t(STEPS[step].eyebrowKey)}
        </p>
        <h1 className="type-display mt-2 whitespace-pre-line text-[36px] leading-[1.05] text-white">
          {t(STEPS[step].titleKey)}
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-white/70">
          {t(STEPS[step].descKey)}
        </p>

        {/* 페이지 도트 — 드래그 중엔 손가락이 가리키는 칸을 실시간으로 보여준다 */}
        <div className="mt-6 flex gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === visualIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"
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

        {/* 마지막 칸에서만 — 그냥 시작하기 대신 카카오로 로그인해서 시작할 수도 있다 */}
        {isLast && (
          <>
            <div className="mt-4 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/15" />
              <span className="text-[11px] font-medium text-white/40">{t("onboarding.or")}</span>
              <span className="h-px flex-1 bg-white/15" />
            </div>
            <button
              type="button"
              onClick={startWithKakao}
              disabled={kakaoLoading}
              className="tap mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#FEE500] text-[14px] font-semibold text-[#191600] disabled:opacity-60"
            >
              <KakaoGlyph />
              {t("onboarding.kakaoStart")}
            </button>
            {kakaoError && <p className="mt-2 text-[12px] text-primary">{kakaoError}</p>}
          </>
        )}
      </div>
    </div>
  );
}

function KakaoGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="#191600">
      <path d="M12 3C6.48 3 2 6.48 2 10.7c0 2.7 1.83 5.07 4.6 6.44-.2.73-.72 2.63-.83 3.04-.13.5.18.5.39.36.16-.11 2.6-1.77 3.66-2.49.7.1 1.42.15 2.18.15 5.52 0 10-3.48 10-7.5S17.52 3 12 3Z" />
    </svg>
  );
}
