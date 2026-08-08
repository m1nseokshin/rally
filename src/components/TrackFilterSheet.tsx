"use client";

import { useLocale } from "@/lib/i18n/useLocale";
import { MOODS } from "@/lib/spotify/moods";
import {
  DEFAULT_FILTERS,
  DIFFICULTY_OPTIONS,
  DURATION_OPTIONS,
  SOURCE_OPTIONS,
  YEAR_OPTIONS,
  type Filters,
} from "@/lib/spotify/filters";

/**
 * 곡 필터 시트 — 아래에서 올라오는 바텀시트.
 * 값이 바뀔 때마다 즉시 반영해서(적용 버튼을 기다리지 않고) 결과가
 * 뒤에서 실시간으로 갱신되는 걸 보면서 조절할 수 있게 한다.
 */
export default function TrackFilterSheet({
  filters,
  onChange,
  onClose,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <div className="scrim-in fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label={t("play.filter.done")}
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        className="sheet-in relative flex max-h-[85dvh] w-full max-w-[402px] flex-col bg-canvas"
        style={{
          borderTopLeftRadius: "var(--radius-panel)",
          borderTopRightRadius: "var(--radius-panel)",
          boxShadow: "var(--shadow-elevated)",
        }}
      >
        <div className="shrink-0 px-4 pt-4">
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-hairline" />
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-[16px] font-semibold text-ink">{t("play.filter.title")}</p>
            <button
              type="button"
              onClick={() => onChange(DEFAULT_FILTERS)}
              className="tap text-[13px] font-medium text-mute underline underline-offset-4"
            >
              {t("play.filter.reset")}
            </button>
          </div>
        </div>

        <div className="rail min-h-0 flex-1 overflow-y-auto px-4 pb-2">
          <Section title={t("play.filter.section.source")}>
            {SOURCE_OPTIONS.map((o) => (
              <Pill
                key={o.value}
                active={filters.source === o.value}
                onClick={() => set({ source: o.value })}
              >
                {t(o.labelKey)}
              </Pill>
            ))}
          </Section>

          {/* 장르는 검색 소스에서만 의미가 있다 — 다른 소스는 Spotify가
              장르로 걸러주는 엔드포인트를 주지 않는다 */}
          {filters.source === "search" && (
            <Section title={t("play.filter.section.genre")}>
              <Pill active={!filters.genre} onClick={() => set({ genre: null })}>
                {t("play.filter.any")}
              </Pill>
              {MOODS.map((m) => (
                <Pill
                  key={m.id}
                  active={filters.genre === m.id}
                  onClick={() => set({ genre: filters.genre === m.id ? null : m.id })}
                >
                  {t(m.labelKey)}
                </Pill>
              ))}
            </Section>
          )}

          <Section title={t("play.filter.section.year")}>
            {YEAR_OPTIONS.map((o) => (
              <Pill
                key={o.value}
                active={filters.year === o.value}
                onClick={() => set({ year: o.value })}
              >
                {t(o.labelKey)}
              </Pill>
            ))}
          </Section>

          <Section title={t("play.filter.section.difficulty")}>
            {DIFFICULTY_OPTIONS.map((o) => (
              <Pill
                key={o.value}
                active={filters.difficulty === o.value}
                onClick={() => set({ difficulty: o.value })}
              >
                {t(o.labelKey)}
              </Pill>
            ))}
          </Section>

          <Section title={t("play.filter.section.duration")}>
            {DURATION_OPTIONS.map((o) => (
              <Pill
                key={o.value}
                active={filters.duration === o.value}
                onClick={() => set({ duration: o.value })}
              >
                {t(o.labelKey)}
              </Pill>
            ))}
          </Section>

          {filters.source === "search" && (
            <div className="mt-5 mb-2">
              <Pill active={filters.hipster} onClick={() => set({ hipster: !filters.hipster })}>
                {t("play.filter.hipster")}
              </Pill>
            </div>
          )}
        </div>

        <div className="shrink-0 p-4">
          <button
            type="button"
            onClick={onClose}
            className="tap h-12 w-full rounded-lg bg-ink text-[15px] font-semibold text-canvas"
          >
            {t("play.filter.done")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p className="type-caption mb-2 text-[12px] font-medium text-mute">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Pill({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`tap h-9 rounded-lg px-4 text-[13px] font-medium transition-colors ${
        active ? "bg-ink text-canvas" : "bg-cloud text-ink"
      }`}
    >
      {children}
    </button>
  );
}
