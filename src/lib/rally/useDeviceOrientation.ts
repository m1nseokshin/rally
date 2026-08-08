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
  // beta 90 = 폰을 세로로 든 자세 = 기울기 0. 0으로 시작하면 자이로가 없는
  // 데스크톱에서 pitch가 -90(클램프 -50)으로 계산돼 라켓이 영구히 처박힌다.
  const tiltRef = useRef<Tilt>({ beta: 90, gamma: 0 });
  // 실제 이벤트가 한 번이라도 들어왔는가 — 렌더 루프가 이걸 보고 자이로 회전을
  // 반영할지 정한다. 이벤트가 없는 기기에서 초기값을 진짜 기울기로 착각하면 안 된다.
  const hasGyroRef = useRef(false);
  const [listening, setListening] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!listening) return;
    const handler = (e: DeviceOrientationEvent) => {
      // beta/gamma가 모두 null이면 센서가 없는 기기다 — 신호로 치지 않는다
      if (e.beta === null && e.gamma === null) return;
      hasGyroRef.current = true;
      tiltRef.current = { beta: e.beta ?? 90, gamma: e.gamma ?? 0 };
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

  return { tiltRef, hasGyroRef, requestPermission, denied };
}
