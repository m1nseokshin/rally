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

/**
 * 브랜드 워드마크(로고 파일 그대로) — 흰 버전 하나만 둔다. 지금 유일하게
 * 쓰는 자리(스플래시)가 항상 검은 배경이라 다크모드 분기가 필요 없다.
 * 폰트로 "Rally"를 그리는 대신 실제 로고 벡터를 쓰면 워드마크의 실제
 * 커브(마크+글자 간격)가 브랜드 자산과 정확히 일치한다.
 */
export const LogoWordmarkWhite = ({ className, width = 180 }: { className?: string; width?: number }) => (
  <svg
    className={className}
    width={width}
    height={(width * 72.57) / 314.87}
    viewBox="0 0 314.87 72.57"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fill="#fff"
      d="M160.41,2.66l15.52.28c5.4.1,9.31,1.44,11.74,4.02,2.43,2.52,3.6,6.38,3.5,11.59l-.07,4.09c-.13,6.92-2.49,11.26-7.1,13.01v.19c2.52.81,4.27,2.4,5.24,4.76,1.04,2.37,1.52,5.52,1.45,9.46l-.21,11.71c-.03,1.9,0,3.46.1,4.67.11,1.14.4,2.29.89,3.44l-10.66-.2c-.36-1.09-.6-2.11-.71-3.06-.11-.95-.14-2.67-.1-5.14l.22-12.19c.06-3.05-.41-5.18-1.41-6.41-.93-1.22-2.6-1.86-5.01-1.9l-3.62-.07-.52,28.57-10.47-.19,1.22-66.65ZM174.08,31.52c2.1,0,3.65-.54,4.67-1.62,1.08-1.08,1.62-2.89,1.62-5.43v-5.14c0-2.41-.44-4.16-1.33-5.24-.83-1.08-2.16-1.62-4-1.62h-4.76v19.05h3.81ZM203.45,2.95h14.19l10.86,66.66h-10.48l-1.9-13.24v.19h-11.9l-1.9,13.05h-9.71L203.45,2.95ZM214.87,47.52l-4.67-32.95h-.19l-4.57,32.95h9.43ZM230.72,2.95h10.48v57.14h17.24v9.52h-27.71V2.95ZM260.6,2.95h10.48v57.14h17.24v9.52h-27.71V2.95ZM291.73,41.24l-12.67-38.28h11.14l7.14,24.48h.19l7.14-24.48h10.19l-12.67,38.28v28.38h-10.48v-28.38Z"
    />
    <path
      fill="#fff"
      d="M89.63,72.45c3.86-14.77,8.65-34.17,8.29-49.14-.07-2.93-.48-5.79-1.57-8.4-1.23-2.96-4.04-4.14-7.09-3.13s-5.58,2.54-8.1,4.42c-8.92,6.64-17.92,16.36-25.36,24.86-8.93,10.2-17.29,20.72-25.4,31.44H0s9.68-10.76,9.68-10.76c9.93-10.86,20.1-21.24,31.05-31.1,5.64-5.08,11.25-9.86,17.27-14.39,10.25-7.72,26.24-18.89,39.06-15.67,5.44,1.37,9.29,5.42,11.23,10.6,1.88,5.01,2.27,10.2,2.5,15.54l-.03,7.44-.21,6.83-.27,4.63c-.44,7.54-1.93,15.91,6.71,16.84,3.43.17,6.54-.79,10.38-1.62l-11.32,11.73-23.14.02-3.25-.11Z"
    />
  </svg>
);

export const IconStop = ({ className, size }: P) => (
  <svg {...base(size)} className={className}>
    <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
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

/**
 * Spotify 로고 — 꽉 찬 원에서 음파 세 줄이 "뚫려" 있는 형태.
 *
 * 음파를 흰색으로 칠하지 않고 구멍으로 두는 게 핵심이다. currentColor 하나로
 * 원만 칠하면, 라이트 모드에선 검은 원 + 흰 음파(배경이 비침), 다크 모드에선
 * 흰 원 + 어두운 음파가 저절로 된다 — 모드별로 아이콘을 갈아끼울 필요가 없다.
 * (음파 서브패스가 원과 반대 방향으로 감겨 있어 기본 nonzero 규칙에서 비워진다.)
 */
export const IconSpotify = ({ className, size = 24 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.601.301.96zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
  </svg>
);

