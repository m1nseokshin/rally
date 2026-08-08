"use client";

import Link from "next/link";
import { devices, tracks } from "@/lib/data";
import { Difficulty, SectionTitle, LinkAction, StatTile } from "@/components/ui";
import { IconChevron, IconPlay, IconDevice, IconPaddle } from "@/components/icons";
import ProfileMenu from "@/components/ProfileMenu";
import { useLocale } from "@/lib/i18n/useLocale";
import { useSessionLog } from "@/lib/sessions/useSessionLog";

export default function HomePage() {
  const { t } = useLocale();
  const { sessions: todaySessions } = useSessionLog();
  const totalMinutes = todaySessions.reduce((sum, s) => sum + s.minutes, 0);
  const avgFocus = todaySessions.length
    ? Math.round(todaySessions.reduce((sum, s) => sum + s.focus, 0) / todaySessions.length)
    : 0;
  const connected = devices.filter((d) => d.connected);
  const featured = tracks[1];
  const recommended = tracks.filter((t) => t.analyzed && t.id !== featured.id);

  return (
    <div className="pb-10">
      {/* 인사 */}
      {/* 상단 여백 — 뷰포트 높이에 비례하되 최대 30%를 넘지 않게 clamp */}
      <header
        className="flex items-start justify-between px-6 pb-6"
        style={{ paddingTop: "clamp(28px, 12dvh, 30dvh)" }}
      >
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-mute">{t("home.greeting")}</p>
          <h1 className="type-display mt-1 whitespace-pre-line text-[44px] text-ink">
            {t("home.title")}
          </h1>
        </div>
        <ProfileMenu />
      </header>

      {/* 히어로 — 오늘의 세션 */}
      <section className="px-6">
        {/* 사진 위에 얹히는 캠페인 타일 — Nike 패턴대로 라이트/다크 앱 테마와
            무관하게 항상 어둡다. bg-ink/text-canvas 같은 테마 토큰 대신
            리터럴 black/white를 쓴 이유가 그것 — 다크모드에서 토큰이 뒤집혀도
            이 카드는 그대로 검게 유지돼야 한다. */}
        <Link
          href="/play"
          className="tap relative block aspect-[4/5] w-full overflow-hidden bg-black"
          style={{ borderRadius: "var(--radius-panel)" }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(100% 70% at 15% 0%, ${featured.cover[0]}cc 0%, transparent 60%), linear-gradient(180deg, #262626 0%, #000 70%)`,
            }}
          />

          {/* 비트 그리드 — 상단 절반 */}
          <div className="absolute inset-x-6 top-[16%] flex h-28 items-end gap-[4px]">
            {featured.hits.map((h, i) => (
              <span
                key={i}
                className={`flex-1 rounded-full ${
                  i % 3 === 1 ? "bg-primary" : "bg-white/35"
                }`}
                style={{ height: `${24 + h * 72}%` }}
              />
            ))}
          </div>

          {/* 하단 가독성 그라디언트 */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/85 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-6">
            <p className="mb-2 type-eyebrow text-[12px] font-medium uppercase text-primary">
              {t("home.hero.eyebrow")}
            </p>
            <h2 className="type-display text-[40px] leading-[0.88] text-white">
              {featured.title}
            </h2>
            <p className="mt-2 text-[13px] text-white/60">
              {featured.artist} · {featured.bpm} BPM
            </p>
            <span className="tap mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-white px-6 text-[14px] font-semibold text-black">
              <IconPlay size={15} />
              {t("home.hero.cta")}
            </span>
          </div>
        </Link>
      </section>

      {/* 오늘 요약 */}
      <section className="mt-10">
        <SectionTitle action={<LinkAction href="/insights">{t("home.today.action")}</LinkAction>}>
          {t("home.today.title")}
        </SectionTitle>
        <div className="grid grid-cols-3 gap-2 px-6">
          <StatTile label={t("home.today.play")} value={totalMinutes} unit="분" />
          <StatTile
            label={t("home.today.avgFocus")}
            value={avgFocus}
            unit="점"
            tone="primary"
          />
          <StatTile label={t("home.today.sessions")} value={todaySessions.length} unit="회" />
        </div>
      </section>

      {/* 기기 상태 */}
      <section className="mt-10">
        <SectionTitle action={<LinkAction href="/devices">{t("home.devices.action")}</LinkAction>}>
          {t("home.devices.title")}
        </SectionTitle>
        <div className="border-t border-hairline-soft">
          {connected.map((d) => (
            <Link
              key={d.id}
              href="/devices"
              className="tap flex items-center gap-4 border-b border-hairline-soft px-6 py-4"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-cloud text-ink">
                {d.kind === "xr" ? <IconDevice size={20} /> : <IconPaddle size={20} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold text-ink">{d.name}</span>
                <span className="block text-[13px] text-mute">
                  {d.model} · 배터리 {d.battery}%
                </span>
              </span>
              <span className="flex items-center gap-2 text-[12px] font-medium text-success">
                <span className="size-1.5 rounded-full bg-success-bright" />
                {t("home.devices.connected")}
              </span>
              <IconChevron size={16} className="text-stone" />
            </Link>
          ))}
        </div>
      </section>

      {/* 분석 완료 트랙 레일 */}
      <section className="mt-10">
        <SectionTitle action={<LinkAction href="/play">{t("home.rail.action")}</LinkAction>}>
          {t("home.rail.title")}
        </SectionTitle>
        <div className="rail flex gap-3 overflow-x-auto px-6 pb-1">
          {recommended.map((track) => (
            <Link key={track.id} href="/play" className="tap w-[150px] shrink-0">
              <div
                className="aspect-square w-full"
                style={{
                  borderRadius: "var(--radius-card)",
                  background: `linear-gradient(150deg, ${track.cover[0]} 0%, ${track.cover[1]} 100%)`,
                }}
              />
              <p className="mt-2 truncate text-[14px] font-semibold text-ink">{track.title}</p>
              <p className="truncate text-[12px] text-mute">{track.artist}</p>
              <div className="mt-2 flex items-center gap-2">
                <Difficulty level={track.difficulty} />
                <span className="text-[11px] font-medium text-stone">{track.bpm} BPM</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
