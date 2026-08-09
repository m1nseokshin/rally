"use client";

import { useRef, useState } from "react";
import { devices } from "@/lib/data";
import { PageHeader, Row, SectionTitle, StatTile } from "@/components/ui";
import { IconBack, IconCamera, IconDevice, IconPaddle } from "@/components/icons";
import { useLocale } from "@/lib/i18n/useLocale";
import { useProfileName } from "@/lib/profile/useProfileName";
import { useDetailBack } from "@/lib/useDetailBack";
import { useProfileAvatar } from "@/lib/profile/useProfileAvatar";
import { useSessionLog } from "@/lib/sessions/useSessionLog";

export default function ProfilePage() {
  const { t } = useLocale();
  const { name, setName } = useProfileName();
  const { avatar, setAvatar } = useProfileAvatar();
  const { sessions: todaySessions } = useSessionLog();
  // 오른쪽으로 빠져나가는 연출을 재생한 뒤 실제로 뒤로 간다
  const goBack = useDetailBack("/settings");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = name ?? t("settings.account.profileValue");

  // 활동 요약 — todaySessions는 랠리 게임 결과가 실제로 쌓이는 스토어다
  // (실제 서비스라면 전체 기간 집계가 될 자리).
  const totalSessions = todaySessions.length;
  const totalMinutes = todaySessions.reduce((s, x) => s + x.minutes, 0);
  const maxCombo = todaySessions.length
    ? Math.max(...todaySessions.map((s) => s.maxCombo))
    : 0;
  const favoriteTrack = todaySessions.length
    ? todaySessions.reduce((a, b) => (b.minutes > a.minutes ? b : a))
    : null;
  const connectedDevices = devices.filter((d) => d.connected).length;

  function startEdit() {
    setDraft(displayName);
    setEditing(true);
  }

  function saveEdit() {
    setName(draft);
    setEditing(false);
  }

  function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    // 백엔드 업로드 서버가 없으니 파일을 data URL로 읽어 그대로 저장한다.
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="pb-10">
      <div className="flex items-center gap-2 px-6 pt-6">
        <button
          type="button"
          onClick={goBack}
          aria-label={t("common.back")}
          className="tap flex size-9 items-center justify-center rounded-full bg-cloud text-ink"
        >
          <IconBack size={16} />
        </button>
      </div>

      <PageHeader title={t("profile.pageTitle")} />

      {/* 아바타 + 이름 */}
      <section className="px-6">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL, next/image 최적화 대상 아님
              <img
                src={avatar}
                alt=""
                className="size-20 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-20 items-center justify-center rounded-full bg-ink text-[28px] font-semibold text-canvas">
                {displayName.slice(0, 1)}
              </span>
            )}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label={t("profile.avatar.change")}
              className="tap absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full bg-primary text-on-primary shadow-sm"
            >
              <IconCamera size={14} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFile}
              className="hidden"
            />
          </div>
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={t("profile.namePlaceholder")}
                  className="h-10 min-w-0 flex-1 bg-cloud px-3 text-[15px] text-ink outline-none"
                  style={{ borderRadius: "var(--radius-input)" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                    if (e.key === "Escape") setEditing(false);
                  }}
                />
                <button
                  type="button"
                  onClick={saveEdit}
                  className="tap h-10 shrink-0 rounded-lg bg-ink px-4 text-[13px] font-semibold text-canvas"
                >
                  {t("profile.save")}
                </button>
              </div>
            ) : (
              <button type="button" onClick={startEdit} className="tap text-left">
                <p className="truncate text-[20px] font-semibold text-ink">{displayName}</p>
                <p className="type-caption mt-0.5 text-[12px] text-primary underline underline-offset-4">
                  {t("profile.editName")}
                </p>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 활동 요약 */}
      <section className="mt-10">
        <SectionTitle>{t("profile.section.activity")}</SectionTitle>
        <div className="grid grid-cols-3 gap-2 px-6">
          <StatTile label={t("profile.stat.totalSessions")} value={totalSessions} unit="회" />
          <StatTile
            label={t("profile.stat.totalMinutes")}
            value={totalMinutes}
            unit="분"
            tone="primary"
          />
          <StatTile label={t("profile.stat.maxCombo")} value={maxCombo} unit="x" tone="success" />
        </div>
        {favoriteTrack && (
          <div className="mt-2 px-6">
            <div className="bg-cloud px-4 py-4" style={{ borderRadius: "var(--radius-card)" }}>
              <p className="text-[12px] font-medium text-mute">
                {t("profile.stat.favoriteTrack")}
              </p>
              <p className="mt-1 text-[15px] font-semibold text-ink">
                {favoriteTrack.trackTitle}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 기본 정보 */}
      <section className="mt-10">
        <SectionTitle>{t("profile.section.about")}</SectionTitle>
        <Row label={t("settings.account.email")} value="seungjunji01@gmail.com" />
        <Row label={t("settings.account.plan")} value={t("profile.plan")} />
        <Row label={t("profile.memberSince")} value={t("profile.memberSinceValue")} />
      </section>

      {/* 등록된 기기 */}
      <section className="mt-10">
        <SectionTitle>
          {t("profile.section.devices")} · {t("profile.devicesCount", { count: devices.length })}
        </SectionTitle>
        <div className="border-t border-hairline-soft">
          {devices.map((d) => (
            <div
              key={d.id}
              className="flex items-center gap-4 border-b border-hairline-soft px-6 py-4"
            >
              <span
                className={`flex size-10 items-center justify-center rounded-full ${
                  d.connected ? "bg-primary-soft text-primary" : "bg-cloud text-stone"
                }`}
              >
                {d.kind === "xr" ? <IconDevice size={18} /> : <IconPaddle size={18} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-ink">{d.name}</span>
                <span className="block text-[12px] text-mute">{d.model}</span>
              </span>
              <span
                className={`text-[11px] font-medium ${d.connected ? "text-success" : "text-stone"}`}
              >
                {d.connected ? t("settings.connected") : "—"}
              </span>
            </div>
          ))}
        </div>
        <p className="type-caption mt-2 px-6 text-[11px] text-mute">
          {t("devices.eyebrow", { count: connectedDevices })}
        </p>
      </section>
    </div>
  );
}
