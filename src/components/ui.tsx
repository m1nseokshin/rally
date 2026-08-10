"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { IconChevron, IconCheck } from "./icons";
import { useCountUp } from "@/lib/useCountUp";
import { useSheetDrag } from "@/lib/useSheetDrag";

/** 0에서 목표 숫자까지 올라가는 표시 — StatTile 안에서만 쓴다 */
function CountUp({ value }: { value: number }) {
  return <>{useCountUp(value)}</>;
}

/** 페이지 상단 — 대문자 디스플레이 타이틀 + 보조 카피 */
export function PageHeader({
  eyebrow,
  title,
  desc,
}: {
  eyebrow?: string;
  title: string;
  desc?: string;
}) {
  return (
    <header className="px-6 pb-5" style={{ paddingTop: "clamp(28px, 12dvh, 30dvh)" }}>
      {eyebrow && (
        <p className="type-eyebrow mb-2 text-[12px] font-medium uppercase text-primary">
          {eyebrow}
        </p>
      )}
      <h1 className="type-display text-[44px] text-ink">{title}</h1>
      {desc && <p className="mt-2 text-[14px] leading-relaxed text-mute">{desc}</p>}
    </header>
  );
}

/** 섹션 헤더 — 좌측 타이틀, 우측 선택적 액션 */
export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between px-6">
      <h2 className="text-[16px] font-semibold leading-tight text-ink">{children}</h2>
      {action}
    </div>
  );
}

/**
 * 밑줄 쳐진 보조 액션 — href나 onClick 없이 쓰면 눌러도 아무 일 안
 * 일어나는 "가짜 링크"가 된다(실제로 그런 버그가 있었다). 둘 중 하나는
 * 반드시 넘기도록 강제한다.
 */
export function LinkAction(
  props: { children: ReactNode } & (
    | { href: string; onClick?: never }
    | { href?: never; onClick: () => void }
  ),
) {
  const className = "tap text-[13px] font-medium text-mute underline underline-offset-4";
  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={className}>
        {props.children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={props.onClick} className={className}>
      {props.children}
    </button>
  );
}

/** 검정 알약 CTA — 뷰포트당 하나 */
export function PillButton({
  children,
  variant = "primary",
  full,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  variant?: "primary" | "brand" | "secondary";
  full?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const styles = {
    primary: "bg-ink text-canvas",
    brand: "bg-primary text-on-primary",
    secondary: "bg-cloud text-ink",
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      className={`tap inline-flex h-12 items-center justify-center rounded-lg px-8 text-[15px] font-semibold ${styles} ${
        full ? "w-full" : ""
      }`}
    >
      {children}
    </button>
  );
}

/** 필터 칩 — 선택 시 완전 반전 */
export function Chip({
  children,
  active,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap h-9 shrink-0 rounded-lg px-4 text-[13px] font-medium ${
        active
          ? "bg-ink text-canvas"
          : "border border-hairline bg-canvas text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * 하드라인 구분 리스트 행. onClick이 없으면 정보 표시일 뿐이니
 * 화살표(chevron)도, 탭 피드백도 넣지 않는다 — 누를 수 있어 보이는데
 * 눌러도 아무 일이 안 일어나는 게 "이상한 인터랙션"의 흔한 원인이다.
 */
export function Row({
  label,
  value,
  onClick,
}: {
  label: ReactNode;
  value?: ReactNode;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="text-[15px] font-medium text-ink">{label}</span>
      <span className="flex items-center gap-2 text-[14px] text-mute">
        {value}
        {onClick && <IconChevron size={16} className="text-stone" />}
      </span>
    </>
  );

  if (!onClick) {
    return (
      <div className="flex items-center justify-between border-b border-hairline-soft px-6 py-5">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="tap flex w-full items-center justify-between border-b border-hairline-soft px-6 py-5 text-left"
    >
      {content}
    </button>
  );
}

/** 수치 강조 타일 — 숫자는 0에서 올라간다 */
export function StatTile({
  label,
  value,
  unit,
  tone = "ink",
}: {
  label: string;
  value: string | number;
  unit?: string;
  tone?: "ink" | "primary" | "success";
}) {
  const color = {
    ink: "text-ink",
    primary: "text-primary",
    success: "text-success",
  }[tone];

  return (
    <div className="bg-cloud px-4 py-4" style={{ borderRadius: "var(--radius-card)" }}>
      <p className="text-[12px] font-medium text-mute">{label}</p>
      <p className="mt-2 flex items-baseline gap-1">
        <span
          className={`type-display type-display-sm text-[32px] leading-none tabular-nums ${color}`}
        >
          {typeof value === "number" ? <CountUp value={value} /> : value}
        </span>
        {unit && (
          <span
            className="text-[12px] font-semibold leading-none text-mute"
            style={{ fontFamily: "var(--font-pretendard)" }}
          >
            {unit}
          </span>
        )}
      </p>
    </div>
  );
}

/**
 * iOS 스타일 액션시트 — 옵션 리스트 + 취소 버튼이 하단에서 올라온다.
 * 설정의 "기본 난이도"/"알림"처럼 값 하나를 고르는 Row에서 쓴다.
 */
export function ActionSheet<T extends string>({
  title,
  options,
  value,
  onSelect,
  onClose,
  cancelLabel,
}: {
  title: string;
  options: { value: T; label: string }[];
  value: T;
  onSelect: (v: T) => void;
  onClose: () => void;
  cancelLabel: string;
}) {
  const { handleProps, sheetStyle } = useSheetDrag(onClose);
  return (
    <div className="scrim-in fixed inset-0 z-50 flex items-end justify-center">
      <button
        type="button"
        aria-label={cancelLabel}
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        className="sheet-in relative w-full max-w-[402px] bg-canvas p-4 pb-6"
        style={{
          borderTopLeftRadius: "var(--radius-panel)",
          borderTopRightRadius: "var(--radius-panel)",
          boxShadow: "var(--shadow-elevated)",
          ...sheetStyle,
        }}
      >
        {/* 손잡이 — 여기서 아래로 끌면 손가락을 그대로 따라오다가 놓는 순간
            닫힘/복귀가 정해진다. 목록(옵션 버튼들)까지 드래그 영역으로
            잡으면 탭이 드래그로 오인될 수 있어 손잡이만 잡는다. */}
        <div className="touch-none py-1" {...handleProps}>
          <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-hairline" />
        </div>
        <p className="type-caption mb-2 px-2 text-[12px] font-medium text-mute">{title}</p>
        <div className="overflow-hidden" style={{ borderRadius: "var(--radius-card)" }}>
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onSelect(opt.value);
                  onClose();
                }}
                aria-pressed={active}
                className={`tap flex w-full items-center justify-between border-b border-hairline-soft bg-cloud px-4 py-4 text-left text-[15px] last:border-b-0 ${
                  active ? "font-semibold text-primary" : "font-medium text-ink"
                }`}
              >
                {opt.label}
                {active && <IconCheck size={16} />}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="tap mt-2 h-12 w-full text-[15px] font-semibold text-primary"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  );
}

/** 난이도 5단계 표시 */
export function Difficulty({ level }: { level: number }) {
  return (
    <span className="flex items-center gap-[3px]" aria-label={`난이도 ${level}단계`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`h-[3px] w-[7px] rounded-full ${
            i < level ? "bg-primary" : "bg-hairline"
          }`}
        />
      ))}
    </span>
  );
}
