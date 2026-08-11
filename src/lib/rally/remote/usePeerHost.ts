"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { HandPose, Swing } from "@/lib/rally/useHandTracking";
import {
  makePairingCode,
  peerIdFor,
  type ControllerMessage,
  type HostMessage,
} from "./protocol";

export type HostStatus = "idle" | "opening" | "waiting" | "connected" | "error";

const IDLE_POSE: HandPose = {
  x: 0.5,
  y: 0.85,
  angle: 0,
  present: false,
  curl: 0,
  clarity: 0,
  vx: 0,
  vy: 0,
  speed: 0,
};

/**
 * PC(호스트) 쪽 — 폰 컨트롤러의 연결을 받아 그 입력을 카메라 손 추적과
 * 똑같은 모양으로 내보낸다.
 *
 * 반환하는 getPose가 useHandTracking의 것과 시그니처·좌표계가 같아서
 * RallyScene은 입력이 카메라인지 폰인지 알 필요가 없다 — page.tsx에서
 * 어느 쪽 getPose를 넘길지만 고르면 된다.
 *
 * enabled가 false인 동안은 브로커에 접속조차 하지 않는다. 카메라로 플레이
 * 하는 사람에게까지 불필요한 외부 연결을 열 이유가 없다.
 */
export function usePeerHost(enabled: boolean, onSwing?: (s: Swing) => void) {
  // enabled가 꺼져 있을 때의 "idle"은 상태로 저장하지 않고 아래에서 파생시킨다 —
  // 이펙트 본문에서 곧바로 setState하면 렌더가 한 번 더 도는 데다, 꺼진 상태는
  // 애초에 저장할 것도 없이 enabled만 보면 알 수 있는 값이다.
  const [rawCode, setCode] = useState<string | null>(null);
  const [rawStatus, setStatus] = useState<HostStatus>("opening");
  const [rawError, setError] = useState<string | null>(null);

  const poseRef = useRef<HandPose>(IDLE_POSE);
  // 매 렌더 새 함수여도 연결 이펙트가 재시작되지 않도록 ref에 담는다
  // (useHandTracking·useMotionCamera와 같은 패턴)
  const onSwingRef = useRef(onSwing);
  useEffect(() => {
    onSwingRef.current = onSwing;
  }, [onSwing]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- peerjs 동적 import
  const connRef = useRef<any>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let peer: any = null;

    // 코드가 이미 쓰이고 있으면 다른 코드로 다시 시도한다. 4글자라 흔한
    // 일은 아니지만, 부딪혔을 때 그냥 실패로 끝나면 사용자는 이유를 모른다.
    let attempts = 0;

    const open = async () => {
      // peerjs를 동적으로 불러온다 — 페어링을 안 쓰는 사람의 번들에까지
      // 넣을 이유가 없다. 상태 초기화도 이 await 뒤에서 하므로 이펙트
      // 본문에서 동기로 setState하는 일이 없다.
      const { default: Peer } = await import("peerjs");
      if (cancelled) return;
      setError(null);
      setStatus("opening");

      const next = makePairingCode();
      peer = new Peer(peerIdFor(next));

      peer.on("open", () => {
        if (cancelled) return;
        setCode(next);
        setStatus("waiting");
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      peer.on("error", (e: any) => {
        if (cancelled) return;
        if (e?.type === "unavailable-id" && attempts < 3) {
          attempts++;
          peer.destroy();
          open();
          return;
        }
        setStatus("error");
        setError(
          e?.type === "network" || e?.type === "server-error"
            ? "페어링 서버에 연결하지 못했어요. 잠시 후 다시 시도해주세요."
            : "연결에 실패했어요.",
        );
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      peer.on("connection", (conn: any) => {
        if (cancelled) return;
        // 이미 붙어 있는 컨트롤러가 있으면 새 연결은 거절한다 — 두 폰이
        // 동시에 라켓을 움직이면 서로 위치를 덮어써서 둘 다 안 맞는다.
        if (connRef.current?.open) {
          conn.close();
          return;
        }
        connRef.current = conn;

        conn.on("open", () => {
          if (!cancelled) setStatus("connected");
        });

        conn.on("data", (raw: unknown) => {
          const msg = raw as ControllerMessage;
          if (!msg || typeof msg !== "object") return;

          if (msg.t === "pose") {
            const prev = poseRef.current;
            poseRef.current = {
              ...prev,
              x: msg.x,
              y: msg.y,
              angle: msg.roll,
              present: true,
              // 폰을 쥐고 있다는 것 자체가 확실한 그립이다 — 카메라처럼
              // "주먹인지 편 손인지" 추정할 필요가 없으니 최대 신뢰도로 둔다.
              curl: 1,
              clarity: 1,
            };
          } else if (msg.t === "swing") {
            const p = poseRef.current;
            onSwingRef.current?.({
              power: msg.power,
              x: p.x,
              y: p.y,
              dir: msg.dir,
              at: performance.now(),
              // 폰은 공간 판정을 그대로 받는다 — 카메라 손 추적만큼
              // 위치가 정확하므로 "hand"와 같은 등급으로 취급한다.
              source: "hand",
            });
          }
        });

        const drop = () => {
          if (cancelled) return;
          connRef.current = null;
          poseRef.current = IDLE_POSE;
          setStatus("waiting");
        };
        conn.on("close", drop);
        conn.on("error", drop);
      });
    };

    open().catch(() => {
      if (!cancelled) {
        setStatus("error");
        setError("페어링을 시작하지 못했어요.");
      }
    });

    return () => {
      cancelled = true;
      connRef.current?.close?.();
      connRef.current = null;
      peer?.destroy?.();
      // 다음에 다시 켤 때 지난 세션의 라켓 위치가 한 프레임 스쳐 보이지 않게
      poseRef.current = IDLE_POSE;
    };
  }, [enabled]);

  // 꺼져 있으면 저장된 값이 뭐든 idle로 보여준다 — 껐다 켰을 때 이전
  // 세션의 코드나 에러가 잠깐 남아 보이는 것도 이걸로 같이 막힌다.
  const status: HostStatus = enabled ? rawStatus : "idle";
  const code = enabled ? rawCode : null;
  const error = enabled ? rawError : null;

  const getPose = useCallback(() => poseRef.current, []);

  /** 폰 화면에 상태를 되돌려준다 — 끊겨 있으면 조용히 무시한다 */
  const send = useCallback((msg: HostMessage) => {
    if (connRef.current?.open) connRef.current.send(msg);
  }, []);

  return { code, status, error, getPose, send };
}
