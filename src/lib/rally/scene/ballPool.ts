import * as THREE from "three";
import { BALL_R } from "../rallyConfig";
import type { BallPlan } from "./trajectory";
import { createTrail, type Trail } from "./trail";

export type BallState = "flying" | "hit" | "missed";

/**
 * 판정 색.
 *
 * 화면의 색 언어는 "흰 라인 + 오렌지 액센트" 하나뿐이라, 잘 친 순간에만
 * 오렌지가 켜지게 두는 편이 강조가 산다. 색을 더 늘리면(파랑·초록 등)
 * 탁구대 라인과 싸워서 오히려 판정이 안 읽힌다.
 */
export const JUDGE_COLOR = {
  perfect: 0xf24822,
  good: 0xffffff,
  miss: 0x6f6f6f,
} as const;

export type JudgeKey = keyof typeof JUDGE_COLOR;

export type BallSlot = {
  active: boolean;
  plan: BallPlan | null;
  state: BallState;
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  /** 탁구대 위에 지는 그림자 링 — 공의 높이/위치를 읽는 가장 강한 단서 */
  shadow: THREE.Mesh;
  /** 지나온 자리를 잇는 궤적선 */
  trail: Trail;
  /** hit/missed 이후 자유비행용 — 접근 구간에선 안 쓴다 */
  vel: THREE.Vector3;
  pos: THREE.Vector3;
  /** 자유비행 시작 후 경과(초) */
  age: number;
  /** onBallMissed를 한 번만 쏘기 위한 플래그 */
  reported: boolean;
};

/**
 * 공 메시 풀 — 프레임당 할당이 0이 되도록 미리 만들어 두고 재사용한다.
 *
 * 동시 생존 예산: 접근 1.15초 + 타격 후 최대 2.5초를 최소 간격 0.75초로
 * 나누면 최악 5개 정도다. 12는 넉넉한 상한.
 *
 * 각 공에 반투명 글로우 구를 붙인다 — 먼 쪽(z ≈ -6)에서는 실제 반지름이
 * 1픽셀 미만이라 이게 없으면 공이 어디 있는지 아예 안 보인다.
 */
