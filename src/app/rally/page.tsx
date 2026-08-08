"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMotionCamera } from "@/lib/rally/useMotionCamera";
import { useBeatEngine, type Judgement } from "@/lib/rally/useBeatEngine";
import { useDeviceOrientation } from "@/lib/rally/useDeviceOrientation";
import { useHandTracking } from "@/lib/rally/useHandTracking";
import { createPlayer, type RallyPlayer } from "@/lib/spotify/player";
import { hasStreamingScope } from "@/lib/spotify/auth";
import { IconBack } from "@/components/icons";
import Paddle3D, { type Paddle3DHandle } from "@/components/Paddle3D";
import { useLocale } from "@/lib/i18n/useLocale";
import { useSessionLog } from "@/lib/sessions/useSessionLog";

type Stage = "ready" | "playing" | "done";

/** 화면에 날아오는 공 하나 */
type Ball = {
  id: number;
  /** 도달 시각 (경과초) */
  hitAt: number;
  strong: boolean;
  /** 좌/우 어느 쪽으로 오는지 0~1 */
  lane: number;
  state: "flying" | "hit" | "missed";
};

function RallyGame() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useLocale();

  const trackId = params.get("track") ?? "";
  const title = params.get("title") ?? t("rally.defaultTitle");
  const artist = params.get("artist") ?? "";
  const bpm = Number(params.get("bpm")) || 120;
  const duration = Number(params.get("duration")) || 180;
  // 매 렌더 새 배열이면 비트 엔진이 타임라인을 다시 만들어 게임이 끊긴다
  const hitsParam = params.get("hits") ?? "";
  const hits = useMemo(
    () => hitsParam.split(",").map(Number).filter((n) => !Number.isNaN(n)),
    [hitsParam],
  );

  const [stage, setStage] = useState<Stage>("ready");
  const [balls, setBalls] = useState<Ball[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [counts, setCounts] = useState({ perfect: 0, good: 0, miss: 0 });
  const [flash, setFlash] = useState<Judgement | null>(null);
  const [playerNote, setPlayerNote] = useState<string | null>(null);
  // Spotify 실제 음원이 재생 중인지 — 렌더에 쓰이므로 ref가 아니라 state
  const [spotifyPlaying, setSpotifyPlaying] = useState(false);

  const playerRef = useRef<RallyPlayer | null>(null);
  const spawnedRef = useRef(new Set<number>());
  const ballIdRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const paddleRef = useRef<Paddle3DHandle>(null);
  const startedAtRef = useRef<number | null>(null);
  const savedRef = useRef(false);
  const { tiltRef, requestPermission: requestOrientation } = useDeviceOrientation();
  const { addSession } = useSessionLog();

  const beat = useBeatEngine({
    bpm,
    hits,
    duration,
    // Spotify 실제 재생이 붙으면 자체 클릭음은 끈다
    muteClick: spotifyPlaying,
  });

  /** 스윙이 들어오면 판정하고 가장 가까운 공을 쳐낸다 */
  const onSwing = useCallback(() => {
    if (stage !== "playing") return;
    paddleRef.current?.swing();
    const { result } = beat.judge();

    setFlash(result);
    setTimeout(() => setFlash(null), 260);

    // 헛스윙은 콤보만 끊는다 — miss 집계는 공을 놓쳤을 때 한 번만 한다
    if (result === "miss") {
      setCombo(0);
      return;
    }

    const gain = result === "perfect" ? 100 : 50;
    setScore((s) => s + gain + combo * 2);
    setCombo((c) => {
      const next = c + 1;
      setMaxCombo((m) => Math.max(m, next));
      return next;
    });
    setCounts((c) => ({ ...c, [result]: c[result] + 1 }));

    // 날아오던 공 중 가장 임박한 것을 맞은 상태로 전환
    const t = beat.elapsed();
    setBalls((prev) => {
      let bestIdx = -1;
      let bestDiff = Infinity;
      prev.forEach((b, i) => {
        if (b.state !== "flying") return;
        const diff = Math.abs(b.hitAt - t);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = i;
        }
      });
      if (bestIdx < 0) return prev;
      const next = [...prev];
      next[bestIdx] = { ...next[bestIdx], state: "hit" };
      return next;
    });
  }, [stage, beat, combo]);

  const {
    videoRef,
    start: startCamera,
    stop: stopCamera,
    error: cameraError,
    intensity: motionIntensity,
  } = useMotionCamera({ onSwing });

  // 손이 인식되면 그 위치로, 못 잡으면 자이로로 — Paddle3D 안에서 알아서 섞는다
  const { getPose: getHandPose } = useHandTracking(videoRef, stage === "playing");

  /** 공 스폰 + 수명 관리 루프 */
  useEffect(() => {
    if (stage !== "playing") return;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      const t = beat.elapsed();

      // 2초 뒤에 도달할 비트를 미리 공으로 띄운다
      for (const b of beat.upcoming(2)) {
        if (spawnedRef.current.has(b.id)) continue;
        if (b.time - t > 1.9) continue;
        spawnedRef.current.add(b.id);
        setBalls((prev) => [
          ...prev,
          {
            id: ballIdRef.current++,
            hitAt: b.time,
            strong: b.strong,
            lane: (b.id * 0.37) % 1, // 결정적 분포 — 같은 곡이면 같은 패턴
            state: "flying",
          },
        ]);
      }

      // 판정 시점을 지나친 공은 미스 처리 후 제거.
      // 새로 미스가 난 순간에만 콤보를 끊는다.
      setBalls((prev) => {
        let newlyMissed = 0;
        const updated = prev.map((ball) => {
          if (ball.state === "flying" && t > ball.hitAt + 0.3) {
            newlyMissed++;
            return { ...ball, state: "missed" as const };
          }
          return ball;
        });
        if (newlyMissed > 0) {
          setCombo(0);
          setCounts((c) => ({ ...c, miss: c.miss + newlyMissed }));
        }
        return updated.filter((ball) => t < ball.hitAt + 1);
      });

      if (t > duration) setStage("done");
    };
    loop();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [stage, beat, duration]);

  const startGame = useCallback(async () => {
    // iOS는 자이로 권한 요청이 클릭 제스처 직후여야만 동작한다 —
    // 다른 await(카메라 등)보다 반드시 먼저 호출한다.
    await requestOrientation();

    // 방향을 강제하지 않는다 — 폰은 세로, PC는 가로 뷰포트 그대로 쓴다.
    await startCamera();

    // Spotify 실제 재생 시도 — Premium이 아니거나 재생 권한이 없으면 비트 사운드로 폴백
    let sync: { atMs: number; positionSec: number } | undefined;
    if (trackId) {
      if (!hasStreamingScope()) {
        // streaming 권한 추가 전에 로그인한 토큰이면 시도해봐야 뻔히 실패한다 —
        // SDK를 띄우지 않고 바로 원인을 알려준다.
        setPlayerNote(t("rally.spotify.noPermission"));
      } else {
        try {
          const player = await createPlayer();
          await player.playTrack(trackId);
          // 실제로 오디오가 흘러나오기 시작한 시점의 위치를 SDK에서 받아온다 —
          // 이게 없으면 우리 비트 타임라인이 "1.2초 뒤 시작"이라고 무작정
          // 가정하게 되고, 네트워크 지연만큼 매번 다르게 어긋난다.
          sync = await player.waitForSync(trackId);
          playerRef.current = player;
          setSpotifyPlaying(true);
          setPlayerNote(null);
        } catch (e) {
          setPlayerNote(e instanceof Error ? e.message : t("rally.spotify.fallback"));
        }
      }
    }

    startedAtRef.current = Date.now();
    savedRef.current = false;
    await beat.start(sync);
    setStage("playing");
  }, [startCamera, beat, trackId, requestOrientation, t]);

  const finish = useCallback(() => {
    beat.stop();
    stopCamera();
    playerRef.current?.pause();
    playerRef.current?.disconnect();
    playerRef.current = null;
  }, [beat, stopCamera]);

  // finish는 매 렌더 갱신되므로 ref에 담아둔다.
  // 의존성에 직접 넣으면 정리 함수가 렌더마다 실행돼 게임이 즉시 종료된다.
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  useEffect(() => {
    if (stage === "done") finishRef.current();
  }, [stage]);

  // 언마운트 시 한 번만 정리
  useEffect(() => () => finishRef.current(), []);

  const accuracy =
    counts.perfect + counts.good + counts.miss > 0
      ? Math.round(
          ((counts.perfect + counts.good * 0.6) /
            (counts.perfect + counts.good + counts.miss)) *
            100,
        )
      : 0;

  // 게임이 끝나면 세션 기록을 한 번만 저장한다 — 홈/인사이트의
  // "오늘의 기록"이 이 스토어를 구독해 즉시 반영된다.
  useEffect(() => {
    if (stage !== "done" || savedRef.current) return;
    savedRef.current = true;
    const elapsedMs = startedAtRef.current ? Date.now() - startedAtRef.current : 0;
    const minutes = Math.max(1, Math.round(elapsedMs / 60000));
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(
      now.getMinutes(),
    ).padStart(2, "0")}`;
    addSession({
      time,
      trackTitle: title,
      minutes,
      focus: accuracy,
      accuracy,
      maxCombo,
    });
  }, [stage, accuracy, maxCombo, title, addSession]);

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black">
      {/* 카메라 배경 */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 size-full scale-x-[-1] object-cover"
      />
      <div className="absolute inset-0 bg-black/35" />

      {stage === "ready" && (
        <ReadyOverlay
          title={title}
          artist={artist}
          bpm={bpm}
          error={cameraError}
          onStart={startGame}
          onBack={() => router.back()}
        />
      )}

      {stage === "playing" && (
        <>
          {/* 코트 라인 */}
          <div className="absolute inset-x-0 bottom-[18%] h-px bg-white/25" />
          <div className="absolute inset-x-[8%] bottom-[16%] h-[3px] rounded-full bg-primary/80" />

          {/* 날아오는 공 */}
          {balls.map((ball) => (
            <BallView key={ball.id} ball={ball} elapsed={beat.elapsed()} />
          ))}

          {/* 3D 라켓 — 자이로 기울기를 그대로 따라가며 가상공간에 떠 있다 */}
          <Paddle3D ref={paddleRef} tiltRef={tiltRef} getHandPose={getHandPose} />

          {/* HUD */}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5">
            <button
              type="button"
              onClick={() => setStage("done")}
              className="tap flex size-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
              aria-label={t("rally.result.title")}
            >
              <IconBack size={18} />
            </button>

            <div className="text-right">
              <p className="type-display text-[36px] leading-none text-white tabular-nums">
                {score}
              </p>
              <p className="type-caption mt-1 text-[11px] text-white/70">
                {title}
                {artist && ` · ${artist}`}
              </p>
            </div>
          </div>

          {/* 실제 음원 재생 실패 안내 — 놓치기 쉬운 구석이 아니라 상단에 배너로 */}
          {playerNote && (
            <div className="absolute inset-x-0 top-[68px] flex justify-center px-5">
              <p className="type-caption rounded-lg bg-black/70 px-4 py-2 text-center text-[11px] text-white backdrop-blur">
                {playerNote}
              </p>
            </div>
          )}

          {/* 콤보 */}
          {combo > 1 && (
            <div className="pointer-events-none absolute left-1/2 top-[16%] -translate-x-1/2 text-center">
              <p className="type-display text-[52px] leading-none text-primary">{combo}</p>
              <p className="type-eyebrow text-[10px] font-semibold uppercase text-white/80">
                combo
              </p>
            </div>
          )}

          {/* 판정 표시 */}
          {flash && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <p
                className={`type-display text-[44px] ${
                  flash === "perfect"
                    ? "text-primary"
                    : flash === "good"
                      ? "text-white"
                      : "text-white/40"
                }`}
              >
                {flash === "perfect"
                  ? t("rally.judge.perfect")
                  : flash === "good"
                    ? t("rally.judge.good")
                    : t("rally.judge.miss")}
              </p>
            </div>
          )}

          {/* 모션 감도 게이지 */}
          <div className="absolute bottom-5 left-5 flex items-center gap-2">
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/20">
              <span
                className="block h-full rounded-full bg-primary transition-[width] duration-75"
                style={{ width: `${Math.min(100, motionIntensity * 900)}%` }}
              />
            </span>
            <span className="type-caption text-[10px] text-white/60">{t("rally.hud.motion")}</span>
          </div>

        </>
      )}

      {stage === "done" && (
        <ResultOverlay
          score={score}
          maxCombo={maxCombo}
          accuracy={accuracy}
          counts={counts}
          onExit={() => router.push("/insights")}
          onRetry={() => {
            spawnedRef.current.clear();
            setBalls([]);
            setScore(0);
            setCombo(0);
            setMaxCombo(0);
            setCounts({ perfect: 0, good: 0, miss: 0 });
            setStage("ready");
          }}
        />
      )}
    </div>
  );
}

/** 원근감 있게 다가오는 공 — 남은 시간에 따라 커지고 아래로 내려온다 */
function BallView({ ball, elapsed }: { ball: Ball; elapsed: number }) {
  const remaining = ball.hitAt - elapsed;
  // 2초 전 스폰 → 0에서 타격. progress 0(먼 곳) ~ 1(타격점)
  const progress = Math.max(0, Math.min(1.3, 1 - remaining / 2));

  if (ball.state === "missed" && progress > 1.2) return null;

  // 공 크기는 화면의 짧은 변을 기준으로 잡아야 세로/가로 어느 쪽에서도
  // 비슷한 비율로 보인다. vmin이 그 역할을 한다.
  const size = 4 + progress * 18; // vmin
  const top = 24 + progress * 58;
  const left = 50 + (ball.lane - 0.5) * 62 * progress;
  const hit = ball.state === "hit";

  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${left}%`,
        top: `${top}%`,
        opacity: hit ? 0 : ball.state === "missed" ? 0.25 : 1,
        transition: hit ? "opacity 180ms ease, transform 180ms ease" : undefined,
        transform: hit ? "translate(-50%,-50%) scale(1.8)" : undefined,
      }}
    >
      <div
        className={`rounded-full ${
          ball.strong ? "bg-primary" : "bg-white"
        } shadow-[0_0_24px_rgba(242,72,34,0.5)]`}
        style={{ width: `${size}vmin`, height: `${size}vmin` }}
      />
    </div>
  );
}

