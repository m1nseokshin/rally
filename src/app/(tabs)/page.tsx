"use client";

import Link from "next/link";
import { devices, tracks } from "@/lib/data";
import { products } from "@/lib/products";
import { BASE_PATH } from "@/lib/basePath";
import { SectionTitle, LinkAction, StatTile } from "@/components/ui";
import { IconChevron, IconPlay, IconDevice, IconPaddle, IconSpotify } from "@/components/icons";
import ProfileMenu from "@/components/ProfileMenu";
import { useLocale } from "@/lib/i18n/useLocale";
import { useSessionLog } from "@/lib/sessions/useSessionLog";
import { useSpotify } from "@/lib/spotify/useSpotify";

export default function HomePage() {
  const { t } = useLocale();
  const { sessions: todaySessions } = useSessionLog();
  const spotify = useSpotify();
  const totalMinutes = todaySessions.reduce((sum, s) => sum + s.minutes, 0);
  const avgFocus = todaySessions.length
    ? Math.round(todaySessions.reduce((sum, s) => sum + s.focus, 0) / todaySessions.length)
    : 0;
  const connected = devices.filter((d) => d.connected);

  // 연동돼 있으면 실제 내 Spotify 곡을, 아니면 목업으로 폴백한다 —
  // 연동 전에도 홈이 텅 비지 않아야 앱이 뭘 하는 곳인지 보인다.
  const source = spotify.connected && spotify.tracks.length > 0 ? spotify.tracks : tracks;
  const featured = source[0];

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

      {/* 히어로 — 연동돼 있으면 오늘의 추천 세션, 아니면 연동 유도.
          곡이 없는데 추천 세션을 띄우면 목업을 진짜처럼 보여주게 된다. */}
      <section className="px-6">
        {!spotify.connected ? (
          <Link
            href="/play"
            className="tap relative block aspect-[4/5] w-full overflow-hidden bg-black"
            style={{ borderRadius: "var(--radius-panel)" }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(100% 70% at 20% 0%, #1eaa52cc 0%, transparent 60%), linear-gradient(180deg, #1c1c1c 0%, #000 70%)",
              }}
            />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/85 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6">
              <p className="mb-2 type-eyebrow text-[12px] font-medium uppercase text-primary">
                {t("home.connect.eyebrow")}
              </p>
              <h2 className="type-display whitespace-pre-line text-[36px] leading-[0.95] text-white">
                {t("home.connect.title")}
              </h2>
              <p className="mt-3 text-[13px] leading-relaxed text-white/60">
                {t("home.connect.desc")}
              </p>
              <span className="tap mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-white px-6 text-[14px] font-semibold text-black">
                <IconSpotify size={16} />
                {t("home.connect.cta")}
              </span>
            </div>
          </Link>
        ) : (
        // 사진 위에 얹히는 캠페인 타일 — Nike 패턴대로 라이트/다크 앱 테마와
        // 무관하게 항상 어둡다. bg-ink/text-canvas 같은 테마 토큰 대신
        // 리터럴 black/white를 쓴 이유가 그것 — 다크모드에서 토큰이 뒤집혀도
        // 이 카드는 그대로 검게 유지돼야 한다.
        <Link
          href="/play"
          className="tap relative block aspect-[4/5] w-full overflow-hidden bg-black"
          style={{ borderRadius: "var(--radius-panel)" }}
        >
          {/* 실제 앨범 아트가 있으면 배경으로 깔고, 없으면 그라디언트로 폴백 */}
          {featured.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- 외부 앨범 아트, next/image 도메인 설정 불필요
            <img
              src={featured.image}
              alt=""
              className="absolute inset-0 size-full object-cover opacity-70"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `radial-gradient(100% 70% at 15% 0%, ${featured.cover[0]}cc 0%, transparent 60%), linear-gradient(180deg, #262626 0%, #000 70%)`,
              }}
            />
          )}

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
        )}
      </section>

      {/* 오늘 요약 */}
      <section className="mt-10">
        <SectionTitle action={<LinkAction href="/insights">{t("home.today.action")}</LinkAction>}>
          {t("home.today.title")}
        </SectionTitle>
        <div className="stagger grid grid-cols-3 gap-2 px-6">
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
        <div className="stagger border-t border-hairline-soft">
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

      {/* 제품 소개 — 뉴스룸형 상세로 들어간다 */}
      <section className="mt-10">
        <SectionTitle
          action={<LinkAction href="/product">{t("home.product.action")}</LinkAction>}
        >
          {t("home.product.title")}
        </SectionTitle>
        {/* snap-x — 손을 떼면 카드 하나에 딱 맞춰 멎는다. overflow-x-auto만으로도
            스크롤은 되지만, 카드 사이 어중간한 위치에서 멈추면 "스와이프"라기보다
            그냥 스크롤바처럼 느껴진다. scroll-pl-6으로 첫 카드가 섹션 여백에 맞춰
            정렬되게 했다. */}
        <div className="rail stagger flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-1 scroll-pl-6">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/product?id=${p.id}`}
              className="tap w-[230px] shrink-0 snap-start"
            >
              <div
                className="relative aspect-[4/3] w-full overflow-hidden bg-black"
                style={{ borderRadius: "var(--radius-card)" }}
              >
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element -- public/ 정적 이미지
                  <img
                    src={`${BASE_PATH}${p.image}`}
                    alt=""
                    className="absolute inset-0 size-full object-cover"
                  />
                ) : (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(150deg, ${p.cover[0]} 0%, ${p.cover[1]} 100%)`,
                    }}
                  />
                )}
              </div>
              <p className="type-eyebrow mt-2 text-[10px] font-medium uppercase text-primary">
                {t(p.eyebrowKey)}
              </p>
              <p className="mt-1 truncate text-[15px] font-semibold text-ink">
                {t(p.nameKey)}
              </p>
              <p className="truncate text-[12px] text-mute">{t(p.taglineKey)}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
