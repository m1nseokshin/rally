"use client";

import { useState } from "react";
import { focusCurve, weeklyFocus } from "@/lib/data";
import { PageHeader, SectionTitle, StatTile, LinkAction } from "@/components/ui";
import { useLocale } from "@/lib/i18n/useLocale";
import { useSessionLog } from "@/lib/sessions/useSessionLog";
import type { DictKey } from "@/lib/i18n/dictionary";

const DAY_KEYS: Record<string, DictKey> = {
  mon: "insights.day.mon",
  tue: "insights.day.tue",
  wed: "insights.day.wed",
  thu: "insights.day.thu",
  fri: "insights.day.fri",
  sat: "insights.day.sat",
  sun: "insights.day.sun",
};

export default function InsightsPage() {
  const { t } = useLocale();
  const { sessions: todaySessions } = useSessionLog();
  const [weekly, setWeekly] = useState(false);
  const totalMinutes = todaySessions.reduce((s, x) => s + x.minutes, 0);
  const avgFocus = todaySessions.length
    ? Math.round(todaySessions.reduce((s, x) => s + x.focus, 0) / todaySessions.length)
    : 0;
  const bestAccuracy = todaySessions.length
    ? Math.max(...todaySessions.map((s) => s.accuracy))
    : 0;
  const peak = focusCurve.reduce((a, b) => (b.focus > a.focus ? b : a));
  const worst = todaySessions.length
    ? todaySessions.reduce((a, b) => (b.focus < a.focus ? b : a))
    : { time: "-", focus: 0 };

  return (
    <div className="pb-8">
      <PageHeader
        eyebrow={t("insights.eyebrow")}
        title={t("insights.title")}
        desc={t("insights.desc")}
      />

      {/* 핵심 수치 */}
      <section className="grid grid-cols-3 gap-2 px-6">
        <StatTile label={t("insights.stat.totalPlay")} value={totalMinutes} unit="분" />
        <StatTile
          label={t("insights.stat.avgFocus")}
          value={avgFocus}
          unit="점"
          tone="primary"
        />
        <StatTile
          label={t("insights.stat.bestAccuracy")}
          value={bestAccuracy}
          unit="%"
          tone="success"
        />
      </section>

      {/* 시간대별/요일별 집중 곡선 — 토글로 전환 */}
      <section className="mt-10">
        <SectionTitle
          action={
            <LinkAction onClick={() => setWeekly((w) => !w)}>
              {weekly ? t("insights.chart.actionDaily") : t("insights.chart.action")}
            </LinkAction>
          }
        >
          {weekly ? t("insights.chart.titleWeekly") : t("insights.chart.title")}
        </SectionTitle>
        <div className="px-6">
          {/* 막대 — 부모에 고정 높이가 있어야 자식 %가 계산된다 */}
          {weekly ? (
            <>
              <div className="flex h-36 items-end gap-[5px]">
                {weeklyFocus.map(({ day, focus }) => {
                  const isPeak = focus === Math.max(...weeklyFocus.map((w) => w.focus));
                  return (
                    <span
                      key={day}
                      className={`flex-1 rounded-t-[3px] ${isPeak ? "bg-primary" : "bg-ink"}`}
                      style={{ height: `${Math.max(focus, 3)}%` }}
                    />
                  );
                })}
              </div>
              <div className="mt-2 flex gap-[5px]">
                {weeklyFocus.map(({ day }) => (
                  <span
                    key={day}
                    className="flex-1 text-center text-[9px] font-medium text-stone tabular-nums"
                  >
                    {t(DAY_KEYS[day])}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex h-36 items-end gap-[5px]">
                {focusCurve.map(({ hour, focus }) => (
                  <span
                    key={hour}
                    className={`flex-1 rounded-t-[3px] ${
                      focus === 0
                        ? "bg-hairline-soft"
                        : hour === peak.hour
                          ? "bg-primary"
                          : "bg-ink"
                    }`}
                    style={{ height: `${Math.max(focus, 3)}%` }}
                  />
                ))}
              </div>
              <div className="mt-2 flex gap-[5px]">
                {focusCurve.map(({ hour }) => (
                  <span
                    key={hour}
                    className="flex-1 text-center text-[9px] font-medium text-stone tabular-nums"
                  >
                    {hour}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* AI 인사이트 — 항상 어두운 패널. 리터럴 black/white로 다크모드와 무관하게 고정 */}
      <section className="mt-10 px-6">
        <div className="bg-black p-6" style={{ borderRadius: "var(--radius-panel)" }}>
          <p className="type-eyebrow text-[12px] font-medium uppercase text-primary">
            {t("insights.ai.eyebrow")}
          </p>
          <h2 className="type-display mt-2 whitespace-pre-line text-[32px] leading-[0.9] text-white">
            {t("insights.ai.title")}
          </h2>
          <p className="mt-4 text-[14px] leading-relaxed text-white/60">
            {t("insights.ai.body", {
              peakHour: peak.hour,
              peakFocus: peak.focus,
              worstTime: worst.time,
              worstFocus: worst.focus,
            })}
          </p>
          <ul className="mt-5 space-y-2.5 border-t border-white/15 pt-5">
            <Advice>{t("insights.advice.1")}</Advice>
            <Advice>{t("insights.advice.2")}</Advice>
            <Advice>{t("insights.advice.3")}</Advice>
          </ul>
        </div>
      </section>

      {/* 세션 로그 */}
      <section className="mt-10">
        <SectionTitle>{t("insights.session.title")}</SectionTitle>
        <ul className="border-t border-hairline-soft">
          {todaySessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-4 border-b border-hairline-soft px-6 py-4"
            >
              <span className="w-11 shrink-0 text-[13px] font-semibold text-mute tabular-nums">
                {s.time}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold text-ink">
                  {s.trackTitle}
                </span>
                <span className="block text-[12px] text-mute tabular-nums">
                  {t("insights.session.meta", {
                    minutes: s.minutes,
                    accuracy: s.accuracy,
                    combo: s.maxCombo,
                  })}
                </span>
              </span>
              <FocusBadge score={s.focus} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

// 항상 어두운 인사이트 패널 안에서만 쓰인다 — 리터럴 white
function Advice({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-[13px] leading-relaxed text-white">
      <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary" />
      {children}
    </li>
  );
}

function FocusBadge({ score }: { score: number }) {
  const { t } = useLocale();
  const tone =
    score >= 85 ? "text-primary" : score >= 70 ? "text-ink" : "text-stone";
  return (
    <span className="shrink-0 text-right">
      <span className={`type-display block text-[26px] ${tone}`}>{score}</span>
      <span className="block text-[10px] font-medium text-stone">
        {t("insights.session.focus")}
      </span>
    </span>
  );
}
