"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { DictKey } from "@/lib/i18n/dictionary";

export type Plan = "free" | "plus" | "pro";

const KEY = "rally-plan";

export const PLAN_OPTIONS: { value: Plan; labelKey: DictKey }[] = [
  { value: "free", labelKey: "settings.plan.free" },
  { value: "plus", labelKey: "settings.plan.plus" },
  { value: "pro", labelKey: "settings.plan.pro" },
];

// useTheme/useLocale와 같은 useSyncExternalStore 공유 스토어 패턴 —
// 설정에서 바꾼 플랜이 프로필 화면에도 즉시 반영되게 한다.
let current: Plan = "free";
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}
function getSnapshot() {
  return current;
}
function getServerSnapshot(): Plan {
  return "free";
}

let hydrated = false;
function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const stored = localStorage.getItem(KEY);
  if (stored === "free" || stored === "plus" || stored === "pro") {
    current = stored;
    notify();
  }
}

function setGlobalPlan(next: Plan) {
  current = next;
  localStorage.setItem(KEY, next);
  notify();
}

export function usePlan() {
  const plan = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (typeof window !== "undefined" && !hydrated) {
    queueMicrotask(hydrateOnce);
  }

  return { plan, setPlan: useCallback((p: Plan) => setGlobalPlan(p), []) };
}
