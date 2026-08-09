"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { devices, formatDuration, type Track } from "@/lib/data";
import { PageHeader, Difficulty, PillButton } from "@/components/ui";
import {
  IconSpotify,
  IconCheck,
  IconPlay,
  IconSearch,
  IconHeart,
} from "@/components/icons";
import { useSpotify } from "@/lib/spotify/useSpotify";
import { useTrackSource } from "@/lib/spotify/useTrackSource";
import { fetchTracksByIds } from "@/lib/spotify/api";
import { MOODS } from "@/lib/spotify/moods";
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  DIFFICULTY_OPTIONS,
  DURATION_OPTIONS,
  YEAR_OPTIONS,
  type Filters,
} from "@/lib/spotify/filters";
import TrackFilterSheet from "@/components/TrackFilterSheet";
import TrackDetailView from "@/components/TrackDetailView";
import { useLocale } from "@/lib/i18n/useLocale";
import { useFavorites } from "@/lib/favorites/useFavorites";

export default function PlayPage() {
  const router = useRouter();
  const { t } = useLocale();
  const spotify = useSpotify();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  // 같은 조건에서 다른 곡을 뽑기 위한 오프셋 — "다른 곡 보기"가 이걸 올린다
  const [shuffle, setShuffle] = useState(0);

  const typed = query.trim();
  // 검색어를 치면 자동으로 검색 소스로 전환한다 — 사용자가 필터를 먼저
  // 열어 소스를 바꿔야 검색이 되는 건 말이 안 된다.
  const effectiveFilters: Filters = typed ? { ...filters, source: "search" } : filters;

  // id가 아니라 트랙 객체 자체를 들고 있는다 — 검색 결과에서 고른 곡은
  // 목록에 없어서, id로 목록을 다시 훑으면 선택이 사라진다.
  const [selected, setSelected] = useState<Track | null>(null);
  // 목록에서 탭한 곡 — 전체화면 상세 뷰에 띄운다
  const [previewTrack, setPreviewTrack] = useState<Track | null>(null);
  const {
    favorites,
    tracks: favoriteTracks,
    pendingIds,
    toggleFavorite,
    adoptTracks,
  } = useFavorites();

  const source = useTrackSource(
    effectiveFilters,
    typed,
    spotify.connected,
    shuffle,
    favoriteTracks,
  );

  // 칩 줄에서 "지금 골라진 장르" — 검색어를 치는 중엔 장르 선택이 무의미하다
  const pickedGenre = typed ? null : filters.genre;

  // 구버전(id만 저장)으로 남은 즐겨찾기를 한 번에 복구한다 —
  // 하트만 켜져 있고 목록엔 안 나오는 상태를 없앤다.
  useEffect(() => {
    if (!spotify.connected || pendingIds.length === 0) return;
    let cancelled = false;
    fetchTracksByIds(pendingIds)
      .then((list) => {
        if (!cancelled) adoptTracks(list);
      })
      .catch(() => {
        // 복구 실패해도 하트 표시는 유지된다 — 다음 진입 때 다시 시도
      });
    return () => {
      cancelled = true;
    };
  }, [spotify.connected, pendingIds, adoptTracks]);

  const list = spotify.connected ? source.tracks : [];
  const filterCount = activeFilterCount(effectiveFilters);
  // 검색 소스인데 검색어도 장르도 없으면 뭘 보여줄지 정할 수 없다
  const needsQuery =
    effectiveFilters.source === "search" && !typed && !effectiveFilters.genre;

  // 아직 아무것도 안 골랐으면 목록 첫 곡을 기본값으로. 분석 성공 여부와
  // 무관하게 무엇이든 고를 수 있어야 한다 — Spotify가 실제 BPM을 안 줘서
  // 전부 "추정 템포"일 수 있는데, 그렇다고 곡을 못 고르게 하면 안 된다.
  // 이펙트로 setState하는 대신 파생값으로 계산해 불필요한 리렌더를 피한다.
  const display = selected ?? list[0] ?? null;

  const xr = devices.find((d) => d.kind === "xr")!;

  /** 곡 정보를 들고 풀스크린 XR 랠리 화면으로 이동 */
  function startTrack(track: Track) {
    // 실제 분석(BPM)이 없으면 추정 템포로 진행 — 게임 자체는 막지 않는다
    const q = new URLSearchParams({
      track: track.id,
      title: track.title,
      artist: track.artist,
      bpm: String(track.bpm || 110),
      duration: String(track.duration),
      hits: track.hits.join(","),
    });
    router.push(`/rally?${q}`);
  }

  function start() {
    if (display) startTrack(display);
  }

  return (
    <div className="pb-6">
      <PageHeader
        eyebrow={t("play.eyebrow")}
        title={t("play.title")}
        desc={t("play.desc")}
      />

      {/* 연동 상태 카드는 없앴다 — 연동 전에는 아래 EmptyConnectState가,
          연동 후에는 곡 목록이 그 자리를 대신한다. 해제는 설정에서 한다. */}
      {spotify.error && (
        <p className="type-caption px-6 text-[12px] text-primary">{spotify.error}</p>
      )}

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

      {/* 필터 + 장르 빠른 선택 */}
      {spotify.connected && (
        <section className="mt-4">
          {/* 장르를 하나 고르면 나머지는 접히고 고른 것만 왼쪽에 ✕와 함께 남는다.
              ✕(=칩 자체)를 다시 누르면 도로 전부 펼쳐진다. */}
          <div className="rail flex gap-2 overflow-x-auto px-6 pb-1">
            <Chip active={filterCount > 0} onClick={() => setFilterOpen(true)}>
              {t("play.filter.open")}
              {filterCount > 0 && ` · ${filterCount}`}
            </Chip>
            <span className="my-1 w-px shrink-0 bg-hairline" />
            <Chip
              active={pickedGenre === null}
              collapsed={pickedGenre !== null}
              disabled={!!typed}
              onClick={() => {
                setFilters((f) => ({ ...f, source: "top_short", genre: null }));
                setShuffle(0);
              }}
            >
              {t("play.mood.mine")}
            </Chip>
            {MOODS.map((m) => {
              const picked = pickedGenre === m.id;
              return (
                <Chip
                  key={m.id}
                  active={picked}
                  clearable={picked}
                  collapsed={pickedGenre !== null && !picked}
                  disabled={!!typed}
                  onClick={() => {
                    setFilters((f) => ({
                      ...f,
                      source: picked ? "top_short" : "search",
                      genre: picked ? null : m.id,
                    }));
                    setShuffle(0);
                  }}
                >
                  {t(m.labelKey)}
                </Chip>
              );
            })}
          </div>

          {/* 장르를 고르면 그 장르를 좁히는 필터들이 아래로 펼쳐진다.
              항상 렌더하고 클래스만 토글해서 닫힐 때도 부드럽게 접힌다. */}
          <div className={`row-expand ${filters.genre && !typed ? "open" : ""}`}>
            <div>
              <div className="space-y-2.5 px-6 pt-3">
                <RefineRow label={t("play.filter.section.year")}>
                  {YEAR_OPTIONS.map((o, i) => (
                    <MiniChip
                      key={o.value}
                      index={i}
                      active={filters.year === o.value}
                      onClick={() => {
                        setFilters((f) => ({ ...f, year: o.value }));
                        setShuffle(0);
                      }}
                    >
                      {t(o.labelKey)}
                    </MiniChip>
                  ))}
                </RefineRow>

                <RefineRow label={t("play.filter.section.difficulty")}>
                  {DIFFICULTY_OPTIONS.map((o, i) => (
                    <MiniChip
                      key={o.value}
                      index={i}
                      active={filters.difficulty === o.value}
                      onClick={() => setFilters((f) => ({ ...f, difficulty: o.value }))}
                    >
                      {t(o.labelKey)}
                    </MiniChip>
                  ))}
                </RefineRow>

                <RefineRow label={t("play.filter.section.duration")}>
                  {DURATION_OPTIONS.map((o, i) => (
                    <MiniChip
                      key={o.value}
                      index={i}
                      active={filters.duration === o.value}
                      onClick={() => setFilters((f) => ({ ...f, duration: o.value }))}
                    >
                      {t(o.labelKey)}
                    </MiniChip>
                  ))}
                </RefineRow>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 목록 라벨 + 셔플 */}
      {spotify.connected && list.length > 0 && (
        <div className="mt-6 flex items-baseline justify-between gap-3 px-6">
          <p className="type-caption min-w-0 text-[12px] font-medium text-mute">
            {effectiveFilters.source === "search"
              ? t("play.mood.label", { count: list.length })
              : t("play.list.aiLabel")}
            {source.hiddenCount > 0 &&
              ` · ${t("play.filter.hidden", { count: source.hiddenCount })}`}
          </p>
          {effectiveFilters.source === "search" && !typed && (
            <button
              type="button"
              onClick={() => setShuffle((s) => s + 1)}
              className="tap shrink-0 text-[12px] font-medium text-primary underline underline-offset-4"
            >
              {t("play.mood.shuffle")}
            </button>
          )}
        </div>
      )}

      {/* 트랙 목록 */}
      {!spotify.connected ? (
        <EmptyConnectState onConnect={spotify.connect} />
      ) : needsQuery ? (
        <p className="type-caption px-6 py-10 text-center text-[13px] text-mute">
          {t("play.filter.needQuery")}
        </p>
      ) : source.error === "recent_scope" ? (
        <div className="px-6 py-10 text-center">
          <p className="type-caption text-[13px] text-mute">{t("play.filter.recentScope")}</p>
          <button
            type="button"
            onClick={spotify.connect}
            className="tap mt-4 inline-flex h-11 items-center gap-2 rounded-lg bg-ink px-6 text-[14px] font-semibold text-canvas"
          >
            <IconSpotify size={16} />
            {t("play.empty.cta")}
          </button>
        </div>
      ) : source.loading && list.length === 0 ? (
        <div className="px-6 py-10 text-center">
          <span className="mx-auto block size-6 animate-spin rounded-full border-2 border-hairline border-t-primary" />
          <p className="type-caption mt-3 text-[13px] text-mute">{t("play.list.loading")}</p>
        </div>
      ) : list.length === 0 ? (
        <p className="type-caption px-6 py-10 text-center text-[13px] text-mute">
          {source.hiddenCount > 0 ? t("play.filter.empty") : t("play.search.empty")}
        </p>
      ) : (
        // key로 리마운트시켜 필터가 바뀔 때마다 목록이 다시 떠오르게 한다 —
        // 결과가 갱신됐다는 걸 눈으로 확인할 수 있어야 한다
        <ul
          key={`${effectiveFilters.source}-${effectiveFilters.genre}-${effectiveFilters.year}-${effectiveFilters.difficulty}-${effectiveFilters.duration}-${shuffle}`}
          className="results-in stagger mt-2 border-t border-hairline-soft"
        >
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
                  {/* 이제 모든 곡이 템포/난이도를 갖는다(실측이 막혀 추정값이지만) —
                      난이도 막대는 항상 보여주고, 추정이라는 사실만 라벨로 붙인다 */}
                  <span className="mt-2 flex items-center gap-2">
                    <Difficulty level={track.difficulty} />
                    <span className="text-[11px] font-medium text-stone">
                      {track.bpm} BPM
                      {!track.analyzed && ` · ${t("play.track.noAnalysis")}`}
                    </span>
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

      {/* 곡을 고르면 하단 시트가 아니라 전체화면 상세가 열린다 —
          "이 곡이 어떤 랠리가 되는지"를 제대로 설명할 자리가 필요했다 */}
      {previewTrack && (
        <TrackDetailView
          track={previewTrack}
          favorited={favorites.has(previewTrack.id)}
          onToggleFavorite={() => toggleFavorite(previewTrack)}
          onStart={() => {
            setSelected(previewTrack);
            startTrack(previewTrack);
          }}
          onClose={() => setPreviewTrack(null)}
        />
      )}

      {filterOpen && (
        <TrackFilterSheet
          filters={filters}
          onChange={(next) => {
            setFilters(next);
            setShuffle(0);
          }}
          onClose={() => setFilterOpen(false)}
          resultCount={list.length}
          loading={source.loading}
        />
      )}
    </div>
  );
}

/**
 * 장르 선택 칩.
 * collapsed면 폭이 0으로 줄며 자리를 비우고(사라지는 게 아니라 접히는 것),
 * clearable이면 오른쪽에 ✕가 벌어지며 붙어 "다시 누르면 해제"를 알린다.
 */
function Chip({
  children,
  active,
  disabled,
  collapsed,
  clearable,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  disabled?: boolean;
  collapsed?: boolean;
  clearable?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`chip chip-collapsible h-9 shrink-0 rounded-lg px-4 text-[13px] font-medium disabled:opacity-40 ${
        collapsed ? "collapsed" : ""
      } ${active ? "bg-ink text-canvas" : "border border-hairline bg-canvas text-ink"}`}
    >
      {children}
      <span className={`chip-x ${clearable ? "show" : ""}`} aria-hidden>
        ✕
      </span>
    </button>
  );
}

/** 펼쳐진 세부 필터의 한 분류 — 라벨 + 칩 줄 */
function RefineRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="type-caption w-14 shrink-0 text-[11px] font-medium text-stone">
        {label}
      </span>
      <div className="rail flex min-w-0 flex-1 gap-1.5 overflow-x-auto">{children}</div>
    </div>
  );
}

/** 세부 필터 칩 — index만큼 늦게 등장해 왼쪽부터 차례로 밀려 나온다 */
function MiniChip({
  children,
  active,
  index,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  index: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`chip chip-push h-7 shrink-0 rounded-lg px-3 text-[12px] font-medium ${
        active ? "bg-primary text-on-primary" : "bg-cloud text-mute"
      }`}
      style={{ animationDelay: `${index * 55}ms` }}
    >
      {children}
    </button>
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
