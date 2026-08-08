import * as THREE from "three";
import { BALL_R } from "../rallyConfig";
import type { BallPlan } from "./trajectory";

export type BallState = "flying" | "hit" | "missed";

export type BallSlot = {
  active: boolean;
  plan: BallPlan | null;
  state: BallState;
  mesh: THREE.Mesh;
  glow: THREE.Mesh;
  /** 탁구대 위에 지는 그림자 링 — 공의 높이/위치를 읽는 가장 강한 단서 */
  shadow: THREE.Mesh;
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
  const glowGeo = new THREE.SphereGeometry(1, 10, 8);
  const glowMat = new THREE.MeshBasicMaterial({
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

    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.scale.setScalar(BALL_R * 1.9);
    glow.visible = false;
    scene.add(glow);

    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2; // 탁구대 상판에 눕힌다
    shadow.visible = false;
    scene.add(shadow);

    slots.push({
      active: false,
      plan: null,
      state: "flying",
      mesh,
      glow,
      shadow,
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
      (slot.glow.material as THREE.MeshBasicMaterial).opacity = 0.18;
      return slot;
    },
    release(slot: BallSlot) {
      slot.active = false;
      slot.plan = null;
      slot.mesh.visible = false;
      slot.glow.visible = false;
      slot.shadow.visible = false;
    },
    releaseAll() {
      for (const s of slots) {
        s.active = false;
        s.plan = null;
        s.mesh.visible = false;
        s.glow.visible = false;
        s.shadow.visible = false;
      }
    },
    dispose() {
      for (const s of slots) {
        scene.remove(s.mesh);
        scene.remove(s.glow);
        scene.remove(s.shadow);
      }
      geometry.dispose();
      glowGeo.dispose();
      shadowGeo.dispose();
      plainMat.dispose();
      strongMat.dispose();
      glowMat.dispose();
      shadowMat.dispose();
    },
  };
}

export type BallPool = ReturnType<typeof createBallPool>;
