import * as THREE from "three";

/** 꼬리에 남길 점 개수 — 20이면 약 0.3초치 궤적이라 속도가 눈에 읽힌다 */
const POINTS = 20;

/**
 * 공이 지나온 자리를 잇는 궤적선.
 *
 * 꼬리 쪽으로 갈수록 색을 검게 깎아 사라지는 것처럼 보이게 한다. 선은
 * 정점마다 알파를 줄 수 없어서(LineBasicMaterial의 vertexColors는 RGB뿐)
 * 대신 **가산 합성**을 쓴다 — 가산에서는 검정이 곧 투명이라, 색을 어둡게
 * 깎는 것만으로 자연스러운 페이드가 나온다. 셰이더를 따로 쓸 필요가 없다.
 *
 * 공 하나당 draw call 1개. 12개를 다 띄워도 12콜이라 부담이 없다.
 */
export function createTrail(scene: THREE.Scene) {
  const positions = new Float32Array(POINTS * 3);
  const colors = new Float32Array(POINTS * 3);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geometry.setDrawRange(0, 0);

  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const line = new THREE.Line(geometry, material);
  // 궤적은 공보다 먼저 그려도 상관없지만, 프러스텀 컬링은 꺼야 한다 —
  // 바운딩 박스를 매 프레임 다시 계산하지 않아서 화면 밖으로 오판될 수 있다.
  line.frustumCulled = false;
  line.visible = false;
  scene.add(line);

  const base = new THREE.Color(0xffffff);
  /** 0(꼬리) ~ 1(머리)로 밝기를 깎아 둔 값 — 색이 바뀔 때만 다시 쓴다 */
  const writeColors = () => {
    for (let i = 0; i < POINTS; i++) {
      // 선형보다 제곱이 낫다 — 머리 근처만 또렷하고 꼬리는 빨리 잦아든다
      const f = (i / (POINTS - 1)) ** 2;
      colors[i * 3] = base.r * f;
      colors[i * 3 + 1] = base.g * f;
      colors[i * 3 + 2] = base.b * f;
    }
    geometry.attributes.color.needsUpdate = true;
  };
  writeColors();

  let count = 0;

  return {
    line,
    /** 매 프레임 현재 위치를 밀어 넣는다 — 가장 오래된 점이 밀려 나간다 */
    push(x: number, y: number, z: number) {
      positions.copyWithin(0, 3);
      const last = (POINTS - 1) * 3;
      positions[last] = x;
      positions[last + 1] = y;
      positions[last + 2] = z;
      if (count < POINTS) count++;
      // 아직 안 채워진 앞쪽은 0,0,0이라 그리면 원점까지 선이 뻗는다 —
      // 채워진 만큼만 그린다.
      geometry.setDrawRange(POINTS - count, count);
      geometry.attributes.position.needsUpdate = true;
      line.visible = count > 1;
    },
    setColor(hex: number) {
      base.setHex(hex);
      writeColors();
    },
    /** 공이 풀로 돌아갈 때 — 다음 공이 이전 궤적을 이어받으면 안 된다 */
    clear() {
      count = 0;
      geometry.setDrawRange(0, 0);
      line.visible = false;
    },
    dispose() {
      scene.remove(line);
      geometry.dispose();
      material.dispose();
    },
  };
}

export type Trail = ReturnType<typeof createTrail>;
