// 목업 데이터 — 실제 연동 전까지 화면 검증용

export type Provider = "spotify";

export type Track = {
  id: string;
  title: string;
  artist: string;
  provider: Provider;
  /** 초 단위 길이 */
  duration: number;
  bpm: number;
  /** 분석 완료 여부 */
  analyzed: boolean;
  /** 난이도 1~5 */
  difficulty: number;
  /** 베이스 강조 지점 비율 0~1 */
  hits: number[];
  /** 커버 그라디언트 — 목업 트랙, 또는 실제 앨범 아트가 없을 때 폴백 */
  cover: [string, string];
  /** 실제 앨범 아트 URL — Spotify 연동 트랙에 존재 */
  image?: string;
  /** 30초 미리듣기 mp3 — Spotify가 신규 앱엔 제공하지 않는 경우가 많다 */
  previewUrl?: string;
};

export type Device = {
  id: string;
  name: string;
  kind: "xr" | "paddle";
  model: string;
  connected: boolean;
  battery: number;
  /** 펌웨어 */
  firmware: string;
  /** 업데이트 필요 */
  updateAvailable?: boolean;
  /** 탁구채 전용 — 그립 보정값 */
  latencyMs?: number;
};

export type SessionLog = {
  id: string;
  time: string;
  trackTitle: string;
  minutes: number;
  /** 집중 점수 0~100 */
  focus: number;
  accuracy: number;
  maxCombo: number;
};

export const tracks: Track[] = [
  {
    id: "t1",
    title: "Midnight Drive",
    artist: "Neon Youth",
    provider: "spotify",
    duration: 214,
    bpm: 128,
    analyzed: true,
    difficulty: 3,
    hits: [0.08, 0.17, 0.26, 0.34, 0.41, 0.5, 0.58, 0.67, 0.74, 0.83, 0.91],
    cover: ["#f24822", "#ffb199"],
  },
  {
    id: "t2",
    title: "Bassline Theory",
    artist: "KODA",
    provider: "spotify",
    duration: 187,
    bpm: 142,
    analyzed: true,
    difficulty: 5,
    hits: [0.05, 0.12, 0.2, 0.27, 0.33, 0.4, 0.47, 0.55, 0.62, 0.7, 0.79, 0.88, 0.95],
    cover: ["#111111", "#4b4b4d"],
  },
  {
    id: "t5",
    title: "Overdrive",
    artist: "SEOUL 88",
    provider: "spotify",
    duration: 198,
    bpm: 150,
    analyzed: true,
    difficulty: 4,
    hits: [0.06, 0.14, 0.21, 0.29, 0.36, 0.45, 0.52, 0.6, 0.68, 0.77, 0.85, 0.93],
    cover: ["#ed1aa0", "#ffb0dd"],
  },
];

export const devices: Device[] = [
  {
    id: "d1",
    name: "Rally Vision",
    kind: "xr",
    model: "Quest 3",
    connected: true,
    battery: 82,
    firmware: "v3.2.1",
  },
  {
    id: "d2",
    name: "라켓 R",
    kind: "paddle",
    model: "Rally Paddle Pro",
    connected: true,
    battery: 64,
    firmware: "v1.8.0",
    latencyMs: 12,
  },
  {
    id: "d3",
    name: "라켓 L",
    kind: "paddle",
    model: "Rally Paddle Pro",
    connected: false,
    battery: 0,
    firmware: "v1.7.2",
    updateAvailable: true,
    latencyMs: 14,
  },
];

export const todaySessions: SessionLog[] = [
  {
    id: "s1",
    time: "07:42",
    trackTitle: "청춘의 파도",
    minutes: 12,
    focus: 71,
    accuracy: 88,
    maxCombo: 142,
  },
  {
    id: "s2",
    time: "12:15",
    trackTitle: "Midnight Drive",
    minutes: 18,
    focus: 84,
    accuracy: 91,
    maxCombo: 268,
  },
  {
    id: "s3",
    time: "19:30",
    trackTitle: "Bassline Theory",
    minutes: 24,
    focus: 93,
    accuracy: 86,
    maxCombo: 331,
  },
  {
    id: "s4",
    time: "21:05",
    trackTitle: "Overdrive",
    minutes: 9,
    focus: 58,
    accuracy: 74,
    maxCombo: 96,
  },
];

/** 시간대별 집중도 — 24시간 중 활동 구간만 */
export const focusCurve: { hour: number; focus: number }[] = [
  { hour: 7, focus: 71 },
  { hour: 8, focus: 66 },
  { hour: 9, focus: 0 },
  { hour: 10, focus: 0 },
  { hour: 11, focus: 0 },
  { hour: 12, focus: 84 },
  { hour: 13, focus: 79 },
  { hour: 14, focus: 0 },
  { hour: 15, focus: 0 },
  { hour: 16, focus: 0 },
  { hour: 17, focus: 0 },
  { hour: 18, focus: 0 },
  { hour: 19, focus: 93 },
  { hour: 20, focus: 90 },
  { hour: 21, focus: 58 },
  { hour: 22, focus: 44 },
];

/** 요일별 평균 집중 — 최근 7일 목업. day는 i18n 키(insights.day.*)로 번역한다 */
export const weeklyFocus: { day: string; focus: number; minutes: number }[] = [
  { day: "mon", focus: 62, minutes: 28 },
  { day: "tue", focus: 74, minutes: 41 },
  { day: "wed", focus: 58, minutes: 19 },
  { day: "thu", focus: 81, minutes: 52 },
  { day: "fri", focus: 69, minutes: 33 },
  { day: "sat", focus: 88, minutes: 64 },
  { day: "sun", focus: 77, minutes: 63 },
];

export function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const providerLabel: Record<Provider, string> = {
  spotify: "Spotify",
};
