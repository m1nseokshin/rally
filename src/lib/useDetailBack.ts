"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { playDetailExit } from "./transition";

/**
 * 상세 페이지의 "뒤로" 동작.
 *
 * 화면이 오른쪽으로 빠져나가는 애니메이션을 먼저 재생하고, 끝난 뒤에
 * 실제로 라우터를 되돌린다. 순서를 바꾸면(먼저 back) 이전 화면이 즉시
 * 그려지면서 나가는 연출이 통째로 잘린다.
 */
export function useDetailBack(fallbackHref = "/") {
  const router = useRouter();
  return useCallback(async () => {
    await playDetailExit();
    // 새 탭에서 상세 URL로 바로 들어온 경우엔 돌아갈 히스토리가 없다
    if (window.history.length > 1) router.back();
    else router.replace(fallbackHref);
  }, [router, fallbackHref]);
}
