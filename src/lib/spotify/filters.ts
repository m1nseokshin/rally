import type { Track } from "@/lib/data";
import type { DictKey } from "@/lib/i18n/dictionary";
import { MOODS } from "./moods";

/**
 * 곡 필터.
 *
 * 두 갈래로 나뉜다:
 *  - **서버 필터**(source/genre/year/tag) — Spotify 요청 자체를 바꾼다.
 *    검색 풀 전체에서 걸러지니 결과가 풍부하다.
 *  - **클라이언트 필터**(difficulty/duration) — 받아온 50곡에 적용한다.
 *    난이도는 우리가 곡 id에서 추정한 값이고 Spotify엔 그런 개념이 없어서
 *    애초에 서버로 넘길 수가 없다. 길이도 검색 문법에 없다.
 *
 * 그래서 클라이언트 필터를 세게 걸면 50곡 중 몇 곡만 남을 수 있다 —
 * UI에서 걸러진 개수를 같이 보여줘 사용자가 이유를 알게 한다.
 */
export type TrackSource =
  | "top_short"
  | "top_medium"
  | "top_long"
  | "saved"
  | "recent"
  | "favorites"
  | "search";

export type YearFilter = "all" | "new" | "2020s" | "2010s" | "2000s" | "1990s";
export type DifficultyFilter = "all" | "easy" | "normal" | "hard";
export type DurationFilter = "all" | "short" | "mid" | "long";

export type Filters = {
  source: TrackSource;
  /** MOODS의 id. source가 search일 때만 의미가 있다 */
  genre: string | null;
  year: YearFilter;
  difficulty: DifficultyFilter;
  duration: DurationFilter;
  /** 저평가된 곡만 — Spotify의 tag:hipster (인기도 하위 10%) */
  hipster: boolean;
};

export const DEFAULT_FILTERS: Filters = {
  source: "top_short",
  genre: null,
  year: "all",
  difficulty: "all",
  duration: "all",
  hipster: false,
};

export const SOURCE_OPTIONS: { value: TrackSource; labelKey: DictKey }[] = [
  { value: "top_short", labelKey: "play.filter.source.topShort" },
  { value: "top_medium", labelKey: "play.filter.source.topMedium" },
  { value: "top_long", labelKey: "play.filter.source.topLong" },
  { value: "favorites", labelKey: "play.filter.source.favorites" },
  { value: "saved", labelKey: "play.filter.source.saved" },
  { value: "recent", labelKey: "play.filter.source.recent" },
  { value: "search", labelKey: "play.filter.source.search" },
];

export const YEAR_OPTIONS: { value: YearFilter; labelKey: DictKey }[] = [
  { value: "all", labelKey: "play.filter.any" },
  { value: "new", labelKey: "play.filter.year.new" },
  { value: "2020s", labelKey: "play.filter.year.2020s" },
  { value: "2010s", labelKey: "play.filter.year.2010s" },
  { value: "2000s", labelKey: "play.filter.year.2000s" },
  { value: "1990s", labelKey: "play.filter.year.1990s" },
];

export const DIFFICULTY_OPTIONS: { value: DifficultyFilter; labelKey: DictKey }[] = [
  { value: "all", labelKey: "play.filter.any" },
  { value: "easy", labelKey: "play.filter.difficulty.easy" },
  { value: "normal", labelKey: "play.filter.difficulty.normal" },
  { value: "hard", labelKey: "play.filter.difficulty.hard" },
];

export const DURATION_OPTIONS: { value: DurationFilter; labelKey: DictKey }[] = [
  { value: "all", labelKey: "play.filter.any" },
  { value: "short", labelKey: "play.filter.duration.short" },
  { value: "mid", labelKey: "play.filter.duration.mid" },
  { value: "long", labelKey: "play.filter.duration.long" },
];

/** 연도 필터를 Spotify 검색 문법으로 — `year:` 는 범위도 받는다 */
function yearToken(year: YearFilter): string {
  switch (year) {
    case "2020s":
      return "year:2020-2029";
    case "2010s":
      return "year:2010-2019";
    case "2000s":
      return "year:2000-2009";
    case "1990s":
      return "year:1990-1999";
    case "new":
      return "tag:new"; // 최근 2주 내 발매
    default:
      return "";
  }
}

/**
 * 검색용 Spotify 쿼리를 만든다. 사용자가 직접 친 텍스트가 있으면 그게 본문이 되고,
 * 없으면 장르가 본문이 된다. 둘 다 없으면 빈 문자열 — 호출부가 검색을 건너뛴다.
 */
export function buildSearchQuery(filters: Filters, typed: string): string {
  const parts: string[] = [];
  const text = typed.trim();
  if (text) parts.push(text);
  else {
    const mood = MOODS.find((m) => m.id === filters.genre);
    if (mood) parts.push(mood.query);
  }
  // 검색어도 장르도 없으면 필터만으로는 검색이 성립하지 않는다
  if (parts.length === 0) return "";

  const y = yearToken(filters.year);
  if (y) parts.push(y);
  if (filters.hipster) parts.push("tag:hipster");
  return parts.join(" ");
}

function decadeOf(year: YearFilter): [number, number] | null {
  switch (year) {
    case "2020s":
      return [2020, 2029];
    case "2010s":
      return [2010, 2019];
    case "2000s":
      return [2000, 2009];
    case "1990s":
      return [1990, 1999];
    default:
      return null;
  }
}

/**
 * 받아온 목록에 클라이언트 필터를 적용한다.
 *
 * 연도는 검색일 땐 이미 서버에서 걸러졌지만, 내 취향/저장곡/최근재생은
 * 검색이 아니라 그쪽 엔드포인트에서 받아오므로 여기서 걸러야 한다.
 * 두 번 걸러도 결과는 같으니 그냥 항상 적용한다.
 */
export function applyClientFilters(tracks: Track[], filters: Filters): Track[] {
  const decade = decadeOf(filters.year);
  return tracks.filter((t) => {
    if (decade && t.year !== undefined && (t.year < decade[0] || t.year > decade[1])) {
      return false;
    }
    if (filters.difficulty !== "all") {
      // 추정 BPM 88~168이 난이도 1~5로 매핑된다 (대략 easy <118, hard >138)
      const d = t.difficulty;
      if (filters.difficulty === "easy" && d > 2) return false;
      if (filters.difficulty === "normal" && d !== 3) return false;
      if (filters.difficulty === "hard" && d < 4) return false;
    }
    if (filters.duration !== "all") {
      const s = t.duration;
      if (filters.duration === "short" && s >= 180) return false;
      if (filters.duration === "mid" && (s < 180 || s > 300)) return false;
      if (filters.duration === "long" && s <= 300) return false;
    }
    return true;
  });
}

/** 기본값에서 벗어난 필터 개수 — 칩에 배지로 표시한다 */
export function activeFilterCount(f: Filters): number {
  let n = 0;
  if (f.source !== DEFAULT_FILTERS.source) n++;
  if (f.genre) n++;
  if (f.year !== "all") n++;
  if (f.difficulty !== "all") n++;
  if (f.duration !== "all") n++;
  if (f.hipster) n++;
  return n;
}
