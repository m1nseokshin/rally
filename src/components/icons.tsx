type P = { className?: string; size?: number };

const base = (size = 24) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IconHome = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9.5V20h13V9.5" />
  </svg>
);

export const IconPlay = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M7 4.5v15l12-7.5-12-7.5Z" />
  </svg>
);

export const IconWave = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 12v0" />
    <path d="M7.5 8.5v7" />
    <path d="M11 5v14" />
    <path d="M14.5 9v6" />
    <path d="M18 6.5v11" />
    <path d="M21 10.5v3" />
  </svg>
);

export const IconDevice = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M2.5 10.5a3 3 0 0 1 3-3h13a3 3 0 0 1 3 3v3a2.5 2.5 0 0 1-2.5 2.5h-1.7a2 2 0 0 1-1.6-.8l-.9-1.2a2 2 0 0 0-1.6-.8h-1.4a2 2 0 0 0-1.6.8l-.9 1.2a2 2 0 0 1-1.6.8H5a2.5 2.5 0 0 1-2.5-2.5Z" />
  </svg>
);

export const IconInsight = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 20V10" />
    <path d="M10 20V4" />
    <path d="M16 20v-7" />
    <path d="M22 20H2" />
  </svg>
);

export const IconChevron = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);

export const IconBack = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m15 5-7 7 7 7" />
  </svg>
);

export const IconPlus = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconCheck = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="m4.5 12.5 5 5 10-11" />
  </svg>
);

export const IconHeart = ({ className, size, filled }: P & { filled?: boolean }) => (
  <svg {...base(size)} className={className} fill={filled ? "currentColor" : "none"}>
    <path d="M12 20.2s-7.5-4.4-9.9-9C.6 7.9 2.3 4.5 5.6 4c2-.3 3.9.6 5 2.2.9-1.4 3-2.5 5-2.2 3.3.5 5 3.9 3.5 7.2-2.4 4.6-9.9 9-9.9 9Z" />
  </svg>
);

export const IconBattery = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="2.5" y="8" width="16" height="8" rx="2.5" />
    <path d="M21 11v2" />
  </svg>
);

export const IconSearch = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

export const IconPaddle = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M14.5 3.2c3.2 1.4 4.6 5.3 3 8.6-1.6 3.3-5.5 4.7-8.7 3.2S4.2 9.7 5.8 6.4c1.6-3.3 5.5-4.7 8.7-3.2Z" />
    <path d="m9.6 15.4-3 5.1" />
    <path d="m11.8 16-2.4 4.2" />
  </svg>
);

export const IconSettings = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    {/* 톱니 6개를 단순 방사형 눈금으로 — 기존 커스텀 곡선 패스가 작은
        크기에서 뭉개져 보인다는 피드백에 원·직선만으로 다시 그렸다 */}
    <circle cx="12" cy="12" r="7.5" />
    <circle cx="12" cy="12" r="2.8" />
    <path d="M19.5 12h2.7M16.15 18.4l1.35 2.34M7.85 18.4l-1.35 2.34M4.5 12H1.8M7.85 5.6 6.5 3.26M16.15 5.6l1.35-2.34" />
  </svg>
);

export const IconCamera = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <path d="M4 8.5a2 2 0 0 1 2-2h1.2l.9-1.6a1.5 1.5 0 0 1 1.3-.9h5.2a1.5 1.5 0 0 1 1.3.9l.9 1.6H18a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8.5Z" />
    <circle cx="12" cy="13" r="3.4" />
  </svg>
);

export const IconSpotify = ({ className, size = 24 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.6 14.4a.75.75 0 0 1-1 .25c-2.8-1.7-6.3-2.1-10.4-1.2a.75.75 0 1 1-.33-1.46c4.5-1 8.4-.55 11.5 1.35.35.22.46.7.24 1.06Zm1.23-2.9a.94.94 0 0 1-1.3.3c-3.2-2-8.1-2.55-11.9-1.4a.94.94 0 1 1-.55-1.8c4.34-1.3 9.74-.68 13.4 1.6.44.27.58.85.3 1.3Zm.1-3.02c-3.84-2.28-10.18-2.5-13.85-1.38a1.13 1.13 0 1 1-.65-2.16C7.65 5.66 14.65 5.92 19.07 8.54a1.13 1.13 0 0 1-1.15 1.94Z" />
  </svg>
);