function ReadyOverlay({
  title,
  artist,
  bpm,
  error,
  onStart,
  onBack,
}: {
  title: string;
  artist: string;
  bpm: number;
  error: string | null;
  onStart: () => void;
  onBack: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="absolute inset-0 flex flex-col justify-between bg-black/70 p-6">
      <button
        type="button"
        onClick={onBack}
        className="tap flex size-10 items-center justify-center rounded-full bg-white/10 text-white"
        aria-label={t("common.back")}
      >
        <IconBack size={18} />
      </button>

      <div>
        <p className="type-eyebrow text-[11px] font-medium uppercase text-primary">
          {t("rally.ready.eyebrow", { bpm })}
        </p>
        <h1 className="type-display mt-2 text-[40px] leading-[0.9] text-white">{title}</h1>
        {artist && <p className="mt-2 text-[13px] text-white/60">{artist}</p>}

        <ul className="type-caption mt-5 space-y-1.5 text-[12px] text-white/70">
          <li>· {t("rally.ready.instructions.camera")}</li>
          <li>· {t("rally.ready.instructions.hand")}</li>
          <li>· {t("rally.ready.instructions.hit")}</li>
          <li>· {t("rally.ready.instructions.strong")}</li>
        </ul>

        {error && (
          <div className="mt-4 border-l-2 border-primary pl-3">
            <p className="type-caption text-[12px] text-primary">{error}</p>
            <p className="type-caption mt-1 text-[11px] text-white/50">
              {t("rally.ready.permissionHint")}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={onStart}
          className="tap mt-6 h-14 w-full rounded-lg bg-primary text-[16px] font-semibold text-white"
        >
          {error ? t("rally.ready.retry") : t("rally.ready.start")}
        </button>
      </div>
    </div>
  );
}

function ResultOverlay({
  score,
  maxCombo,
  accuracy,
  counts,
  onExit,
  onRetry,
}: {
  score: number;
  maxCombo: number;
  accuracy: number;
  counts: { perfect: number; good: number; miss: number };
  onExit: () => void;
  onRetry: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="absolute inset-0 flex flex-col justify-center bg-black/90 p-8">
      <p className="type-eyebrow text-[11px] font-medium uppercase text-primary">
        {t("rally.result.title")}
      </p>
      <p className="type-display mt-2 text-[64px] leading-none text-white tabular-nums">
        {score}
      </p>

      <div className="mt-6 grid grid-cols-3 gap-3 border-t border-white/15 pt-5">
        <Stat label={t("rally.result.accuracy")} value={`${accuracy}%`} />
        <Stat label={t("rally.result.maxCombo")} value={String(maxCombo)} />
        <Stat label={t("rally.result.perfect")} value={String(counts.perfect)} />
      </div>

      <div className="mt-8 flex gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="tap h-12 flex-1 rounded-lg border border-white/25 text-[14px] font-semibold text-white"
        >
          {t("rally.result.retry")}
        </button>
        <button
          type="button"
          onClick={onExit}
          className="tap h-12 flex-1 rounded-lg bg-primary text-[14px] font-semibold text-white"
        >
          {t("rally.result.exit")}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="type-caption text-[11px] text-white/50">{label}</p>
      <p className="mt-1 text-[20px] font-semibold text-white tabular-nums">{value}</p>
    </div>
  );
}

export default function RallyPage() {
  return (
    <Suspense fallback={null}>
      <RallyGame />
    </Suspense>
  );
}
