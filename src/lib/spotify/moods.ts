import type { DictKey } from "@/lib/i18n/dictionary";

/**
 * 무드별 선곡 프리셋.
 *
 * 원래 이런 건 Spotify /recommendations(seed_genres + target_energy/valence)로
 * 하는 게 정석인데, 그 엔드포인트는 2024년 11월부터 신규 앱에 403이다.
 * /audio-features도 막혀서 곡의 실제 에너지·분위기를 읽을 방법이 없다.
 *
 * 그래서 아직 살아 있는 /search의 `genre:` 필터로 근사한다. 정확히는
 * "곡의 분위기"가 아니라 "그 아티스트의 장르"로 거르는 것이라, 무드라기보단
 * 장르 선택에 가깝다 — 라벨도 그렇게 솔직하게 붙였다.
 *
 * `query`는 Spotify 검색 문법 그대로 들어간다.
 */
export type Mood = {
  id: string;
  labelKey: DictKey;
  query: string;
};

export const MOODS: Mood[] = [
  { id: "kpop", labelKey: "play.mood.kpop", query: 'genre:"k-pop"' },
  { id: "krap", labelKey: "play.mood.krap", query: 'genre:"k-rap"' },
  { id: "kindie", labelKey: "play.mood.kindie", query: 'genre:"k-indie"' },
  { id: "edm", labelKey: "play.mood.edm", query: 'genre:"edm"' },
  { id: "pop", labelKey: "play.mood.pop", query: 'genre:"pop"' },
  { id: "rock", labelKey: "play.mood.rock", query: 'genre:"rock"' },
  { id: "rnb", labelKey: "play.mood.rnb", query: 'genre:"r&b"' },
  { id: "chill", labelKey: "play.mood.chill", query: 'genre:"lo-fi"' },
];
