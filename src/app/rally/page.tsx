"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMotionCamera, type MotionEvent } from "@/lib/rally/useMotionCamera";
import { useBeatEngine, type Judgement } from "@/lib/rally/useBeatEngine";
import { useDeviceOrientation } from "@/lib/rally/useDeviceOrientation";
import { useHandTracking, type Swing } from "@/lib/rally/useHandTracking";
import { applyContact } from "@/lib/rally/scoring";
import {
  HAND_LIVE_TIMEOUT,
  LANE_HALF_SPAN,
  MIN_BALL_GAP,
  TARGET_BALL_GAP,
  TRAVEL,
} from "@/lib/rally/rallyConfig";
import { createPlayer, type RallyPlayer } from "@/lib/spotify/player";
import { hasStreamingScope } from "@/lib/spotify/auth";
import { IconBack } from "@/components/icons";
import RallyScene, { type RallySceneHandle } from "@/components/RallyScene";
import { useLocale } from "@/lib/i18n/useLocale";
import { useSessionLog } from "@/lib/sessions/useSessionLog";

type Stage = "ready" | "playing" | "done";
/** 판정 표시 — 퍼펙트 중에서도 강하게 친 건 따로 보여준다 */
type Flash = Judgement | "smash";

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

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
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [counts, setCounts] = useState({ perfect: 0, good: 0, miss: 0 });
  const [flash, setFlash] = useState<Flash | null>(null);
  const [playerNote, setPlayerNote] = useState<string | null>(null);
  // Spotify 실제 음원이 재생 중인지 — 렌더에 쓰이므로 ref가 아니라 state
  const [spotifyPlaying, setSpotifyPlaying] = useState(false);
  // HUD용 — 마지막 스윙 세기와 현재 그립. 초당 몇 번만 갱신돼 state로 둬도 무해하다.
  const [swingPower, setSwingPower] = useState(0);
  const [grip, setGrip] = useState(0);

  const playerRef = useRef<RallyPlayer | null>(null);
  const spawnedRef = useRef(new Set<number>());
  const lastSpawnAtRef = useRef(-Infinity);
  const rafRef = useRef<number | null>(null);
  const sceneRef = useRef<RallySceneHandle>(null);
  const startedAtRef = useRef<number | null>(null);
  const savedRef = useRef(false);
  // 렌더 중이 아니라 이벤트/rAF 안에서만 읽는다 — onSwing을 매 렌더 새로
  // 만들지 않기 위해 stage/combo를 ref로도 들고 있는다.
  const stageRef = useRef<Stage>("ready");
  const comboRef = useRef(0);
  // 손 추적이 최근까지 살아 있었는가 — 모션 카메라 폴백을 켤지 결정한다
  const handLiveRef = useRef(0);
  const { tiltRef, hasGyroRef, requestPermission: requestOrientation } = useDeviceOrientation();
  const { addSession } = useSessionLog();

  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);
  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  const beat = useBeatEngine({
    bpm,
    hits,
    duration,
    // Spotify 실제 재생이 붙으면 자체 클릭음은 끈다
    muteClick: spotifyPlaying,
  });

  /** 휘두르는 제스처가 들어오면 타이밍 + 공간을 함께 판정한다 */
  const handleSwing = useCallback(
    (s: Swing) => {
      if (stageRef.current !== "playing") return;

      // 씬이 라켓 애니메이션을 켜고 라켓↔공 거리로 공간 판정을 즉시 돌려준다.
      // 비동기로 만들면 프레임이 밀려 리듬 판정이 어긋나므로 반드시 동기다.
      const outcome = sceneRef.current?.swing(s.power, s.source);
      const { result: timing } = beat.judge();
      const result = applyContact(timing, outcome?.contact ?? "clean");

      setSwingPower(s.power);
      setFlash(result === "perfect" && s.power > 0.8 ? "smash" : result);
      setTimeout(() => setFlash(null), 260);

      // 헛스윙/빗맞음은 콤보만 끊는다 — miss 집계는 공이 실제로 지나갈 때
      // 씬이 onBallMissed로 한 번만 알려준다(중복 집계 방지).
      if (result === "miss") {
        setCombo(0);
        return;
      }

      // 세게 칠수록 점수가 오른다 — 살살 치면 70%, 풀스윙이면 130%
      const base = result === "perfect" ? 100 : 50;
      const gain = Math.round(base * (0.7 + 0.6 * s.power));
      setScore((v) => v + gain + comboRef.current * 2);
      setCombo((c) => {
        const next = c + 1;
        setMaxCombo((m) => Math.max(m, next));
        return next;
      });
      setCounts((c) => ({ ...c, [result]: c[result] + 1 }));
    },
    [beat],
  );

  /** 공을 놓쳤을 때 — 씬이 공 하나당 정확히 한 번만 호출한다 */
  const handleBallMissed = useCallback(() => {
    setCombo(0);
    setCounts((c) => ({ ...c, miss: c.miss + 1 }));
  }, []);

  const onMotionSwing = useCallback(
    (e: MotionEvent) => {
      // 손 추적이 살아 있으면 프레임 차분은 무시한다 — 지나가는 사람이나
      // 조명 변화만으로도 오발동해서, 어디까지나 보조 수단이다.
      if (performance.now() - handLiveRef.current < HAND_LIVE_TIMEOUT) return;
      handleSwing({ power: e.intensity, x: e.x, y: 0.6, dir: 0, at: e.at, source: "motion" });
    },
    [handleSwing],
  );

  const {
    videoRef,
    start: startCamera,
    stop: stopCamera,
    error: cameraError,
  } = useMotionCamera({ onSwing: onMotionSwing });

  // 손이 인식되면(주먹이든 편 손바닥이든) 라켓이 그 위치를 따라가고,
  // 휘두르는 제스처가 나오면 handleSwing이 호출된다.
  const { getPose: getHandPose } = useHandTracking(
    videoRef,
    stage === "playing",
    handleSwing,
  );

  const getElapsed = useCallback(() => beat.elapsed(), [beat]);

  /** 공 스폰 루프 — 공 위치/수명은 전부 씬이 관리하므로 여기선 스폰만 한다 */
  useEffect(() => {
    if (stage !== "playing") return;

    const interval = 60 / Math.max(60, bpm);
    // 비트를 솎아 공을 줄인다. 음악적으로 자연스러운 배수(1,2,4,8)로만
    // 건너뛴다 — 3이나 5로 솎으면 박이 어긋나 들린다.
    const stride = clamp(
      2 ** Math.round(Math.log2(TARGET_BALL_GAP / interval)),
      1,
      8,
    );
    // 강박(Spotify 랠리 포인트)이 항상 공이 되도록 위상을 맞춘다
    const phase = hits.length
      ? Math.round((hits[0] * duration) / interval) % stride
      : 0;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      // elapsed()는 시작 전 0을 반환한다 — 가드가 없으면 가짜 공이 무더기로 나온다
      if (!beat.running) return;
      const t = beat.elapsed();

      for (const b of beat.upcoming(TRAVEL + 0.25)) {
        if (spawnedRef.current.has(b.id)) continue;
        if (b.time - t > TRAVEL + 0.1) continue;
        if (b.id % stride !== phase) continue;
        if (b.time - lastSpawnAtRef.current < MIN_BALL_GAP) continue;
        spawnedRef.current.add(b.id);
        lastSpawnAtRef.current = b.time;
        // 황금비 분포 — 연속으로 비슷한 레인이 나오지 않고 고르게 퍼진다
        const lane = 0.12 + ((b.id * 0.618033988749895) % 1) * 0.76;
        sceneRef.current?.spawnBall({
          id: b.id,
          hitAt: b.time,
          strong: b.strong,
          lane: (lane - 0.5) * 2 * LANE_HALF_SPAN,
        });
      }

      if (t > duration) setStage("done");
    };
    loop();
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [stage, beat, duration, bpm, hits]);

  /** 그립 표시 + 손 생존 여부 — 10Hz면 충분하고 렌더 부담이 없다 */
  useEffect(() => {
    if (stage !== "playing") return;
    const id = setInterval(() => {
      const pose = getHandPose();
      if (pose.present) handLiveRef.current = performance.now();
      setGrip(pose.present ? pose.curl : 0);
    }, 100);
    return () => clearInterval(id);
  }, [stage, getHandPose]);

  /** 스윙 파워 게이지는 서서히 내려간다 */
  useEffect(() => {
    if (swingPower === 0) return;
    const id = setTimeout(() => setSwingPower(0), 600);
    return () => clearTimeout(id);
  }, [swingPower]);

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
      <div className="absolute inset-0 bg-black/45" />

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
          {/* 3D 랠리 씬 — 라인 탁구대, 날아오는 공, 손을 따라오는 라켓이
              모두 같은 가상공간에 있다 */}
          <RallyScene
            ref={sceneRef}
            tiltRef={tiltRef}
            hasGyroRef={hasGyroRef}
            getHandPose={getHandPose}
            getElapsed={getElapsed}
            onBallMissed={handleBallMissed}
          />

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
            <div className="pointer-events-none absolute left-1/2 top-[14%] -translate-x-1/2 text-center">
              <p className="type-display text-[52px] leading-none text-primary">{combo}</p>
              <p className="type-eyebrow text-[10px] font-semibold uppercase text-white/80">
                combo
              </p>
            </div>
          )}

          {/* 판정 표시 */}
          {flash && (
            <div className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2">
              <p
                className={`type-display ${flash === "smash" ? "text-[56px]" : "text-[44px]"} ${
                  flash === "smash" || flash === "perfect"
                    ? "text-primary"
                    : flash === "good"
                      ? "text-white"
                      : "text-white/40"
                }`}
              >
                {flash === "smash"
                  ? t("rally.judge.smash")
                  : flash === "perfect"
                    ? t("rally.judge.perfect")
                    : flash === "good"
                      ? t("rally.judge.good")
                      : t("rally.judge.miss")}
              </p>
            </div>
          )}

          {/* 스윙 세기 + 그립 상태 */}
          <div className="absolute inset-x-5 bottom-5 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/20">
                <span
                  className="block h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{ width: `${swingPower * 100}%` }}
                />
              </span>
              <span className="type-caption text-[10px] text-white/60">
                {t("rally.hud.power")}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="type-caption text-[10px] text-white/60">
                {t("rally.hud.grip")}
              </span>
              <span
                className="size-4 rounded-full border-2 transition-colors duration-200"
                style={{
                  borderColor: grip > 0.05 ? "#f24822" : "rgba(255,255,255,0.3)",
                  background: `rgba(242,72,34,${grip * 0.8})`,
                }}
              />
            </div>
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
            lastSpawnAtRef.current = -Infinity;
            sceneRef.current?.reset();
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
          <li>· {t("rally.ready.instructions.reach")}</li>
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
