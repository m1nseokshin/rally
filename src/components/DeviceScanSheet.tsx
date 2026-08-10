"use client";

import { useEffect, useRef, useState } from "react";
import type { Device } from "@/lib/data";
import { IconCheck, IconDevice, IconPaddle } from "@/components/icons";
import { useLocale } from "@/lib/i18n/useLocale";

/**
 * 주변 기기 검색 시트 — 에어드롭처럼 하단에서 올라와, 레이더가 도는 동안
 * 기기가 하나씩 나타나고, 골라서 등록까지 끝낸다.
 *
 * 실제 블루투스 스캔이 아니라 연출이다. 웹에서 임의의 BLE 기기를 훑어보는
 * API는 없고(Web Bluetooth는 사용자가 기기를 직접 고르는 창을 띄우는 방식),
 * 애초에 Rally Vision·Paddle은 아직 존재하지 않는 하드웨어다.
 * 그래서 "찾는 척"이 아니라 흐름을 보여주는 목업으로 만들었다.
 */

/** 검색하면 발견되는 후보들 — 이미 등록된 기기는 호출부가 걸러낸다 */
const CANDIDATES: Device[] = [
  {
    id: "d4",
    name: "Rally Vision 2",
    kind: "xr",
    model: "Rally Vision Gen 2",
    connected: false,
    battery: 88,
    firmware: "v4.0.1",
  },
  {
    id: "d5",
    name: "라켓 L",
    kind: "paddle",
    model: "Rally Paddle Pro",
    connected: false,
    battery: 72,
    firmware: "v1.8.0",
    latencyMs: 13,
  },
  {
    id: "d6",
    name: "Rally Paddle Air",
    kind: "paddle",
    model: "Rally Paddle Air",
    connected: false,
    battery: 54,
    firmware: "v1.2.4",
    latencyMs: 18,
  },
];

type Phase = "scanning" | "found";

export default function DeviceScanSheet({
  knownIds,
  onAdd,
  onClose,
}: {
  /** 이미 목록에 있는 기기 id — 다시 찾아내지 않는다 */
  knownIds: string[];
  onAdd: (device: Device) => void;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const [phase, setPhase] = useState<Phase>("scanning");
  const [found, setFound] = useState<Device[]>([]);
  /** 등록 진행 중인 기기 id — 버튼이 스피너로 바뀐다 */
  const [pairing, setPairing] = useState<string | null>(null);
  const [paired, setPaired] = useState<string[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const pool = CANDIDATES.filter((c) => !knownIds.includes(c.id));

  useEffect(() => {
    // 기기가 한꺼번에 튀어나오면 "찾는 중"이 아니라 그냥 목록이다.
    // 시간차를 두고 하나씩 등장시켜야 탐색하는 느낌이 난다.
    const timers = timersRef.current;
    pool.forEach((device, i) => {
      timers.push(
        setTimeout(() => {
          setFound((prev) => (prev.some((d) => d.id === device.id) ? prev : [...prev, device]));
          setPhase("found");
        }, 900 + i * 850),
      );
    });
    return () => {
      for (const id of timers) clearTimeout(id);
      timers.length = 0;
    };
    // 마운트 시 한 번만 — pool은 렌더마다 새 배열이라 의존성에 넣으면 루프가 된다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pair(device: Device) {
    setPairing(device.id);
    const id = setTimeout(() => {
      setPairing(null);
      setPaired((prev) => [...prev, device.id]);
      onAdd({ ...device, connected: true });
    }, 1200);
    timersRef.current.push(id);
  }

  return (
    <div className="scrim-in fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label={t("settings.sheet.cancel")}
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        className="sheet-in relative flex max-h-[80dvh] w-full max-w-[402px] flex-col bg-canvas p-4"
        style={{
          paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
          borderTopLeftRadius: "var(--radius-panel)",
          borderTopRightRadius: "var(--radius-panel)",
          boxShadow: "var(--shadow-elevated)",
        }}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-hairline" />

        {/* 레이더 — 파장이 계속 퍼지며 "찾고 있다"를 보여준다 */}
        <div className="flex flex-col items-center py-4">
          <span className="relative flex size-20 items-center justify-center">
            {phase === "scanning" && (
              <>
                <span className="pulse-ring absolute inset-0 rounded-full border border-primary" />
                <span
                  className="pulse-ring absolute inset-0 rounded-full border border-primary"
                  style={{ animationDelay: "0.6s" }}
                />
              </>
            )}
            <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
              <IconDevice size={26} />
            </span>
          </span>
          <p className="mt-4 text-[15px] font-semibold text-ink">
            {phase === "scanning"
              ? t("devices.scan.active.title")
              : t("devices.scan.found.title", { count: found.length })}
          </p>
          <p className="type-caption mt-1 text-[12px] text-mute">
            {t("devices.scan.active.desc")}
          </p>
        </div>

        {/* 발견된 기기 — 하나씩 밀려 들어온다 */}
        <div className="rail min-h-0 flex-1 overflow-y-auto">
          {found.length === 0 ? (
            <p className="type-caption py-6 text-center text-[12px] text-stone">
              {pool.length === 0
                ? t("devices.scan.allAdded")
                : t("devices.scan.searching")}
            </p>
          ) : (
            <ul className="stagger">
              {found.map((d) => {
                const isPaired = paired.includes(d.id);
                return (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 border-b border-hairline-soft py-3 last:border-b-0"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-cloud text-ink">
                      {d.kind === "xr" ? <IconDevice size={20} /> : <IconPaddle size={20} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink">
                        {d.name}
                      </span>
                      <span className="block truncate text-[12px] text-mute">
                        {d.model} · {t("devices.scan.battery", { battery: d.battery })}
                      </span>
                    </span>
                    {isPaired ? (
                      <span className="flex items-center gap-1.5 text-[12px] font-medium text-success">
                        <IconCheck size={14} />
                        {t("devices.scan.added")}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => pair(d)}
                        disabled={pairing === d.id}
                        className="tap h-9 shrink-0 rounded-lg bg-ink px-4 text-[12px] font-semibold text-canvas disabled:opacity-60"
                      >
                        {pairing === d.id
                          ? t("devices.scan.pairing")
                          : t("devices.scan.add")}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="tap mt-3 h-12 w-full shrink-0 rounded-lg bg-cloud text-[15px] font-semibold text-ink"
        >
          {t("devices.scan.done")}
        </button>
      </div>
    </div>
  );
}
