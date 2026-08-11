"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { peerIdFor, type ControllerMessage, type HostMessage } from "./protocol";

export type ControllerStatus = "idle" | "connecting" | "connected" | "lost" | "error";

/**
 * 폰(컨트롤러) 쪽 — 페어링 코드로 PC 호스트에 붙고, 센서 값을 흘려보낸다.
 *
 * code가 null이면 아무것도 하지 않는다(코드 없이 /controller에 들어온 경우).
 */
export function usePeerController(code: string | null, onHostMessage?: (m: HostMessage) => void) {
  const [status, setStatus] = useState<ControllerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- peerjs 동적 import
  const connRef = useRef<any>(null);

  const onHostMessageRef = useRef(onHostMessage);
  useEffect(() => {
    onHostMessageRef.current = onHostMessage;
  }, [onHostMessage]);

  useEffect(() => {
    if (!code) return;

    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let peer: any = null;

    (async () => {
      // 상태 초기화를 이 await 뒤로 미룬다 — 이펙트 본문에서 동기로
      // setState하면 렌더가 한 번 더 돈다.
      const { default: Peer } = await import("peerjs");
      if (cancelled) return;
      setStatus("connecting");
      setError(null);

      peer = new Peer();
      peer.on("open", () => {
        if (cancelled) return;
        // reliable: false — 순서 보장·재전송을 끄고 지연을 줄인다. 포즈는
        // 초당 수십 번 새로 오니 한 개쯤 유실돼도 다음 값이 바로 덮는다.
        // (스윙도 마찬가지로, 늦게 도착한 스윙은 이미 판정이 지나가 있어
        //  재전송돼봐야 쓸모가 없다.)
        const conn = peer.connect(peerIdFor(code), { reliable: false });
        connRef.current = conn;

        conn.on("open", () => {
          if (cancelled) return;
          setStatus("connected");
          conn.send({ t: "hello", name: "phone" } satisfies ControllerMessage);
        });
        conn.on("data", (raw: unknown) => {
          onHostMessageRef.current?.(raw as HostMessage);
        });
        conn.on("close", () => {
          if (!cancelled) setStatus("lost");
        });
        conn.on("error", () => {
          if (!cancelled) setStatus("lost");
        });
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      peer.on("error", (e: any) => {
        if (cancelled) return;
        setStatus("error");
        // peer-unavailable = 그 코드의 호스트가 없다. 코드를 잘못 쳤거나
        // PC 쪽 페어링 화면을 이미 닫은 경우라 안내가 달라야 한다.
        setError(
          e?.type === "peer-unavailable"
            ? "그 코드의 화면을 찾지 못했어요. PC 화면의 코드를 다시 확인해주세요."
            : "연결에 실패했어요. 네트워크를 확인해주세요.",
        );
      });
    })().catch(() => {
      if (!cancelled) {
        setStatus("error");
        setError("연결을 시작하지 못했어요.");
      }
    });

    return () => {
      cancelled = true;
      connRef.current?.close?.();
      connRef.current = null;
      peer?.destroy?.();
    };
  }, [code]);

  const send = useCallback((msg: ControllerMessage) => {
    if (connRef.current?.open) connRef.current.send(msg);
  }, []);

  return { status, error, send };
}