export function createBallPool(scene: THREE.Scene, size = 12) {
  const geometry = new THREE.SphereGeometry(1, 12, 10);
  const plainMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.05,
  });
  const strongMat = new THREE.MeshStandardMaterial({
    color: 0xf24822,
    roughness: 0.35,
    metalness: 0.05,
    emissive: 0x5a1405,
  });
  // 판정 직후 공 자체가 그 색으로 물든다 — 어느 공을 어떻게 쳤는지가
  // 점수 숫자보다 먼저 눈에 들어와야 한다.
  const judgeMat = {
    perfect: new THREE.MeshStandardMaterial({
      color: JUDGE_COLOR.perfect,
      roughness: 0.3,
      metalness: 0.05,
      emissive: 0x7a1c06,
    }),
    good: new THREE.MeshStandardMaterial({
      color: JUDGE_COLOR.good,
      roughness: 0.3,
      metalness: 0.05,
      emissive: 0x2a2a2a,
    }),
    miss: new THREE.MeshStandardMaterial({
      color: JUDGE_COLOR.miss,
      roughness: 0.6,
      metalness: 0,
    }),
  } as const;

  const glowGeo = new THREE.SphereGeometry(1, 10, 8);
  // 글로우만은 슬롯마다 따로 만든다. 놓친 공이 사라질 때 opacity를 직접
  // 깎는데, 재질을 공유하면 그 페이드가 화면의 다른 공까지 같이 지운다.
  const makeGlowMat = () =>
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
  // 그림자도 링(외곽선)으로 — 탁구대와 같은 벡터 라인 언어를 유지한다.
  // 채워진 원보다 오히려 공중에 뜬 높이가 잘 읽힌다.
  const shadowGeo = new THREE.RingGeometry(0.82, 1, 20);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0xf24822,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const slots: BallSlot[] = [];
  for (let i = 0; i < size; i++) {
    const mesh = new THREE.Mesh(geometry, plainMat);
    mesh.scale.setScalar(BALL_R);
    mesh.visible = false;
    scene.add(mesh);

    const glow = new THREE.Mesh(glowGeo, makeGlowMat());
    glow.scale.setScalar(BALL_R * 1.9);
    glow.visible = false;
    scene.add(glow);

    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2; // 탁구대 상판에 눕힌다
    shadow.visible = false;
    scene.add(shadow);

    const trail = createTrail(scene);

    slots.push({
      active: false,
      plan: null,
      state: "flying",
      mesh,
      glow,
      shadow,
      trail,
      vel: new THREE.Vector3(),
      pos: new THREE.Vector3(),
      age: 0,
      reported: false,
    });
  }

  return {
    slots,
    acquire(plan: BallPlan): BallSlot | null {
      const slot = slots.find((s) => !s.active);
      if (!slot) return null; // 풀이 꽉 차면 조용히 흘려보낸다 — 게임을 멈추는 것보단 낫다
      slot.active = true;
      slot.plan = plan;
      slot.state = "flying";
      slot.age = 0;
      slot.reported = false;
      slot.vel.set(0, 0, 0);
      slot.mesh.material = plan.strong ? strongMat : plainMat;
      slot.mesh.visible = true;
      slot.glow.visible = true;
      slot.shadow.visible = true;
      const glowMat = slot.glow.material as THREE.MeshBasicMaterial;
      glowMat.color.setHex(plan.strong ? JUDGE_COLOR.perfect : 0xffffff);
      glowMat.opacity = 0.18;
      // 이전 공의 꼬리를 물려받으면 화면을 가로지르는 엉뚱한 선이 그려진다
      slot.trail.clear();
      slot.trail.setColor(plan.strong ? JUDGE_COLOR.perfect : 0xffffff);
      return slot;
    },

    /**
     * 판정이 나온 직후 그 공을 판정 색으로 물들인다.
     *
     * 타이밍 판정(perfect/good/miss)은 page.tsx의 비트 엔진이 쥐고 있어서
     * 공을 쳐낸 시점엔 아직 모른다 — 그래서 색칠은 별도 호출로 분리했다.
     * 같은 틱 안에서 불리므로 다음 프레임엔 이미 색이 반영돼 있다.
     */
    judge(slot: BallSlot, result: JudgeKey) {
      slot.mesh.material = judgeMat[result];
      const glowMat = slot.glow.material as THREE.MeshBasicMaterial;
      glowMat.color.setHex(JUDGE_COLOR[result]);
      glowMat.opacity = result === "miss" ? 0.12 : 0.3;
      slot.trail.setColor(JUDGE_COLOR[result]);
    },

    release(slot: BallSlot) {
      slot.active = false;
      slot.plan = null;
      slot.mesh.visible = false;
      slot.glow.visible = false;
      slot.shadow.visible = false;
      slot.trail.clear();
    },
    releaseAll() {
      for (const s of slots) {
        s.active = false;
        s.plan = null;
        s.mesh.visible = false;
        s.glow.visible = false;
        s.shadow.visible = false;
        s.trail.clear();
      }
    },
    dispose() {
      for (const s of slots) {
        scene.remove(s.mesh);
        scene.remove(s.glow);
        scene.remove(s.shadow);
        (s.glow.material as THREE.MeshBasicMaterial).dispose();
        s.trail.dispose();
      }
      geometry.dispose();
      glowGeo.dispose();
      shadowGeo.dispose();
      plainMat.dispose();
      strongMat.dispose();
      shadowMat.dispose();
      for (const m of Object.values(judgeMat)) m.dispose();
    },
  };
}

export type BallPool = ReturnType<typeof createBallPool>;
