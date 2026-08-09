"use client";

import { useEffect, useRef, useState } from "react";
import type { Track } from "@/lib/data";
import {
  fetchRecentTracks,
  fetchSavedTracks,
  fetchTopTracks,
  searchTracks,
  SEARCH_PAGE_MAX,
  type TopRange,
} from "./api";
import { applyClientFilters, buildSearchQuery, type Filters } from "./filters";

/**
 * 선택한 필터에 맞는 곡 목록을 가져온다.
 *
 * 소스마다 엔드포인트가 달라서(검색 / 내 취향 / 저장곡 / 최근재생) 여기서
 * 한 번에 갈라준다. 서버가 못 걸러주는 조건(난이도·길이)은 받아온 뒤
 * applyClientFilters로 처리하고, 몇 곡이 걸러졌는지도 같이 돌려줘서
 * "왜 갑자기 목록이 짧아졌지?"를 UI가 설명할 수 있게 한다.
 */
export function useTrackSource(
  filters: Filters,
  typed: string,
  enabled: boolean,
  shuffle: number,
  /** 즐겨찾기는 로컬 저장소에 있으므로 호출부가 넘겨준다 — API를 부를 게 없다 */
  favoriteTracks: Track[] = [],
) {
  const [raw, setRaw] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(0);

  // 검색 쿼리는 텍스트/장르/연도/태그를 합친 결과다. 이게 바뀔 때만 다시 부른다.
  const query = buildSearchQuery(filters, typed);
  const { source } = filters;
  const isFavorites = source === "favorites";

  useEffect(() => {
    // 즐겨찾기는 네트워크를 타지 않는다 — 아래 파생값에서 바로 쓴다
    if (isFavorites) return;
    const mySeq = ++seqRef.current;
    if (!enabled) {
      const id = setTimeout(() => {
        if (seqRef.current !== mySeq) return;
        setRaw([]);
        setLoading(false);
        setError(null);
      }, 0);
      return () => clearTimeout(id);
    }

    // 텍스트 입력 중엔 매 타이핑마다 요청하지 않도록 디바운스.
    // 소스/필터 변경은 즉시 반응해야 하니 검색일 때만 늦춘다.
    const isSearch = source === "search";
    const delay = isSearch && typed.trim() ? 300 : 0;

    const id = setTimeout(() => {
      if (seqRef.current !== mySeq) return;

      // 검색 소스인데 검색어도 장르도 없으면 요청할 게 없다
      if (isSearch && !query) {
        setRaw([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      // 검색은 한 페이지가 10곡이고 장르 하나로 파낼 수 있는 총량도 50곡 언저리다.
      // 여기서 50씩 밀면 두 번째 "다른 곡 보기"부터는 결과 범위 밖이라 빈 응답이
      // 오고, searchTracks가 처음으로 되감아 같은 목록이 다시 나온다.
      // 한 페이지씩만 밀어야 실제로 곡이 바뀐다.
      const offset = shuffle * SEARCH_PAGE_MAX;
      const run = isSearch
        ? searchTracks(query, 50, offset)
        : source === "saved"
          ? fetchSavedTracks(50)
          : source === "recent"
            ? fetchRecentTracks(50)
            : fetchTopTracks(
                50,
                (source === "top_medium"
                  ? "medium_term"
                  : source === "top_long"
                    ? "long_term"
                    : "short_term") as TopRange,
              );

      run
        .then((tracks) => {
          if (seqRef.current !== mySeq) return;
          setRaw(tracks);
          setError(null);
        })
        .catch((e) => {
          if (seqRef.current !== mySeq) return;
          // 최근 재생은 스코프가 추가되기 전에 연동한 토큰이면 403이 난다 —
          // 에러로 막지 말고 빈 목록 + 안내로 흘려보낸다
          if (source === "recent") {
            setRaw([]);
            setError("recent_scope");
            return;
          }
          setError(e instanceof Error ? e.message : "곡을 불러오지 못했어요.");
        })
        .finally(() => {
          if (seqRef.current === mySeq) setLoading(false);
        });
    }, delay);

    return () => clearTimeout(id);
  }, [enabled, source, query, typed, shuffle, isFavorites]);

  // 즐겨찾기는 로컬에 이미 다 있으니 요청 결과 대신 그걸 쓴다
  const base = isFavorites ? favoriteTracks : raw;
  const tracks = applyClientFilters(base, filters);
  return {
    tracks,
    hiddenCount: base.length - tracks.length,
    loading: isFavorites ? false : loading,
    error: isFavorites ? null : error,
  };
}
