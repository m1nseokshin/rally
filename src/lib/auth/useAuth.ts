"use client";

import { useCallback, useSyncExternalStore } from "react";

export type AuthUser = {
  provider: "email";
  id: string; // 로그인 시 쓴 아이디/이메일
  name: string;
  email?: string;
};

type Account = { id: string; email: string; password: string; name: string };

const SESSION_KEY = "rally-auth-session";
const ACCOUNTS_KEY = "rally-auth-accounts";

// useProfileName과 같은 useSyncExternalStore 공유 스토어 패턴.
// 백엔드가 없는 클라이언트 전용 앱이라 계정은 localStorage에 목업으로
// 저장한다 — 실서비스라면 서버 인증으로 교체해야 한다. 비밀번호도
// 평문 대신 간단히 뒤섞어 두지만 이 역시 진짜 해시가 아니다(데모용).
let currentUser: AuthUser | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

function getSnapshot() {
  return currentUser;
}

function getServerSnapshot(): AuthUser | null {
  return null;
}

let hydrated = false;
function hydrateOnce() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const stored = localStorage.getItem(SESSION_KEY);
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored) as AuthUser;
    if (parsed?.id) {
      currentUser = parsed;
      notify();
    }
  } catch {
    // 손상된 세션 값 — 무시
  }
}

function readAccounts(): Account[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) ?? "[]") as Account[];
  } catch {
    return [];
  }
}

function writeAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

// 진짜 해시가 아니라 평문 저장을 피하기 위한 간단한 뒤섞기 — 데모/목업 전용.
function obscure(raw: string) {
  return btoa(unescape(encodeURIComponent(raw)));
}

function setSession(user: AuthUser) {
  currentUser = user;
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  notify();
}

function signOut() {
  currentUser = null;
  localStorage.removeItem(SESSION_KEY);
  notify();
}

function signUpWithEmail(idOrEmail: string, password: string, name: string) {
  const accounts = readAccounts();
  if (accounts.some((a) => a.id === idOrEmail)) {
    throw new Error("exists");
  }
  const account: Account = { id: idOrEmail, email: idOrEmail, password: obscure(password), name };
  writeAccounts([...accounts, account]);
  setSession({ provider: "email", id: account.id, name: account.name, email: account.email });
}

function signInWithEmail(idOrEmail: string, password: string) {
  const accounts = readAccounts();
  const account = accounts.find((a) => a.id === idOrEmail);
  if (!account || account.password !== obscure(password)) {
    throw new Error("invalid");
  }
  setSession({ provider: "email", id: account.id, name: account.name, email: account.email });
}

export function useAuth() {
  const user = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (typeof window !== "undefined" && !hydrated) {
    queueMicrotask(hydrateOnce);
  }

  return {
    user,
    signOut: useCallback(() => signOut(), []),
    signUpWithEmail: useCallback(
      (id: string, password: string, name: string) => signUpWithEmail(id, password, name),
      [],
    ),
    signInWithEmail: useCallback(
      (id: string, password: string) => signInWithEmail(id, password),
      [],
    ),
  };
}
