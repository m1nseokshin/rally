import {
  BALL_R,
  BOUNCE_Z,
  CONTACT_Y,
  CONTACT_Z,
  GRAVITY,
  LAUNCH_Y,
  LAUNCH_Z,
  TABLE_Y,
  TRAVEL,
  T_BOUNCE,
} from "../rallyConfig";

/**
 * 공의 접근 궤적 — 타격 시각(hitAt)에서 거꾸로 풀어 만든다.
 *
 * 두 구간(발사→바운드, 바운드→타격) 모두 닫힌 형식이라 모든 위치가
 * elapsed의 순수 함수다. 씬이 자체 시계를 누적하지 않으므로 오디오 클럭이
 * 흔들려도 공이 박자에서 어긋날 수 없다 — 리듬 게임에서 이게 핵심이다.
 * (타격 후 자유비행만 렌더 dt로 적분한다. 그땐 더 이상 박자에 묶이지 않으니까.)
 */
export type BallPlan = {
  id: number;
  hitAt: number;
  strong: boolean;
  /** 타격 지점의 x — 라켓이 여기로 가야 맞는다 */
  laneX: number;
  /** 구간 A: 발사 → 바운드 */
  aT0: number;
  aP: [number, number, number];
  aV: [number, number, number];
  /** 구간 B: 바운드 → 타격 */
  bT0: number;
  bP: [number, number, number];
  bV: [number, number, number];
};

export function planBall(id: number, hitAt: number, strong: boolean, laneX: number): BallPlan {
  const yb = TABLE_Y + BALL_R;
  // 공이 직선이 아니라 레인으로 수렴하게 — 크로스코트 샷처럼 읽힌다
  const x0 = laneX * 0.35;
  const xb = laneX * 0.8;

  // ── 구간 B (바운드 → 타격): 끝점이 고정이라 먼저 푼다.
  // 정점이 바운드 위 0.29(13cm)이고 t=0.24 < 0.34라 타격 시점엔 하강 중 —
  // 실제 탁구처럼 내려오는 공을 치게 된다.
  const bT0 = hitAt - T_BOUNCE;
  const bV: [number, number, number] = [
    (laneX - xb) / T_BOUNCE,
    (CONTACT_Y - yb + 0.5 * GRAVITY * T_BOUNCE * T_BOUNCE) / T_BOUNCE,
    (CONTACT_Z - BOUNCE_Z) / T_BOUNCE,
  ];

  // ── 구간 A (발사 → 바운드)
  const tA = TRAVEL - T_BOUNCE;
  const aV: [number, number, number] = [
    (xb - x0) / tA,
    (yb - LAUNCH_Y + 0.5 * GRAVITY * tA * tA) / tA,
    (BOUNCE_Z - LAUNCH_Z) / tA,
  ];

  return {
    id,
    hitAt,
    strong,
    laneX,
    aT0: hitAt - TRAVEL,
    aP: [x0, LAUNCH_Y, LAUNCH_Z],
    aV,
    bT0,
    bP: [xb, yb, BOUNCE_Z],
    bV,
  };
}

/** elapsed(초) 시점의 공 위치를 out에 쓴다 */
export function ballPosition(
  p: BallPlan,
  t: number,
  out: { x: number; y: number; z: number },
) {
  const inA = t < p.bT0;
  const [px, py, pz] = inA ? p.aP : p.bP;
  const [vx, vy, vz] = inA ? p.aV : p.bV;
  const dt = t - (inA ? p.aT0 : p.bT0);
  out.x = px + vx * dt;
  out.y = py + vy * dt - 0.5 * GRAVITY * dt * dt;
  out.z = pz + vz * dt;
}
