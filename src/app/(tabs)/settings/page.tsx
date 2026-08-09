"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ActionSheet, PageHeader, Row, SectionTitle } from "@/components/ui";
import { IconSpotify, IconCheck } from "@/components/icons";
import { useSpotify } from "@/lib/spotify/useSpotify";
import { hasStreamingScope } from "@/lib/spotify/auth";
import { useTheme } from "@/lib/theme/useTheme";
import { useLocale } from "@/lib/i18n/useLocale";
import { useDisplayName } from "@/lib/profile/useDisplayName";
import { useAuth } from "@/lib/auth/useAuth";
import { useSessionPrefs, type NotificationPref } from "@/lib/settings/useSessionPrefs";
import { usePlan, PLAN_OPTIONS } from "@/lib/settings/usePlan";
import type { DictKey } from "@/lib/i18n/dictionary";

export default function SettingsPage() {
  const router = useRouter();
  const spotify = useSpotify();
  const { setting, setTheme } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const displayName = useDisplayName();
  const { user, signOut } = useAuth();
  const { plan, setPlan } = usePlan();
  const { difficulty, notification, setDifficulty, setNotification } = useSessionPrefs();
  // 재생 권한(streaming) 추가 전에 연동한 계정이면 다시 연동해야
  // XR 세션에서 실제 음원이 나온다.
  const needsReconnect = spotify.connected && !hasStreamingScope();
  const [haptics, setHaptics] = useState(true);
  const [autoStart, setAutoStart] = useState(false);
  const [difficultySheet, setDifficultySheet] = useState(false);
  const [notificationSheet, setNotificationSheet] = useState(false);
  const [planSheet, setPlanSheet] = useState(false);

  const difficultyOptions = [1, 2, 3, 4, 5].map((n) => ({
    value: n,
    label: t(`settings.difficulty.${n}` as DictKey),
  }));
  const notificationOptions: { value: NotificationPref; label: string }[] = [
    { value: "all", label: t("settings.notification.all") },
    { value: "summary", label: t("settings.notification.summary") },
    { value: "off", label: t("settings.notification.off") },
  ];
  const notificationLabel = notificationOptions.find((o) => o.value === notification)!.label;
  const planOptions = PLAN_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }));
  const planLabel = planOptions.find((o) => o.value === plan)!.label;

  function logout() {
    // 계정 세션과 Spotify 연동을 모두 끊고 초기 로그인 화면으로 보낸다.
    // replace를 쓰는 이유 — push면 뒤로가기로 로그아웃된 화면에 되돌아갈 수 있다.
    signOut();
    spotify.disconnect();
    // signedout 표시를 달아 보낸다 — 로그인 화면이 이걸 보고 뒤로가기를 숨긴다.
    // 로그아웃한 뒤에 돌아갈 곳은 방금 로그아웃한 화면뿐이라 의미가 없다.
    router.replace("/login?signedout=1");
  }

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow={t("settings.eyebrow", { name: displayName })}
        title={t("settings.title")}
        desc={t("settings.desc")}
      />

      {/* 계정 */}
      <section className="mt-2">
        <SectionTitle>{t("settings.section.account")}</SectionTitle>
        <Row
          label={t("settings.account.profile")}
          value={displayName}
          onClick={() => router.push("/profile")}
        />
        <Row
          label={t("settings.account.plan")}
          value={planLabel}
          onClick={() => setPlanSheet(true)}
        />
        <Row
          label={t("settings.account.loginMethod")}
          value={user ? t("settings.account.emailLabel") : t("settings.account.notLoggedIn")}
          onClick={user ? signOut : () => router.push("/login")}
        />
      </section>

      {/* 화면 — 라벨/세그먼트를 세로로 쌓는다. 가로 배치는 영어 등
          긴 라벨(Light/Dark/System)에서 겹친다 */}
      <section className="mt-10">
        <SectionTitle>{t("settings.section.display")}</SectionTitle>
        <div className="border-b border-hairline-soft px-6 py-5">
          <p className="mb-3 text-[15px] font-medium text-ink">{t("settings.display.theme")}</p>
          <Segmented
            value={setting}
            onChange={setTheme}
            options={[
              { value: "light", label: t("settings.theme.light") },
              { value: "dark", label: t("settings.theme.dark") },
              { value: "system", label: t("settings.theme.system") },
            ]}
          />
        </div>
        <div className="border-b border-hairline-soft px-6 py-5">
          <p className="mb-3 text-[15px] font-medium text-ink">
            {t("settings.display.language")}
          </p>
          <Segmented
            value={locale}
            onChange={setLocale}
            options={[
              { value: "ko", label: t("settings.lang.ko") },
              { value: "en", label: t("settings.lang.en") },
            ]}
          />
        </div>
      </section>

      {/* 연동 */}
      <section className="mt-10">
        <SectionTitle>{t("settings.section.integration")}</SectionTitle>
        <div className="border-t border-hairline-soft">
          <ProviderRow
            icon={<IconSpotify size={20} />}
            name="Spotify"
            connected={spotify.connected}
            onConnect={spotify.connect}
            onDisconnect={spotify.disconnect}
          />
        </div>
        {needsReconnect && (
          <div className="mx-6 mt-3 flex items-start gap-2.5 bg-primary-soft px-4 py-3">
            <p className="text-[12px] leading-relaxed text-charcoal">
              {t("settings.integration.reconnect")}
            </p>
          </div>
        )}
      </section>

      {/* 세션 기본값 */}
      <section className="mt-10">
        <SectionTitle>{t("settings.section.session")}</SectionTitle>
        <div className="border-t border-hairline-soft">
          <ToggleRow
            label={t("settings.session.haptics")}
            desc={t("settings.session.hapticsDesc")}
            checked={haptics}
            onChange={setHaptics}
          />
          <ToggleRow
            label={t("settings.session.autoStart")}
            desc={t("settings.session.autoStartDesc")}
            checked={autoStart}
            onChange={setAutoStart}
          />
          <Row
            label={t("settings.session.difficulty")}
            value={`${difficulty} / 5`}
            onClick={() => setDifficultySheet(true)}
          />
          <Row
            label={t("settings.session.notification")}
            value={notificationLabel}
            onClick={() => setNotificationSheet(true)}
          />
        </div>
      </section>

      {/* 정보 */}
      <section className="mt-10">
        <SectionTitle>{t("settings.section.info")}</SectionTitle>
        <Row label={t("settings.info.version")} value="1.0.0" />
        <Row label={t("settings.info.terms")} />
        <Row label={t("settings.info.privacy")} />
      </section>

      <section className="mt-10 px-6">
        <button
          type="button"
          onClick={logout}
          className="tap h-12 w-full rounded-lg border border-hairline text-[15px] font-semibold text-mute"
        >
          {t("settings.logout")}
        </button>
      </section>

      {difficultySheet && (
        <ActionSheet
          title={t("settings.sheet.difficultyTitle")}
          options={difficultyOptions.map((o) => ({ value: String(o.value), label: o.label }))}
          value={String(difficulty)}
          onSelect={(v) => setDifficulty(Number(v))}
          onClose={() => setDifficultySheet(false)}
          cancelLabel={t("settings.sheet.cancel")}
        />
      )}
      {planSheet && (
        <ActionSheet
          title={t("settings.sheet.planTitle")}
          options={planOptions}
          value={plan}
          onSelect={setPlan}
          onClose={() => setPlanSheet(false)}
          cancelLabel={t("settings.sheet.cancel")}
        />
      )}
      {notificationSheet && (
        <ActionSheet
          title={t("settings.sheet.notificationTitle")}
          options={notificationOptions}
          value={notification}
          onSelect={setNotification}
          onClose={() => setNotificationSheet(false)}
          cancelLabel={t("settings.sheet.cancel")}
        />
      )}
    </div>
  );
}

