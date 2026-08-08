/**
 * XR 랠리의 모든 튜닝 상수 — 좌표, 물리, 판정 기준을 한 곳에 모았다.
 *
 * 월드 좌표는 전부 카메라 (0, 1.1, 4.4) → lookAt(0, -1.4, 0), vFOV 45°에서
 * 역산한 값이다. 카메라는 29.6° 아래를 보고 있고, 가로 가시 반폭은
 * `깊이 × 0.41421 × aspect`다. 세로 폰(aspect ≈ 0.46)이 가장 빡빡한 제약이라
 * 먼 쪽 모서리(깊이 ≈ 10.95)에서 x는 ±2.09까지만 보인다 — 탁구대 반폭
 * 1.70은 거기서 나온 값이다. 카메라를 옮기면 이 파일 전체를 다시 계산해야 한다.
 */

// ── 탁구대 (월드 좌표)
export const TABLE_Y = -2.05;
export const TABLE_NEAR_Z = -0.3;
export const TABLE_FAR_Z = -6.41;
export const TABLE_HALF_W = 1.7;
export const NET_Z = -3.355;
export const NET_H = 0.34;
export const NET_HALF_W = 1.95;
export const LEG_BOTTOM_Y = -3.75;

// ── 타격점 — 라켓이 움직이는 평면
export const CONTACT_Z = -0.1;
export const CONTACT_Y = -1.7;

// ── 비행 물리
/**
 * 이 스케일의 실제 중력은 21.85 unit/s²다. 하지만 그 값을 쓰면 접근 궤적의
 * 정점이 화면 세로 91% 위로 올라가 일부 화면비에서 잘린다. 10은 물리적
 * 정확도가 아니라 프레이밍을 위해 고른 연출 상수다 — "고치지" 말 것.
 */
export const GRAVITY = 10.0;
/** 실제 비율보다 약 2.4배 크다 — 먼 쪽에서 1픽셀 미만이 되지 않게 */
export const BALL_R = 0.11;
/** 발사 → 타격까지 총 비행 시간(초) */
export const TRAVEL = 1.15;
/** 그중 바운드 → 타격 구간 */
export const T_BOUNCE = 0.34;
export const LAUNCH_Z = -6.2;
export const LAUNCH_Y = -1.5;
/** 반드시 플레이어 절반(NET_Z ~ TABLE_NEAR_Z) 안쪽이어야 한다 */
export const BOUNCE_Z = -1.9;

// ── 스폰 빈도
/** 이 간격에 가장 가까운 2의 거듭제곱 배수로 비트를 솎는다 */
export const TARGET_BALL_GAP = 1.2;
export const MIN_BALL_GAP = 0.75;
/** 공이 놓이는 가로 범위 — strict 공간 판정이라 손이 닿는 폭으로 좁혔다 */
export const LANE_HALF_SPAN = 0.85;

// ── 스윙 제스처
/**
 * 정규화 화면좌표 기준 "풀스윙" 속도(단위/초).
 * 실제 포핸드는 프레임 폭의 약 40%를 0.12초에 지난다 → 3.3.
 */
export const SPEED_FULL = 3.2;
export const SWING_TRIGGER = 0.45;
/** 이 아래로 떨어져야 다음 스윙이 재장전된다 — 한 번 휘두르는 동안 연발 방지 */
export const SWING_REARM = 0.18;
export const SWING_COOLDOWN = 280;

// ── 공간 판정
/**
 * "strict" = 라켓이 공에 정확히 가야만 맞는다(진짜 탁구). 너무 어려우면
 * "assist"로 한 줄만 바꾸면 빗맞은 히트가 미스 대신 한 등급 강등된다.
 */
export const SPATIAL_GATE: "off" | "assist" | "strict" = "strict";
export const HIT_RADIUS_CLEAN = 0.55;
export const HIT_RADIUS_EDGE = 0.95;
export const HIT_RADIUS_Y_CLEAN = 0.7;
export const HIT_RADIUS_Y_EDGE = 1.0;

// ── 손 인식
/** 손목→중지MCP 길이로 정규화한 손가락 길이 비율. 편 손 ≈ 1.0~1.3 */
export const CURL_OPEN_RATIO = 1.05;
/** 쥔 손 ≈ 0.25~0.5 */
export const CURL_CLOSED_RATIO = 0.45;
/** 손을 놓친 뒤 이 시간이 지나면 모션 카메라 폴백으로 전환한다(ms) */
export const HAND_LIVE_TIMEOUT = 700;
