"use client";

import { useEffect, useRef, useState } from "react";
import type { Track } from "@/lib/data";
import { searchTracks } from "./api";

/**
 * 디바운스한 곡 검색.
 *
 * query는 Spotify 검색 문법 그대로 들어가므로 사용자가 친 텍스트도,
 * 무드 프리셋의 `genre:"k-pop"` 같은 필터도 같은 경로로 처리된다.
 * offset은 같은 무드에서 다른 곡을 뽑는 "셔플"용이다.
 */
export function useSpotifySearch(query: string, enabled: boolean, offset = 0) {
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seqRef = useRef(0);

  useEffect(() => {
    const q = query.trim();
    const mySeq = ++seqRef.current;

    // setState를 이펙트 안에서 동기적으로 부르지 않도록 빈 검색어 정리도
    // 타이머로 미룬다 (react-hooks/set-state-in-effect 대응).
    if (!enabled || !q) {
      const id = setTimeout(() => {
        if (seqRef.current !== mySeq) return;
        setResults([]);
        setLoading(false);
        setError(null);
      }, 0);
      return () => clearTimeout(id);
    }

    // 로딩 표시도 같은 타이머 콜백 안에서 켠다
    const id = setTimeout(() => {
      if (seqRef.current !== mySeq) return;
      setLoading(true);
      searchTracks(q, undefined, offset)
        .then((tracks) => {
          // 응답이 늦게 와서 이미 다음 검색어로 넘어갔으면 버린다
          if (seqRef.current !== mySeq) return;
          setResults(tracks);
          setError(null);
        })
        .catch((e) => {
          if (seqRef.current !== mySeq) return;
          setError(e instanceof Error ? e.message : "검색에 실패했어요.");
        })
        .finally(() => {
          if (seqRef.current === mySeq) setLoading(false);
        });
    }, 300); // 300ms 디바운스 — 타이핑 도중엔 요청하지 않는다

    return () => clearTimeout(id);
  }, [query, enabled, offset]);

  return { results, loading, error };
}
