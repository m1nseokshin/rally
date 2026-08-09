"use client";

import { useEffect } from "react";

/**
 * 우클릭(그리고 모바일 롱프레스) 컨텍스트 메뉴를 막는다.
 *
 * 이 앱은 폰 프레임 안에서 네이티브 앱처럼 보이는 게 목적이라, 브라우저
 * 기본 메뉴가 뜨면 그 환상이 바로 깨진다. contextmenu 이벤트 하나만 막으면
 * 데스크톱 우클릭과 iOS/안드로이드 롱프레스 메뉴가 함께 잡힌다.
 *
 * 다만 입력 필드는 예외로 둔다 — 여기까지 막으면 붙여넣기·맞춤법 검사 같은
 * 걸 쓸 수 없어서, 아이디/비밀번호나 검색어를 고치는 게 실제로 불편해진다.
 * 보안 장치가 아니라 어디까지나 연출이므로 그렇게까지 조일 이유가 없다.
 */
export default function NoContextMenu() {
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest?.("input, textarea, [contenteditable='true']")) return;
      e.preventDefault();
    };
    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, []);

  return null;
}
