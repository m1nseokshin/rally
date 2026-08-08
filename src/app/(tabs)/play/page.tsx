"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { devices, formatDuration, type Track } from "@/lib/data";
import { PageHeader, Difficulty, PillButton } from "@/components/ui";
import {
  IconSpotify,
  IconCheck,
  IconPlay,
  IconWave,
  IconSearch,
  IconHeart,
} from "@/components/icons";
import { useSpotify } from "@/lib/spotify/useSpotify";
import { useSpotifySearch } from "@/lib/spotify/useSpotifySearch";
import { useLocale } from "@/lib/i18n/useLocale";
import { useFavorites } from "@/lib/favorites/useFavorites";

const PREVIEW_MS = 20_000;

export default function PlayPage() {
  const router = useRouter();
  const { t } = useLocale();
  const spotify = useSpotify();
  const [query, setQuery] = useState("");
  const search = useSpotifySearch(query, spotify.connected);
  // id가 아니라 트랙 객체 자체를 들고 있는다 — 검색 결과에서 고른 곡은
  // top tracks 목록에 없어서, id로 목록을 다시 훑으면 선택이 사라진다.
  const [selected, setSelected] = useState<Track | null>(null);
  // 목록에서 탭한 곡 — 확정 전 미리듣기 시트에 띄운다
  const [previewTrack, setPreviewTrack] = useState<Track | null>(null);
  const { favorites, toggleFavorite } = useFavorites();

  const searching = query.trim().length > 0;
  const list = searching ? search.results : spotify.connected ? spotify.tracks : [];

  // top tracks가 막 로드됐고 아직 아무것도 안 골랐으면 첫 곡을 기본값으로.
  // 분석 성공 여부와 무관하게 무엇이든 고를 수 있어야 한다 — Spotify의
  // audio-features가 막혀 있는 계정/앱이면 전체가 "분석 대기 중"일 수 있는데,
  // 그렇다고 곡을 아예 못 고르게 하면 안 된다.
  // 이펙트로 setState하는 대신 파생값으로 계산해 불필요한 리렌더를 피한다.
  const display = selected ?? (!searching ? spotify.tracks[0] : null) ?? null;

  const xr = devices.find((d) => d.kind === "xr")!;

  /** 선택한 곡 정보를 들고 풀스크린 XR 랠리 화면으로 이동 */
  function start() {
    if (!display) return;
    // 실제 분석(BPM)이 없으면 기본 템포로 진행 — 게임 자체는 막지 않는다
    const q = new URLSearchParams({
      track: display.id,
      title: display.title,
      artist: display.artist,
      bpm: String(display.bpm || 110),
      duration: String(display.duration),
      hits: display.hits.join(","),
    });
    router.push(`/rally?${q}`);
  }

  return (
    <div className="pb-6">
      <PageHeader
        eyebrow={t("play.eyebrow")}
        title={t("play.title")}
        desc={t("play.desc")}
      />

      {/* 연동 상태 */}
      <section className="px-6">
        <SpotifyCard
          connected={spotify.connected}
          loading={spotify.loading}
          name={spotify.profileName}
          onConnect={spotify.connect}
          onDisconnect={spotify.disconnect}
        />
        {spotify.error && (
          <p className="type-caption mt-2 text-[12px] text-primary">{spotify.error}</p>
        )}
      </section>

      {/* 검색 */}
      {spotify.connected && (
        <section className="mt-5 px-6">
          <label
            className="flex h-11 items-center gap-2 bg-cloud px-4"
            style={{ borderRadius: "var(--radius-input)" }}
          >
            <IconSearch size={16} className="text-stone" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("play.search.placeholder")}
              className="h-full flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-stone"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="type-caption text-[12px] font-medium text-mute"
              >
                {t("play.search.clear")}
              </button>
            )}
          </label>
        </section>
      )}

      {/* 목록 라벨 */}
      {spotify.connected && !searching && list.length > 0 && (
        <p className="type-caption mt-6 px-6 text-[12px] font-medium text-mute">
          {t("play.list.aiLabel")}
        </p>
      )}

      {/* 트랙 목록 */}
      {!spotify.connected ? (
        <EmptyConnectState onConnect={spotify.connect} />
      ) : searching && search.loading && list.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <span className="mx-auto block size-6 animate-spin rounded-full border-2 border-hairline border-t-primary" />
          <p className="type-caption mt-3 text-[13px] text-mute">{t("play.search.loading")}</p>
        </div>
      ) : searching && list.length === 0 ? (
        <p className="type-caption px-6 py-10 text-center text-[13px] text-mute">
          {t("play.search.empty")}
        </p>
      ) : !searching && spotify.loading && list.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <span className="mx-auto block size-6 animate-spin rounded-full border-2 border-hairline border-t-primary" />
          <p className="type-caption mt-3 text-[13px] text-mute">{t("play.list.loading")}</p>
        </div>
      ) : (
        <ul className="mt-2 border-t border-hairline-soft">
          {list.map((track) => (
            <li key={track.id}>
              <button
                type="button"
                onClick={() => setPreviewTrack(track)}
                className="tap flex w-full items-center gap-4 border-b border-hairline-soft px-6 py-4 text-left"
              >
                <TrackCover track={track} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-ink">
                    {track.title}
                  </span>
                  <span className="block truncate text-[13px] text-mute">
                    {track.artist} · {formatDuration(track.duration)}
                  </span>
                  <span className="mt-2 flex items-center gap-2">
                    {track.analyzed ? (
                      <>
                        <Difficulty level={track.difficulty} />
                        <span className="text-[11px] font-medium text-stone">
                          {track.bpm} BPM
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] font-medium text-stone">
                        {t("play.track.noAnalysis")}
                      </span>
                    )}
                  </span>
                </span>
                {favorites.has(track.id) && (
                  <IconHeart size={16} filled className="shrink-0 text-primary" />
                )}
                {display?.id === track.id && (
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
                    <IconCheck size={14} />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 분석 결과 */}
      {display && (
        <section className="mt-9 px-6">
          <div className="mb-3 flex items-center gap-2">
            <IconWave size={17} className="text-primary" />
            <h2 className="text-[16px] font-semibold text-ink">{t("play.analysis.title")}</h2>
          </div>

          {/* 항상 어두운 분석 패널 — 다크모드 토큰과 무관하게 리터럴 black/white */}
          <div className="bg-black p-5" style={{ borderRadius: "var(--radius-panel)" }}>
            <p className="type-eyebrow text-[12px] font-medium uppercase text-primary">
              {display.analyzed
                ? t("play.analysis.rallyPoints", { count: display.hits.length })
                : t("play.analysis.defaultRhythm")}
            </p>
            <h3 className="type-display mt-2 text-[30px] text-white">{display.title}</h3>

            {display.analyzed ? (
              <>
                {/* 파형 + 히트 마커 */}
                <div className="relative mt-6 h-24">
                  <div className="flex h-full items-center gap-[2px]">
                    {Array.from({ length: 46 }, (_, i) => {
                      const pos = i / 45;
                      const near = display.hits.some((h) => Math.abs(h - pos) < 0.018);
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

                <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/15 pt-4">
                  <Metric label={t("play.metric.bpm")} value={String(display.bpm)} />
                  <Metric
                    label={t("play.metric.difficulty")}
                    value={`${display.difficulty} / 5`}
                  />
                  <Metric
                    label={t("play.metric.length")}
                    value={formatDuration(display.duration)}
                  />
                </div>
              </>
            ) : (
              <>
                <p className="type-caption mt-3 text-[13px] leading-relaxed text-white/50">
                  {t("play.analysis.noAnalysisDesc")}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/15 pt-4">
                  <Metric label={t("play.metric.bpm")} value={t("play.metric.bpmDefault")} />
                  <Metric
                    label={t("play.metric.length")}
                    value={formatDuration(display.duration)}
                  />
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* XR 전송 */}
      <section className="mt-8 px-6">
        <div className="flex items-center justify-between border-y border-hairline-soft py-4">
          <div>
            <p className="text-[14px] font-semibold text-ink">{xr.name}</p>
            <p className="text-[12px] text-mute">
              {xr.model} · 배터리 {xr.battery}%
            </p>
          </div>
          <span className="flex items-center gap-2 text-[12px] font-medium text-success">
            <span className="size-1.5 rounded-full bg-success-bright" />
            {t("play.transfer.ready")}
          </span>
        </div>

        <div className="mt-5">
          <PillButton full variant="brand" onClick={start}>
            <span className="inline-flex items-center gap-2">
              <IconPlay size={15} />
              {t("play.start")}
            </span>
          </PillButton>
          {!display && (
            <p className="type-caption mt-3 text-center text-[12px] text-mute">
              {t("play.start.needTrack")}
            </p>
          )}
        </div>
      </section>

      {previewTrack && (
        <TrackPreviewSheet
          track={previewTrack}
          favorited={favorites.has(previewTrack.id)}
          onToggleFavorite={() => toggleFavorite(previewTrack.id)}
          onConfirm={() => {
            setSelected(previewTrack);
            setPreviewTrack(null);
          }}
          onClose={() => setPreviewTrack(null)}
        />
      )}
    </div>
  );
}

/**
 * 곡을 탭하면 뜨는 하단 시트 — 20초 하이라이트를 미리 들어보고
 * "이 노래로 선택하기"로 확정하거나 즐겨찾기만 해둔다.
 * 패널은 Spotify 박스 레이아웃(8px 라운드·강한 그림자)을 가져와 만들었다.
 */
function TrackPreviewSheet({
  track,
  favorited,
  onToggleFavorite,
  onConfirm,
  onClose,
}: {
  track: Track;
  favorited: boolean;
  onToggleFavorite: () => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

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

  return (
    <div className="scrim-in fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        className="sheet-in relative w-full max-w-[402px] bg-canvas p-4 pb-6"
        style={{
          borderTopLeftRadius: "var(--radius-panel)",
          borderTopRightRadius: "var(--radius-panel)",
          boxShadow: "var(--shadow-elevated)",
        }}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-hairline" />

        <div className="flex items-center gap-3">
          <TrackCover track={track} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-ink">{track.title}</p>
            <p className="truncate text-[13px] text-mute">{track.artist}</p>
          </div>
        </div>

        {track.previewUrl ? (
          <div className="mt-4">
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
          <p className="type-caption mt-4 text-[12px] text-mute">
            {t("play.preview.unavailable")}
          </p>
        )}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={favorited}
            className={`tap flex h-12 items-center justify-center gap-2 rounded-lg px-5 text-[14px] font-semibold ${
              favorited ? "bg-primary text-on-primary" : "bg-cloud text-ink"
            }`}
          >
            <IconHeart size={16} filled={favorited} />
            {t("play.preview.favorite")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="tap flex h-12 flex-1 items-center justify-center rounded-lg bg-ink text-[14px] font-semibold text-canvas"
          >
            {t("play.preview.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

// 앨범 아트 — Spotify 박스 스케일의 "card"(6px) 적용
function TrackCover({ track }: { track: Track }) {
  if (track.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 외부 앨범 아트, 도메인 다양해 next/image 설정 불필요
      <img
        src={track.image}
        alt=""
        className="size-14 shrink-0 object-cover"
        style={{ borderRadius: "var(--radius-card)" }}
      />
    );
  }
  return (
    <span
      className="size-14 shrink-0"
      style={{
        borderRadius: "var(--radius-card)",
        background: `linear-gradient(150deg, ${track.cover[0]} 0%, ${track.cover[1]} 100%)`,
      }}
    />
  );
}

// 이 컴포넌트는 위 항상-어두운 패널 안에서만 쓰인다 — 그래서 텍스트도
// 테마 토큰이 아니라 리터럴 white를 쓴다.
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-white/50">{label}</p>
      <p className="mt-1 text-[15px] font-semibold text-white tabular-nums">{value}</p>
    </div>
  );
}

function EmptyConnectState({ onConnect }: { onConnect: () => void }) {
  const { t } = useLocale();
  return (
    <div className="px-6 py-10 text-center">
      <p className="text-[15px] font-semibold text-ink">{t("play.empty.title")}</p>
      <p className="type-caption mt-2 text-[13px] text-mute">{t("play.empty.desc")}</p>
      <button
        type="button"
        onClick={onConnect}
        className="tap mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-ink px-6 text-[14px] font-semibold text-canvas"
      >
        <IconSpotify size={16} />
        {t("play.empty.cta")}
      </button>
    </div>
  );
}

function SpotifyCard({
  connected,
  loading,
  name,
  onConnect,
  onDisconnect,
}: {
  connected: boolean;
  loading: boolean;
  name: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const { t } = useLocale();
  return (
    <button
      type="button"
      onClick={connected ? onDisconnect : onConnect}
      className="tap flex w-full items-center gap-3 bg-cloud px-4 py-4 text-left"
      style={{ borderRadius: "var(--radius-card)" }}
    >
      <IconSpotify size={22} className="text-ink" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink">Spotify</p>
        <p className="truncate text-[11px] font-medium text-success">
          {loading
            ? t("play.spotify.connecting")
            : connected
              ? (name ?? t("play.spotify.connected"))
              : t("play.spotify.tapToConnect")}
        </p>
      </div>
    </button>
  );
}
