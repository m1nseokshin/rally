"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { useRouter } from "next/navigation";
import { markOnboardingComplete } from "@/lib/onboarding";
import { requestTransition } from "@/lib/transition";
import { IconWave, IconPaddle, IconInsight, IconDevice } from "@/components/icons";
import { useLocale } from "@/lib/i18n/useLocale";
import { useAuth } from "@/lib/auth/useAuth";
import type { DictKey, Locale } from "@/lib/i18n/dictionary";

type Step = {
  eyebrowKey: DictKey;
  titleKey: DictKey;
  /** 마지막 칸(브랜드 마무리)은 설명 없이 한 문장으로 끝난다 */
  descKey?: DictKey;
  Icon: typeof IconWave;
  bg: string;
  /** 아이콘 대신 Rally 워드마크를 띄우고 제목을 키운다 */
  finale?: boolean;
};

/**
 * 01 몰입 → 02 음악 → 03 기록 → 04 브랜드.
 *
 * 배경은 전부 브랜드 오렌지 계열이다. 예전엔 칸마다 초록(Spotify)·파랑을
 * 섞었는데, 이 앱의 색 언어는 "무채색 + 오렌지 하나"라서 온보딩에서만
 * 색이 셋으로 늘면 첫인상부터 규칙이 어긋난다. 대신 그라디언트의 위치와
 * 깊이를 칸마다 바꿔 변화를 주고, 마지막 칸은 거의 검게 가라앉혀
 * 워드마크만 남게 했다.
 */
const STEPS: Step[] = [
  {
    eyebrowKey: "onboarding.step0.eyebrow",
    titleKey: "onboarding.step0.title",
    descKey: "onboarding.step0.desc",
    Icon: IconDevice,
    bg: "radial-gradient(120% 90% at 20% 0%, #f24822 0%, #7a1f0c 45%, #111111 100%)",
  },
  {
    eyebrowKey: "onboarding.step1.eyebrow",
    titleKey: "onboarding.step1.title",
    descKey: "onboarding.step1.desc",
    Icon: IconWave,
    bg: "radial-gradient(120% 90% at 80% 10%, #ff6a3d 0%, #8a2a10 45%, #111111 100%)",
  },
  {
    eyebrowKey: "onboarding.step2.eyebrow",
    titleKey: "onboarding.step2.title",
    descKey: "onboarding.step2.desc",
    Icon: IconInsight,
    bg: "radial-gradient(120% 90% at 20% 100%, #f24822 0%, #4a0f05 45%, #111111 100%)",
  },
  {
    eyebrowKey: "onboarding.step3.eyebrow",
    titleKey: "onboarding.step3.title",
    Icon: IconPaddle,
    bg: "radial-gradient(140% 100% at 50% 120%, #c9330f 0%, #2a0a03 40%, #000000 100%)",
    finale: true,
  },
];

/** 다음 칸으로 넘어갔다고 인정하는 최소 드래그 비율 — 화면 폭의 18% */
const SWIPE_THRESHOLD_RATIO = 0.18;
/** 첫/마지막 칸을 더 끌어당길 때 고무줄처럼 저항을 준다 */
const OVERSCROLL_RESISTANCE = 0.35;
/** 스플래시가 떠 있는 시간 */
const SPLASH_MS = 2000;
/** 스플래시 → 언어 → 로그인/회원가입 → 앱 설명, 구간 사이를 좌우로 넘길 때 걸리는 시간 */
const PHASE_TRANSITION_MS = 600;

// 0 스플래시 → 1 언어 선택 → 2 로그인/회원가입 → 3 앱 설명(회원가입 때만 도달)
const PHASES = ["splash", "language", "auth", "steps"] as const;

