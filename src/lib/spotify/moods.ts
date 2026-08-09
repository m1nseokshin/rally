import type { DictKey } from "@/lib/i18n/dictionary";

/**
 * 무드별 선곡 프리셋.
 *
 * 원래 이런 건 Spotify /recommendations(seed_genres + target_energy/valence)로
 * 하는 게 정석인데, 그 엔드포인트는 2024년 11월부터 신규 앱에 403이다.
 * /audio-features도 막혀서 곡의 실제 에너지·분위기를 읽을 방법이 없다.
 *
 * `genre:` 필드 필터도 써봤지만 이 앱 등급에서는 400 Bad Request로 막혀
 * 있다(recommendations·audio-features와 같은 종류의 제한). 그래서 필드
 * 필터 없이, 그 장르를 대표하는 일반 검색어로 근사한다. 정확한 장르 분류는
 * 아니고 "이런 느낌의 곡이 걸릴 확률이 높은 검색어"에 가깝다 — 라벨도
 * 그렇게 솔직하게 붙였다.
 *
 * `query`는 Spotify 검색 문법 그대로 들어간다(일반 텍스트 검색어).
 */
export type Mood = {
  id: string;
  labelKey: DictKey;
  query: string;
};

export const MOODS: Mood[] = [
  { id: "kpop", labelKey: "play.mood.kpop", query: "k-pop" },
  { id: "krap", labelKey: "play.mood.krap", query: "korean hip hop" },
  { id: "kindie", labelKey: "play.mood.kindie", query: "korean indie" },
  { id: "edm", labelKey: "play.mood.edm", query: "edm" },
  { id: "pop", labelKey: "play.mood.pop", query: "pop" },
  { id: "rock", labelKey: "play.mood.rock", query: "rock" },
  { id: "rnb", labelKey: "play.mood.rnb", query: "r&b" },
  { id: "chill", labelKey: "play.mood.chill", query: "lo-fi" },
];
