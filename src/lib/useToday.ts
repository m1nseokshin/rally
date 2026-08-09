"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/dictionary";

/**
 * 오늘 날짜 관련 값들.
 *
 * 전부 **마운트 뒤에만** 채운다. 이 앱은 정적 export라 서버에서 계산한 값은
 * 빌드한 날짜에 그대로 굳어버린다 — 사전에 "2026년 8월 8일"이 박혀 있던 게
 * 딱 그 문제였다. 첫 렌더에서 빈 값을 돌려주면 서버·클라이언트 마크업이
 * 같아져 하이드레이션 불일치도 나지 않는다.
 *
 * 프로젝트 관례대로 setTimeout(0)으로 한 틱 미뤄 이펙트 본문에서 setState가
 * 동기 실행되지 않게 한다.
 */

/** "2026년 8월 10일" / "August 10, 2026" — 로케일에 맞춰 포맷한다 */
export function useTodayLabel(locale: Locale) {
  const [label, setLabel] = useState("");

  useEffect(() => {
    const id = setTimeout(() => {
      setLabel(
        new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }).format(new Date()),
      );
    }, 0);
    return () => clearTimeout(id);
  }, [locale]);

  return label;
}

/**
 * 이번 주에서 오늘이 몇 번째 날인가 — 월요일 0 … 일요일 6.
 *
 * `Date.getDay()`는 일요일이 0이라 그대로 쓰면 주가 일요일에 시작한다.
 * 이 앱의 주별 그래프는 월~일 순서라 월요일 기준으로 옮긴다.
 *
 * 마운트 전에는 null — 호출부가 "아직 모른다"와 "월요일(0)"을 구분해야 한다.
 */
export function useWeekdayIndex(): number | null {
  const [index, setIndex] = useState<number | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setIndex((new Date().getDay() + 6) % 7), 0);
    return () => clearTimeout(id);
  }, []);

  return index;
}
