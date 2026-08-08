import * as THREE from "three";

const SHARDS = 12;
const LIFE = 0.22;

/**
 * 타격 순간 접촉점에서 퍼지는 방사형 선 — 탁구대와 같은 "라인" 언어를 유지한다.
 * 미리 만들어 둔 LineSegments 하나를 재사용하므로 1 draw call, 할당 0.
 */
export function createHitBurst(scene: THREE.Scene) {
  const positions = new Float32Array(SHARDS * 2 * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.visible = false;
  scene.add(lines);

  // 방향은 고정해두고 매번 스케일만 키운다 — 매 타격마다 난수를 뽑으면
  // 프레임마다 모양이 달라져 오히려 산만하다.
  const dirs: [number, number][] = [];
  for (let i = 0; i < SHARDS; i++) {
    const a = (i / SHARDS) * Math.PI * 2;
    // 살짝 타원으로 — 정원이면 도장 찍은 것처럼 뻣뻣하다
    dirs.push([Math.cos(a), Math.sin(a) * 0.72]);
  }

  let t = 0;
  let active = false;
  let scale = 1;
  const origin = new THREE.Vector3();

  return {
    fire(at: THREE.Vector3, power: number) {
      origin.copy(at);
      scale = 1 + power * 0.6;
      material.color.setHex(power > 0.8 ? 0xf24822 : 0xffffff);
      t = 0;
      active = true;
      lines.visible = true;
    },
    update(dt: number) {
      if (!active) return;
      t += dt;
      if (t >= LIFE) {
        active = false;
        lines.visible = false;
        material.opacity = 0;
        return;
      }
      const p = t / LIFE;
      const inner = 0.06 + p * 0.32 * scale;
      const outer = inner + 0.12 * scale * (1 - p);
      for (let i = 0; i < SHARDS; i++) {
        const [dx, dy] = dirs[i];
        const o = i * 6;
        positions[o] = origin.x + dx * inner;
        positions[o + 1] = origin.y + dy * inner;
        positions[o + 2] = origin.z;
        positions[o + 3] = origin.x + dx * outer;
        positions[o + 4] = origin.y + dy * outer;
        positions[o + 5] = origin.z;
      }
      geometry.attributes.position.needsUpdate = true;
      material.opacity = (1 - p) * 0.9;
    },
    dispose() {
      scene.remove(lines);
      geometry.dispose();
      material.dispose();
    },
  };
}
