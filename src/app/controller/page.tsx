"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useControllerMotion } from "@/lib/rally/remote/useControllerMotion";
import { usePeerController } from "@/lib/rally/remote/usePeerController";
import type { HostMessage } from "@/lib/rally/remote/protocol";
import { useLocale } from "@/lib/i18n/useLocale";

/** 포즈 전송 주기(ms) — 40Hz. 60Hz까지 올려도 체감이 늘지 않고 채널만 붐빈다 */
const POSE_INTERVAL_MS = 25;

function Controller() {
  const params = useSearchParams();
  const { t } = useLocale();

  const urlCode = (params.get("c") ?? "").toUpperCase();
  const [typed, setTyped] = useState(urlCode);
  /** 실제로 연결을 시도 중인 코드 — 버튼을 눌러야 채워진다 */
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const [stage, setStage] = useState<"ready" | "playing" | "done">("ready");
  const [score, setScore] = useState(0);
  const [hitFlash, setHitFlash] = useState<string | null>(null);

  const onHostMessage = useCallback((m: HostMessage) => {
    if (!m || typeof m !== "object") return;
    if (m.t === "stage") setStage(m.stage);
    if (m.t === "judge") {
      setScore(m.score);
      setHitFlash(m.result);
      // 진동으로도 알려준다 — 폰을 휘두르는 중엔 화면을 계속 볼 수 없다.
      // 안 맞았을 땐 굳이 울리지 않는다(헛스윙마다 울리면 성가시다).
      if (m.result !== "miss") navigator.vibrate?.(m.result === "perfect" ? 40 : 20);
    }
  }, []);

  const { status, error, send } = usePeerController(activeCode, onHostMessage);

  const onSwing = useCallback(
    (power: number, dir: number) => {
      send({ t: "swing", power, dir });
    },
    [send],
  );

  const { getPose, requestPermission, granted, denied, live } = useControllerMotion(onSwing);

  // 연결 + 센서 권한이 모두 갖춰지면 그때부터 포즈를 흘려보낸다
  useEffect(() => {
    if (status !== "connected" || !granted) return;
    const id = setInterval(() => {
      const p = getPose();
      send({ t: "pose", x: p.x, y: p.y, roll: p.roll });
    }, POSE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status, granted, getPose, send]);

  useEffect(() => {
    if (!hitFlash) return;
    const id = setTimeout(() => setHitFlash(null), 240);
    return () => clearTimeout(id);
  }, [hitFlash]);

  /**
   * iOS는 클릭 핸들러 안에서 다른 await보다 먼저 권한을 요청해야만 창이
   * 뜬다 — 연결(await import)을 먼저 하면 조용히 무시된다. 그래서 권한을
   * 받고 나서야 activeCode를 채워 연결을 시작한다.
   */
  const handleConnect = useCallback(async () => {
    const ok = await requestPermission();
    if (!ok) return;
    const code = typed.trim().toUpperCase();
    if (code.length < 4) return;
    setActiveCode(code);
  }, [requestPermission, typed]);

  const connected = status === "connected";

  return (
    <div
      className={`flex h-dvh w-full flex-col justify-between p-6 transition-colors duration-150 ${
        hitFlash === "perfect"
          ? "bg-primary"
          : hitFlash === "good"
            ? "bg-[#1c1c1c]"
            : "bg-black"
      }`}
    >
      <div>
        <p className="type-eyebrow text-[11px] font-medium uppercase text-primary">
          {t("ctrl.eyebrow")}
        </p>
        <h1 className="type-display mt-2 whitespace-pre-line text-[34px] leading-[0.95] text-white">
          {t("ctrl.title")}
        </h1>
      </div>

      {connected ? (
        <div className="text-center">
          <p className="type-display text-[64px] leading-none text-white tabular-nums">
            {score}
          </p>
          <p className="mt-4 text-[15px] font-semibold text-white">
            {stage === "playing" ? t("ctrl.swingNow") : t("ctrl.waitStart")}
          </p>
          <p className="type-caption mt-2 whitespace-pre-line text-[12px] leading-relaxed text-white/60">
            {t("ctrl.hint")}
          </p>
          {!live && (
            <p className="type-caption mt-4 text-[12px] text-primary">{t("ctrl.noSensor")}</p>
          )}
        </div>
      ) : (
        <div>
          <label
            htmlFor="pair-code"
            className="type-caption block text-[12px] text-white/60"
          >
            {t("ctrl.enterCode")}
          </label>
          <input
            id="pair-code"
            value={typed}
            onChange={(e) => setTyped(e.target.value.toUpperCase().slice(0, 4))}
            placeholder="ABCD"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
            className="type-display mt-3 h-16 w-full rounded-lg bg-white/10 text-center text-[32px] tracking-[0.3em] text-white placeholder:text-white/25"
          />

          {status === "connecting" && (
            <p className="type-caption mt-3 text-[12px] text-white/60">
              {t("ctrl.connecting")}
            </p>
          )}
          {status === "lost" && (
            <p className="type-caption mt-3 text-[12px] text-primary">{t("ctrl.lost")}</p>
          )}
          {error && <p className="type-caption mt-3 text-[12px] text-primary">{error}</p>}
          {denied && (
            <p className="type-caption mt-3 text-[12px] text-primary">
              {t("ctrl.permissionDenied")}
            </p>
          )}
        </div>
      )}

      {connected ? (
        <p className="type-caption text-center text-[11px] text-white/40">
          {t("ctrl.keepOpen")}
        </p>
      ) : (
        <button
          type="button"
          onClick={handleConnect}
          disabled={typed.trim().length < 4 || status === "connecting"}
          className="tap h-14 w-full rounded-lg bg-primary text-[16px] font-semibold text-white disabled:opacity-40"
        >
          {status === "connecting" ? t("ctrl.connecting") : t("ctrl.connect")}
        </button>
      )}
    </div>
  );
}

export default function ControllerPage() {
  // useSearchParams는 정적 export에서 Suspense 경계를 요구한다(rally도 같은 패턴)
  return (
    <Suspense fallback={<div className="h-dvh w-full bg-black" />}>
      <Controller />
    </Suspense>
  );
}