function ProviderRow({
  icon,
  name,
  connected,
  onConnect,
  onDisconnect,
}: {
  icon: React.ReactNode;
  name: string;
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="flex items-center gap-4 border-b border-hairline-soft px-6 py-4">
      <span className="flex size-11 items-center justify-center rounded-full bg-cloud text-ink">
        {icon}
      </span>
      <span className="flex-1 text-[15px] font-semibold text-ink">{name}</span>
      {connected ? (
        <button
          type="button"
          onClick={onDisconnect}
          className="tap flex items-center gap-1.5 text-[12px] font-medium text-success"
        >
          <IconCheck size={14} />
          {t("settings.connected")}
        </button>
      ) : (
        <button
          type="button"
          onClick={onConnect}
          className="tap h-9 rounded-lg bg-ink px-4 text-[12px] font-semibold text-canvas"
        >
          {t("settings.connect")}
        </button>
      )}
    </div>
  );
}

/** Spotify의 조밀한 필 버튼 스페이싱(8px 16px)을 가져온 세그먼트 토글 — 테마/언어 공용 */
function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex gap-1 bg-cloud p-1" style={{ borderRadius: "var(--radius-panel)" }}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
            className={`tap flex-1 px-3 py-2 text-[13px] font-medium transition-colors ${
              active ? "bg-ink text-canvas" : "text-mute"
            }`}
            style={{ borderRadius: "var(--radius-panel)" }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 표준 iOS 스타일 스위치. 트랙 전체가 아니라 손잡이(thumb)만 살짝
 * 눌리게 해 슬라이드 제스처처럼 보이게 한다 — .tap의 축소+페이드를
 * 트랙에 그대로 걸면 스위치 전체가 찌그러지듯 보여서 뺐다.
 */
function ToggleRow({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-hairline-soft px-6 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium text-ink">{label}</p>
        <p className="type-caption mt-1 text-[12px] text-mute">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${
          checked ? "bg-primary" : "bg-hairline"
        }`}
      >
        {/* left-0을 명시해야 translate의 기준점이 확정된다 — 없으면 빈 요소의
            "정적 위치"를 브라우저가 임의로 계산해서(대략 중앙 부근) 켜짐/꺼짐
            위치가 뒤죽박죽으로 보이는 버그가 났었다. */}
        <span
          className={`absolute left-0 top-1 size-5 rounded-full bg-canvas shadow-sm transition-transform duration-200 ease-out ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
