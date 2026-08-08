"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Tilt = { beta: number; gamma: number };

type IOSDeviceOrientationEvent = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/**
 * 자이로스코프 기울기 — ref로 흘려서 초당 수십 번 들어오는 이벤트가
 * 리렌더를 일으키지 않게 한다. 3D 렌더 루프가 매 프레임 직접 읽는다.
 */
export function useDeviceOrientation() {
  const tiltRef = useRef<Tilt>({ beta: 0, gamma: 0 });
  const [listening, setListening] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!listening) return;
    const handler = (e: DeviceOrientationEvent) => {
      tiltRef.current = { beta: e.beta ?? 0, gamma: e.gamma ?? 0 };
    };
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, [listening]);

  /**
   * 반드시 사용자 제스처(클릭 핸들러) 안에서, 다른 await보다 먼저 호출해야 한다.
   * iOS Safari는 클릭 직후가 아니면 권한 요청 자체를 무시하고 조용히 실패한다.
   */
  const requestPermission = useCallback(async () => {
    const DOE = (
      typeof DeviceOrientationEvent !== "undefined" ? DeviceOrientationEvent : undefined
    ) as IOSDeviceOrientationEvent | undefined;

    if (!DOE) return false;

    if (DOE.requestPermission) {
      try {
        const result = await DOE.requestPermission();
        if (result !== "granted") {
          setDenied(true);
          return false;
        }
      } catch {
        setDenied(true);
        return false;
      }
    }
    // Android 등 대부분의 브라우저는 별도 권한 절차 없이 바로 이벤트가 들어온다
    setListening(true);
    return true;
  }, []);

  return { tiltRef, requestPermission, denied };
}
