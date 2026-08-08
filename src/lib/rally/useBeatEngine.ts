"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type Beat = {
  id: number;
  /** 이 비트를 쳐야 하는 시각 (AudioContext 기준 초) */
  time: number;
  /** 강박 여부 — 랠리 포인트 */
  strong: boolean;
};

/** 판정 결과 */
export type Judgement = "perfect" | "good" | "miss";

/** 판정 허용 오차(초) */
const PERFECT_WINDOW = 0.12;
const GOOD_WINDOW = 0.26;

type Options = {
  bpm: number;
  /** 강박 위치 비율 0~1 — Spotify 분석에서 온 랠리 포인트 */
  hits: number[];
  /** 곡 길이(초) */
  duration: number;
  /** Spotify 실제 재생이 붙었으면 자체 클릭음을 끈다 */
  muteClick?: boolean;
};

/**
 * BPM으로 비트 타임라인을 만들고 Web Audio로 정확한 타이밍에 소리를 낸다.
 * setInterval은 브라우저 타이머 오차 때문에 리듬게임엔 부적합해서,
 * AudioContext.currentTime을 기준으로 스케줄링한다.
 */
export function useBeatEngine({ bpm, hits, duration, muteClick }: Options) {
  const ctxRef = useRef<AudioContext | null>(null);
  const beatsRef = useRef<Beat[]>([]);
  const startAtRef = useRef(0);
  const scheduledRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const [running, setRunning] = useState(false);

  /** 재생 시작 후 경과 시간(초) */
  const elapsed = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx || !startAtRef.current) return 0;
    return ctx.currentTime - startAtRef.current;
  }, []);

  const buildBeats = useCallback(() => {
    const interval = 60 / Math.max(60, bpm);
    const total = Math.floor(duration / interval);
    // 강박 위치를 초 단위로 변환해두고, 가장 가까운 비트를 강박으로 표시
    const strongTimes = hits.map((h) => h * duration);
    const beats: Beat[] = [];
    for (let i = 0; i < total; i++) {
      const time = i * interval;
      const strong = strongTimes.some((s) => Math.abs(s - time) < interval * 0.6);
      beats.push({ id: i, time, strong });
    }
    return beats;
  }, [bpm, hits, duration]);

  const playClick = useCallback((at: number, strong: boolean) => {
    const ctx = ctxRef.current;
    if (!ctx || muteClick) return;

    // 강박은 낮은 킥, 약박은 짧은 하이햇 느낌으로 구분
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(strong ? 120 : 800, at);
    if (strong) osc.frequency.exponentialRampToValueAtTime(48, at + 0.12);
    gain.gain.setValueAtTime(strong ? 0.45 : 0.12, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + (strong ? 0.16 : 0.05));
    osc.connect(gain).connect(ctx.destination);
    osc.start(at);
    osc.stop(at + 0.2);
  }, [muteClick]);

  const start = useCallback(
    async (sync?: { atMs: number; positionSec: number }) => {
      const ctx = ctxRef.current ?? new AudioContext();
      ctxRef.current = ctx;
      // 사용자 제스처 없이 만들어진 컨텍스트는 suspended 상태로 시작한다
      if (ctx.state === "suspended") await ctx.resume();

      beatsRef.current = buildBeats();

      // ctx.currentTime(오디오 클록)과 performance.now()(벽시계)를 같은 순간에
      // 같이 읽어 기준점을 만든다 — 두 시계는 서로 다른 클록이라 이렇게
      // 짝지어 두지 않으면 오차가 생긴다.
      const ctxNow = ctx.currentTime;
      const wallNow = performance.now();

      if (sync) {
        // Spotify가 sync 시점에 이미 positionSec만큼 재생 중이었다 —
        // 그 순간부터 지금까지 흐른 시간을 더해 "지금 실제 재생 위치"를 구하고,
        // 트랙이 0초였을 ctx 시각을 역산한다.
        const elapsedSinceSync = (wallNow - sync.atMs) / 1000;
        const currentPosition = sync.positionSec + elapsedSinceSync;
        startAtRef.current = ctxNow - currentPosition;
      } else {
        startAtRef.current = ctxNow + 1.2; // 자체 사운드일 땐 준비 시간만 주면 된다
      }

      // 이미 지나간 비트는 스케줄 대상에서 빼둔다 (동기화 시 트랙이 이미
      // 몇 초 진행된 상태로 시작할 수 있다)
      const idx = beatsRef.current.findIndex(
        (b) => startAtRef.current + b.time > ctxNow - 0.05,
      );
      scheduledRef.current = idx === -1 ? beatsRef.current.length : idx;

      setRunning(true);

      // 0.1초마다 앞으로 0.4초 구간의 비트를 미리 스케줄
      const schedule = () => {
        const c = ctxRef.current;
        if (!c) return;
        const lookahead = c.currentTime + 0.4;
        const beats = beatsRef.current;
        while (
          scheduledRef.current < beats.length &&
          startAtRef.current + beats[scheduledRef.current].time < lookahead
        ) {
          const b = beats[scheduledRef.current];
          playClick(startAtRef.current + b.time, b.strong);
          scheduledRef.current++;
        }
      };

      timerRef.current = window.setInterval(schedule, 100);
    },
    [buildBeats, playClick],
  );

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setRunning(false);
    startAtRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      ctxRef.current?.close();
    };
  }, []);

  /** 스윙이 들어온 시각을 가장 가까운 비트와 비교해 판정 */
  const judge = useCallback((): { result: Judgement; beat: Beat | null } => {
    const t = elapsed();
    const beats = beatsRef.current;
    let closest: Beat | null = null;
    let minDiff = Infinity;
    for (const b of beats) {
      const diff = Math.abs(b.time - t);
      if (diff < minDiff) {
        minDiff = diff;
        closest = b;
      }
      if (b.time > t + GOOD_WINDOW) break;
    }
    if (!closest || minDiff > GOOD_WINDOW) return { result: "miss", beat: closest };
    return { result: minDiff <= PERFECT_WINDOW ? "perfect" : "good", beat: closest };
  }, [elapsed]);

  /** 다가오는 비트들 — 화면에 노트로 그리기 위해 */
  const upcoming = useCallback(
    (windowSec = 2) => {
      const t = elapsed();
      return beatsRef.current.filter((b) => b.time > t - 0.3 && b.time < t + windowSec);
    },
    [elapsed],
  );

  // 참조를 안정적으로 유지 — 매 렌더 새 객체면 이 값을 의존성으로 쓰는
  // 이펙트가 계속 재실행돼 게임 루프가 끊긴다.
  return useMemo(
    () => ({ start, stop, running, judge, upcoming, elapsed }),
    [start, stop, running, judge, upcoming, elapsed],
  );
}