export default function OnboardingPage() {
  const router = useRouter();
  // 네 구간을 하나의 가로 트랙에 나란히 두고 translateX로 넘긴다 — 구간을
  // 오갈 때마다 뚝 끊기지 않고 한 화면이 옆으로 밀려나면서 다음 화면이
  // 들어오는 느낌을 준다.
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => setPhaseIndex(1), SPLASH_MS);
    return () => clearTimeout(id);
  }, []);

  /** 로그인(기존 계정)은 앱 설명 없이 바로 홈으로 — 회원가입만 앱 설명을 본다 */
  function finishToHome() {
    markOnboardingComplete();
    requestTransition("slide-up");
    router.replace("/");
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div
        className="flex h-full"
        style={{
          width: `${PHASES.length * 100}%`,
          transform: `translateX(-${(phaseIndex * 100) / PHASES.length}%)`,
          transition: `transform ${PHASE_TRANSITION_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
        }}
      >
        <div className="h-full" style={{ width: `${100 / PHASES.length}%` }}>
          <Splash />
        </div>
        <div className="h-full" style={{ width: `${100 / PHASES.length}%` }}>
          <LanguagePicker onContinue={() => setPhaseIndex(2)} />
        </div>
        <div className="h-full" style={{ width: `${100 / PHASES.length}%` }}>
          <AuthPhase
            onLoggedIn={finishToHome}
            onSignedUp={() => setPhaseIndex(3)}
          />
        </div>
        <div className="h-full" style={{ width: `${100 / PHASES.length}%` }}>
          <StepsCarousel />
        </div>
      </div>
    </div>
  );
}

/** 1) 스플래시 — 브랜드 워드마크만 잠깐 보여준다 */
function Splash() {
  const { t } = useLocale();
  return (
    <div className="flex h-full flex-col items-center justify-center bg-black">
      <p className="type-display text-[56px] leading-none text-white">Rally</p>
      <p className="type-caption mt-3 text-[13px] text-white/50">{t("splash.tagline")}</p>
    </div>
  );
}

/** 2) 언어 선택 — 이후 화면(로그인/앱 설명)을 어떤 언어로 보여줄지 먼저 고른다 */
function LanguagePicker({ onContinue }: { onContinue: () => void }) {
  const { locale, setLocale, t } = useLocale();

  const options: { value: Locale; label: string }[] = [
    { value: "ko", label: "한국어" },
    { value: "en", label: "English" },
  ];

  return (
    <div className="flex h-full flex-col justify-between bg-black p-6">
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

/** 3) 로그인 / 회원가입 — 기존 계정 로그인은 앱 설명 없이 바로 홈으로,
 *  회원가입은 다음 칸(앱 설명)으로 넘어간다. */
function AuthPhase({
  onLoggedIn,
  onSignedUp,
}: {
  onLoggedIn: () => void;
  onSignedUp: () => void;
}) {
  const { t } = useLocale();
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!id.trim() || !password.trim() || (mode === "signup" && !name.trim())) {
      setError(t("login.error.required"));
      return;
    }

    try {
      if (mode === "signup") {
        signUpWithEmail(id.trim(), password, name.trim());
        onSignedUp();
      } else {
        signInWithEmail(id.trim(), password);
        onLoggedIn();
      }
    } catch (e) {
      const key = e instanceof Error ? e.message : "invalid";
      setError(key === "exists" ? t("login.error.exists") : t("login.error.invalid"));
    }
  }

  return (
    <div className="flex h-full flex-col justify-center bg-black p-6">
      <p className="type-eyebrow text-[12px] font-medium uppercase text-primary">
        {t("login.eyebrow")}
      </p>
      <h1 className="type-display mt-2 text-[36px] leading-[1.05] text-white">
        {mode === "signup" ? t("login.signupSubmit") : t("login.submit")}
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        {mode === "signup" && (
          <DarkField
            label={t("profile.namePlaceholder")}
            value={name}
            onChange={setName}
            placeholder={t("profile.namePlaceholder")}
          />
        )}
        <DarkField
          label={t("login.id")}
          value={id}
          onChange={setId}
          placeholder={t("login.idPlaceholder")}
        />
        <DarkField
          label={t("login.password")}
          value={password}
          onChange={setPassword}
          placeholder={t("login.passwordPlaceholder")}
          type="password"
        />

        {error && <p className="text-[12px] text-primary">{error}</p>}

        <button
          type="submit"
          className="tap mt-2 h-14 w-full rounded-lg bg-white text-[16px] font-semibold text-black"
        >
          {mode === "signup" ? t("login.signupSubmit") : t("login.submit")}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode((m) => (m === "login" ? "signup" : "login"));
          setError(null);
        }}
        className="tap mt-4 w-full text-center text-[13px] font-medium text-white/60 underline underline-offset-4"
      >
        {mode === "login" ? t("login.signupToggle") : t("login.loginToggle")}
      </button>
    </div>
  );
}

/** 온보딩은 항상 어두운 배경이라 /login의 밝은 테마 Field와는 스타일이 다르다 */
function DarkField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-white/50">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-lg bg-white/10 px-4 text-[15px] text-white outline-none placeholder:text-white/30"
      />
    </label>
  );
}

/** 4) 앱 설명 — 좌우 스와이프 가능한 캐러셀. 회원가입을 마친 경우에만 도달한다. */
function StepsCarousel() {
  const router = useRouter();
  const { t } = useLocale();
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;

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
              {s.finale ? (
                // 마지막 칸은 기능 설명이 아니라 브랜드로 닫는다 —
                // 아이콘을 하나 더 띄우면 "네 번째 기능"처럼 읽힌다.
                <p className="type-display text-[72px] leading-none text-white">Rally</p>
              ) : (
                <span className="flex size-32 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                  <s.Icon size={56} className="text-white" />
                </span>
              )}
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
        <h1
          className={`type-display mt-2 whitespace-pre-line leading-[1.05] text-white ${
            STEPS[step].finale ? "text-[44px]" : "text-[36px]"
          }`}
        >
          {t(STEPS[step].titleKey)}
        </h1>
        {STEPS[step].descKey && (
          <p className="mt-3 text-[14px] leading-relaxed text-white/70">
            {t(STEPS[step].descKey)}
          </p>
        )}

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
      </div>
    </div>
  );
}
