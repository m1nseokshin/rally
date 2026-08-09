"use client";

import { useEffect, useRef, useState } from "react";
import { formatDuration, type Track } from "@/lib/data";
import { Difficulty } from "@/components/ui";
import { IconBack, IconHeart, IconPlay } from "@/components/icons";
import { useLocale } from "@/lib/i18n/useLocale";

const PREVIEW_MS = 20_000;

/**
 * 곡을 고르면 열리는 전체화면 상세 — 하단 시트로는 담기 힘든
 * "이 곡으로 어떻게 플레이되는지"를 제대로 설명하는 자리다.
 * 폰 프레임 안을 꽉 채우도록 absolute inset-0으로 덮는다.
 */
export default function TrackDetailView({
  track,
  favorited,
  onToggleFavorite,
  onStart,
  onClose,
}: {
  track: Track;
  favorited: boolean;
  onToggleFavorite: () => void;
  onStart: () => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  // 라우트가 아니라 오버레이라 언마운트 시점을 우리가 쥐고 있다 —
  // 닫기를 누르면 바로 없애지 않고 나가는 애니메이션을 재생한 뒤 없앤다.
  const [closing, setClosing] = useState(false);

  function handleClose() {
    setClosing(true);
    setTimeout(onClose, 500); // .detail-out 길이와 맞춘다
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !track.previewUrl) return;

    audio.currentTime = 0;
    audio
      .play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));

    const startedAt = performance.now();
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - startedAt;
      setProgress(Math.min(1, elapsed / PREVIEW_MS));
      if (elapsed < PREVIEW_MS) {
        raf = requestAnimationFrame(tick);
      } else {
        audio.pause();
        setPlaying(false);
      }
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      audio.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- track.id가 바뀔 때만 재생을 다시 시작하면 된다
  }, [track.id]);

  // 이 곡의 랠리가 어떤 느낌일지 — 추정 템포에서 바로 나오는 설명
  const pace =
    track.bpm >= 140
      ? t("detail.pace.fast")
      : track.bpm >= 115
        ? t("detail.pace.mid")
        : t("detail.pace.slow");

  return (
    <div
      className={`absolute inset-0 z-40 flex flex-col bg-canvas ${
        closing ? "detail-out" : "detail-in"
      }`}
    >
      {/* 상단 커버 */}
      <div className="relative shrink-0">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-black">
          {track.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- 외부 앨범 아트
            <img
              src={track.image}
              alt=""
              className="absolute inset-0 size-full object-cover opacity-80"
            />
          ) : (
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(150deg, ${track.cover[0]} 0%, ${track.cover[1]} 100%)`,
              }}
            />
          )}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/70 to-transparent" />

          <button
            type="button"
            onClick={handleClose}
            aria-label={t("common.back")}
            className="tap absolute left-4 top-4 flex size-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
          >
            <IconBack size={18} />
          </button>

          <div className="absolute inset-x-0 bottom-0 p-5">
            <h1 className="type-display text-[32px] leading-[0.95] text-white">
              {track.title}
            </h1>
            <p className="mt-1.5 text-[13px] text-white/70">{track.artist}</p>
          </div>
        </div>
      </div>

      {/* 본문 */}
      <div className="rail stagger min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-5">
        {/* 20초 하이라이트 */}
        {track.previewUrl ? (
          <div>
            <div className="h-1 overflow-hidden rounded-full bg-hairline-soft">
              <span
                className="block h-full rounded-full bg-primary transition-[width] duration-100 ease-linear"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <p className="type-caption mt-2 text-[11px] text-mute">
              {playing ? t("play.preview.playing") : t("play.preview.loading")}
            </p>
            <audio ref={audioRef} src={track.previewUrl} preload="auto" />
          </div>
        ) : (
          <p className="type-caption text-[12px] text-mute">{t("play.preview.unavailable")}</p>
        )}

        {/* 수치 */}
        <div className="mt-5 grid grid-cols-3 gap-2">
          <Metric label={t("play.metric.bpm")} value={String(track.bpm)} />
          <Metric label={t("play.metric.difficulty")} value={`${track.difficulty} / 5`} />
          <Metric label={t("play.metric.length")} value={formatDuration(track.duration)} />
        </div>

        {/* 파형 */}
        <div className="mt-4 bg-black p-4" style={{ borderRadius: "var(--radius-panel)" }}>
          <p className="type-eyebrow text-[11px] font-medium uppercase text-primary">
            {t("play.analysis.rallyPoints", { count: track.hits.length })}
          </p>
          <div className="mt-3 flex h-16 items-center gap-[2px]">
            {Array.from({ length: 42 }, (_, i) => {
              const pos = i / 41;
              const near = track.hits.some((h) => Math.abs(h - pos) < 0.02);
              const height = near ? 100 : 22 + Math.abs(Math.sin(i * 1.7)) * 42;
              return (
                <span
                  key={i}
                  className={`flex-1 rounded-full ${near ? "bg-primary" : "bg-white/25"}`}
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>
        </div>

        {/* 이 곡은 어떤 랠리가 되나 */}
        <div className="mt-6">
          <h2 className="text-[15px] font-semibold text-ink">{t("detail.howTitle")}</h2>
          <ul className="mt-3 space-y-2.5">
            <Step>{t("detail.step.pace", { bpm: track.bpm, pace })}</Step>
            <Step>{t("detail.step.hand")}</Step>
            <Step>{t("detail.step.reach")}</Step>
            <Step>{t("detail.step.power")}</Step>
          </ul>
        </div>

        <div className="mt-5 flex items-center gap-2">
          <Difficulty level={track.difficulty} />
          <span className="type-caption text-[11px] text-mute">
            {t("detail.difficultyNote", { level: track.difficulty })}
          </span>
        </div>

        {!track.analyzed && (
          <p className="type-caption mt-4 text-[11px] leading-relaxed text-stone">
            {t("play.analysis.noAnalysisDesc")}
          </p>
        )}
      </div>

      {/* 하단 액션 */}
      <div className="shrink-0 border-t border-hairline-soft p-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={favorited}
            className={`tap flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg px-5 text-[14px] font-semibold ${
              favorited ? "bg-primary text-on-primary" : "bg-cloud text-ink"
            }`}
          >
            <IconHeart size={16} filled={favorited} />
            {t("play.preview.favorite")}
          </button>
          <button
            type="button"
            onClick={onStart}
            className="tap flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-ink text-[14px] font-semibold text-canvas"
          >
            <IconPlay size={15} />
            {t("play.start")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-cloud px-3 py-3" style={{ borderRadius: "var(--radius-card)" }}>
      <p className="text-[11px] font-medium text-mute">{label}</p>
      <p className="mt-1 text-[15px] font-semibold text-ink tabular-nums">{value}</p>
    </div>
  );
}

function Step({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5 text-[13px] leading-relaxed text-mute">
      <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary" />
      <span className="min-w-0">{children}</span>
    </li>
  );
}
