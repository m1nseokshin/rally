"use client";

import { useCallback, useSyncExternalStore } from "react";
import { dictionary, type DictKey, type Locale } from "./dictionary";

const KEY = "rally-locale";

/**
 * 모듈 스코프의 단일 상태 + 구독자 목록. 컴포넌트마다 useState로 따로
 * 들고 있으면(예전 구현) 한 곳에서 언어를 바꿔도 다른 컴포넌트가 그걸
 * 모른다 — 로케일은 localStorage엔 반영되지만 이미 마운트된 다른
 * 컴포넌트의 React 상태는 안 바뀌어서 화면 일부만 번역되는 버그가 났다.
 * useSyncExternalStore로 모든 useLocale() 호출부가 같은 값을 구독하게 한다.
 */
let currentLocale: Locale = "ko";
const listeners = new Set<() => void>();

function detectDefault(): Locale {
  if (typeof navigator === "undefined") return "ko";
  return navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";
}

function notify() {
  for (const l of listeners) l();
}

function setGlobalLocale(next: Locale) {
  currentLocale = next;
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // 프라이빗 모드 등에서 저장 실패해도 이번 세션 표시는 그대로 유지
  }
  notify();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot() {
  return currentLocale;
}

// SSR 스냅샷은 항상 "ko" — 서버는 localStorage/navigator에 접근 못 하므로
// 하이드레이션 시점엔 서버가 렌더한 것과 같은 값을 반환해야 불일치가 안 난다.
function getServerSnapshot(): Locale {
  return "ko";
}

let hydrated = false;
/** 마운트 후 실제 저장된 값(또는 브라우저 언어)으로 한 번만 보정한다 */
function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const stored = localStorage.getItem(KEY) as Locale | null;
    const detected = stored ?? detectDefault();
    if (detected !== currentLocale) {
      currentLocale = detected;
      notify();
    }
  } catch {
    // 무시 — 기본값(ko) 유지
  }
}

export function useLocale() {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // 렌더 중 부작용을 일으키지 않도록, 이미 하이드레이션됐는지만 확인하고
  // 아직이면 마이크로태스크로 미뤄 스토어를 보정한다.
  if (typeof window !== "undefined" && !hydrated) {
    queueMicrotask(hydrateOnce);
  }

  const setLocale = useCallback((next: Locale) => setGlobalLocale(next), []);

  const t = useCallback(
    (key: DictKey, vars?: Record<string, string | number>) => {
      let str: string = dictionary[locale][key] ?? dictionary.ko[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(`{${k}}`, String(v));
        }
      }
      return str;
    },
    [locale],
  );

  return { locale, setLocale, t };
}
