"use client";

import { useState } from "react";
import { devices as seed, type Device } from "@/lib/data";
import { PageHeader, SectionTitle } from "@/components/ui";
import { IconDevice, IconPaddle, IconPlus, IconChevron, IconCheck } from "@/components/icons";
import { useLocale } from "@/lib/i18n/useLocale";
import DeviceScanSheet from "@/components/DeviceScanSheet";

type CalibrateState = "idle" | "running" | "done";

export default function DevicesPage() {
  const { t } = useLocale();
  const [devices, setDevices] = useState<Device[]>(seed);
  const [scanning, setScanning] = useState(false);
  const [calibrate, setCalibrate] = useState<CalibrateState>("idle");
  // 화살표 눌러 여는 기기 상세 시트 — null이면 닫힘
  const [detailId, setDetailId] = useState<string | null>(null);

  function toggle(id: string) {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, connected: !d.connected, battery: d.connected ? 0 : 47 }
          : d,
      ),
    );
  }

  function forget(id: string) {
    setDevices((prev) => prev.filter((d) => d.id !== id));
    setDetailId(null);
  }

  /** 검색 시트를 연다 — 실제 탐색 연출과 등록은 시트가 맡는다 */
  function scan() {
    setScanning(true);
  }

  /** 시트에서 등록을 마친 기기를 목록에 넣는다 */
  function addDevice(device: Device) {
    setDevices((prev) => (prev.some((d) => d.id === device.id) ? prev : [...prev, device]));
  }

  function calibrateStart() {
    setCalibrate("running");
    setTimeout(() => {
      setCalibrate("done");
      setTimeout(() => setCalibrate("idle"), 1800);
    }, 1800);
  }

  const xr = devices.filter((d) => d.kind === "xr");
  const paddles = devices.filter((d) => d.kind === "paddle");
  const connectedCount = devices.filter((d) => d.connected).length;
  const detailDevice = devices.find((d) => d.id === detailId) ?? null;

  return (
    <div className="pb-8">
      <PageHeader
        eyebrow={t("devices.eyebrow", { count: connectedCount })}
        title={t("devices.title")}
        desc={t("devices.desc")}
      />

      {/* 스캔 상태 */}
      <section className="px-6">
        <div
          className="relative flex items-center gap-4 bg-cloud px-5 py-5"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <span className="relative flex size-12 shrink-0 items-center justify-center">
            {scanning && (
              <span className="pulse-ring absolute inset-0 rounded-full border-2 border-primary" />
            )}
            <span className="flex size-12 items-center justify-center rounded-full bg-primary text-on-primary">
              <IconPlus size={22} />
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold text-ink">
              {scanning ? t("devices.scan.active.title") : t("devices.scan.idle.title")}
            </p>
            <p className="text-[13px] text-mute">
              {scanning ? t("devices.scan.active.desc") : t("devices.scan.idle.desc")}
            </p>
          </div>
          <button
            type="button"
            onClick={scan}
            disabled={scanning}
            className="tap h-9 shrink-0 rounded-lg bg-ink px-5 text-[13px] font-semibold text-canvas disabled:opacity-40"
          >
            {scanning ? t("devices.scan.button.active") : t("devices.scan.button")}
          </button>
        </div>
      </section>

      {/* XR */}
      {xr.length > 0 && (
        <section className="mt-9">
          <SectionTitle>{t("devices.section.xr")}</SectionTitle>
          <div className="stagger border-t border-hairline-soft">
            {xr.map((d) => (
              <DeviceRow
                key={d.id}
                device={d}
                onToggle={() => toggle(d.id)}
                onOpenDetail={() => setDetailId(d.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 라켓 */}
      {paddles.length > 0 && (
        <section className="mt-9">
          <SectionTitle>{t("devices.section.paddle")}</SectionTitle>
          <div className="border-t border-hairline-soft">
            {paddles.map((d) => (
              <DeviceRow
                key={d.id}
                device={d}
                onToggle={() => toggle(d.id)}
                onOpenDetail={() => setDetailId(d.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 보정 — 항상 어두운 패널. 리터럴 black/white로 다크모드와 무관하게 고정 */}
      <section className="mt-10 px-6">
        <div className="bg-black p-6" style={{ borderRadius: "var(--radius-panel)" }}>
          <p className="type-eyebrow text-[12px] font-medium uppercase text-primary">
            {t("devices.calibrate.eyebrow")}
          </p>
          <h2 className="type-display mt-2 whitespace-pre-line text-[30px] leading-[0.9] text-white">
            {t("devices.calibrate.title")}
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-white/60">
            {t("devices.calibrate.desc")}
          </p>
          <button
            type="button"
            onClick={calibrateStart}
            disabled={calibrate !== "idle"}
            className="tap mt-5 flex h-11 items-center gap-2 rounded-lg bg-white px-6 text-[14px] font-semibold text-black disabled:opacity-70"
          >
            {calibrate === "running" && (
              <span className="size-3.5 animate-spin rounded-full border-2 border-black/30 border-t-black" />
            )}
            {calibrate === "done" && <IconCheck size={15} />}
            {calibrate === "idle" && t("devices.calibrate.cta")}
            {calibrate === "running" && t("devices.calibrate.inProgress")}
            {calibrate === "done" && t("devices.calibrate.done")}
          </button>
        </div>
      </section>

      {detailDevice && (
        <DeviceDetailSheet
          device={detailDevice}
          onClose={() => setDetailId(null)}
          onForget={() => forget(detailDevice.id)}
        />
      )}
      {scanning && (
        <DeviceScanSheet
          knownIds={devices.map((d) => d.id)}
          onAdd={addDevice}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  );
}

function DeviceRow({
  device,
  onToggle,
  onOpenDetail,
}: {
  device: Device;
  onToggle: () => void;
  onOpenDetail: () => void;
}) {
  const { t } = useLocale();
  const Icon = device.kind === "xr" ? IconDevice : IconPaddle;

  return (
    <div className="border-b border-hairline-soft px-6 py-4">
      <div className="flex items-center gap-4">
        <span
          className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
            device.connected ? "bg-primary-soft text-primary" : "bg-cloud text-stone"
          }`}
        >
          <Icon size={20} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            {device.name}
            {device.updateAvailable && (
              <span className="rounded-lg border border-hairline px-2 py-1 text-[10px] font-medium text-mute">
                {t("devices.update")}
              </span>
            )}
          </p>
          <p className="text-[13px] text-mute">
            {device.model} · {device.firmware}
          </p>
        </div>

        <button
          type="button"
          onClick={onToggle}
          className={`tap h-9 shrink-0 rounded-lg px-4 text-[12px] font-semibold ${
            device.connected
              ? "border border-hairline bg-canvas text-ink"
              : "bg-ink text-canvas"
          }`}
        >
          {device.connected ? t("devices.disconnect") : t("devices.connect")}
        </button>
      </div>

      {device.connected && (
        <div className="mt-4 flex items-center gap-5 pl-15">
          <BatteryBar level={device.battery} />
          {device.latencyMs !== undefined && (
            <span className="text-[12px] font-medium text-mute tabular-nums">
              {t("devices.latency", { ms: device.latencyMs })}
            </span>
          )}
          <button
            type="button"
            onClick={onOpenDetail}
            className="tap ml-auto flex items-center gap-1 text-[12px] font-medium text-mute"
          >
            {t("devices.settings")}
            <IconChevron size={13} className="text-stone" />
          </button>
        </div>
      )}
    </div>
  );
}

/** 기기 화살표를 누르면 뜨는 상세 시트 — Spotify 박스 레이아웃(8px 라운드·강한 그림자) */
function DeviceDetailSheet({
  device,
  onClose,
  onForget,
}: {
  device: Device;
  onClose: () => void;
  onForget: () => void;
}) {
  const { t } = useLocale();
  return (
    <div className="scrim-in fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label={t("devices.detail.close")}
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        className="sheet-in relative w-full max-w-[402px] bg-canvas p-4 pb-6"
        style={{
          borderTopLeftRadius: "var(--radius-panel)",
          borderTopRightRadius: "var(--radius-panel)",
          boxShadow: "var(--shadow-elevated)",
        }}
      >
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-hairline" />

        <p className="type-eyebrow text-[11px] font-medium uppercase text-primary">
          {t("devices.detail.title")}
        </p>
        <h3 className="type-display mt-1 text-[26px] text-ink">{device.name}</h3>
        <p className="text-[13px] text-mute">{device.model}</p>

        <div className="mt-4 divide-y divide-hairline-soft border-t border-hairline-soft">
          <DetailRow label={t("devices.detail.firmware")} value={device.firmware} />
          <DetailRow label={t("devices.detail.battery")} value={`${device.battery}%`} />
          {device.latencyMs !== undefined && (
            <DetailRow
              label={t("devices.detail.latency")}
              value={t("devices.latency", { ms: device.latencyMs })}
            />
          )}
        </div>

        <button
          type="button"
          onClick={onForget}
          className="tap mt-6 h-12 w-full rounded-lg border border-hairline text-[14px] font-semibold text-primary"
        >
          {t("devices.detail.forget")}
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <span className="text-[13px] text-mute">{label}</span>
      <span className="text-[13px] font-semibold text-ink">{value}</span>
    </div>
  );
}

function BatteryBar({ level }: { level: number }) {
  const low = level < 25;
  return (
    <span className="flex items-center gap-2">
      <span className="h-2 w-16 overflow-hidden rounded-full bg-hairline-soft">
        <span
          className={`block h-full rounded-full ${low ? "bg-primary" : "bg-ink"}`}
          style={{ width: `${level}%` }}
        />
      </span>
      <span className="text-[12px] font-medium text-mute tabular-nums">{level}%</span>
    </span>
  );
}
