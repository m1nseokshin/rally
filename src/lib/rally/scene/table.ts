import * as THREE from "three";
import {
  LEG_BOTTOM_Y,
  NET_H,
  NET_HALF_W,
  NET_Z,
  TABLE_FAR_Z,
  TABLE_HALF_W,
  TABLE_NEAR_Z,
  TABLE_Y,
} from "../rallyConfig";

/**
 * 라인만으로 그린 벡터 탁구대.
 *
 * 재질별로 LineSegments 하나씩만 만들어 총 4 draw call이다. 면 폴리곤이
 * 아예 없으니 z-fighting이 원천적으로 불가능하고(라인 전용 요구사항의
 * 뜻밖의 이득), 모든 재질에 depthWrite: false를 줘서 공이 항상 위에
 * 깔끔하게 합성된다.
 *
 * 좌표는 전부 rallyConfig의 카메라 기하에서 나온 값이다.
 */

/** [x1,y1,z1, x2,y2,z2, ...] 쌍으로 이어붙이는 헬퍼 */
function seg(out: number[], ax: number, ay: number, az: number, bx: number, by: number, bz: number) {
  out.push(ax, ay, az, bx, by, bz);
}

function buildLines(points: number[], color: number, opacity: number) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  return new THREE.LineSegments(geometry, material);
}

export function createTableWireframe(): { group: THREE.Group; dispose: () => void } {
  const group = new THREE.Group();
  const NET_TOP_Y = TABLE_Y + NET_H;

  // ── A. 액센트 — 내 쪽 모서리와 센터 라인만 브랜드 오렌지로 강조
  const accent: number[] = [];
  seg(accent, -TABLE_HALF_W, TABLE_Y, TABLE_NEAR_Z, TABLE_HALF_W, TABLE_Y, TABLE_NEAR_Z);
  seg(accent, 0, TABLE_Y, TABLE_NEAR_Z, 0, TABLE_Y, TABLE_FAR_Z);
  // linewidth는 대부분의 플랫폼에서 무시돼 항상 1px이다 —
  // 살짝 띄운 선을 겹쳐 "굵게" 보이도록 흉내낸다.
  seg(accent, -TABLE_HALF_W, TABLE_Y + 0.012, TABLE_NEAR_Z, TABLE_HALF_W, TABLE_Y + 0.012, TABLE_NEAR_Z);

  // ── B. 외곽 + 네트
  const frame: number[] = [];
  seg(frame, -TABLE_HALF_W, TABLE_Y, TABLE_FAR_Z, TABLE_HALF_W, TABLE_Y, TABLE_FAR_Z);
  seg(frame, -TABLE_HALF_W, TABLE_Y, TABLE_NEAR_Z, -TABLE_HALF_W, TABLE_Y, TABLE_FAR_Z);
  seg(frame, TABLE_HALF_W, TABLE_Y, TABLE_NEAR_Z, TABLE_HALF_W, TABLE_Y, TABLE_FAR_Z);
  seg(frame, -NET_HALF_W, NET_TOP_Y, NET_Z, NET_HALF_W, NET_TOP_Y, NET_Z);
  seg(frame, -NET_HALF_W, TABLE_Y, NET_Z, NET_HALF_W, TABLE_Y, NET_Z);
  seg(frame, -NET_HALF_W, TABLE_Y, NET_Z, -NET_HALF_W, NET_TOP_Y, NET_Z);
  seg(frame, NET_HALF_W, TABLE_Y, NET_Z, NET_HALF_W, NET_TOP_Y, NET_Z);
  seg(frame, -NET_HALF_W, NET_TOP_Y + 0.012, NET_Z, NET_HALF_W, NET_TOP_Y + 0.012, NET_Z);

  // ── C. 네트망 + 깊이 가로대
  const mesh: number[] = [];
  for (let i = 0; i <= 12; i++) {
    const x = -NET_HALF_W + i * ((NET_HALF_W * 2) / 12);
    seg(mesh, x, TABLE_Y, NET_Z, x, NET_TOP_Y, NET_Z);
  }
  for (const y of [TABLE_Y + 0.1, TABLE_Y + 0.19, TABLE_Y + 0.28]) {
    seg(mesh, -NET_HALF_W, y, NET_Z, NET_HALF_W, y, NET_Z);
  }
  // 가로대가 핵심이다 — 면이 없는 라인 탁구대는 깊이 단서가 전혀 없어서
  // 공이 얼마나 빨리 다가오는지 눈이 판단할 수가 없다.
  const rungGap = (TABLE_NEAR_Z - TABLE_FAR_Z) / 6;
  for (let k = 1; k <= 5; k++) {
    const z = TABLE_NEAR_Z - k * rungGap;
    seg(mesh, -TABLE_HALF_W, TABLE_Y, z, TABLE_HALF_W, TABLE_Y, z);
    // 양 끝에서 위로 솟은 짧은 기둥 — 가로대만 있으면 여전히 "바닥에 그린
    // 격자"로 보인다. 깊이 축을 따라 반복되는 수직 요소가 있어야 눈이
    // 평면이 아니라 공간으로 읽는다.
    seg(mesh, -TABLE_HALF_W, TABLE_Y, z, -TABLE_HALF_W, TABLE_Y + 0.16, z);
    seg(mesh, TABLE_HALF_W, TABLE_Y, z, TABLE_HALF_W, TABLE_Y + 0.16, z);
  }

  // ── D. 다리 + 보강대 + 뒷벽
  const legs: number[] = [];
  for (const x of [-1.42, 1.42]) {
    for (const z of [-0.75, -5.96]) {
      seg(legs, x, TABLE_Y, z, x, LEG_BOTTOM_Y, z);
    }
    seg(legs, x, TABLE_Y - 1.15, -0.75, x, TABLE_Y - 1.15, -5.96);
  }

  // 탁구대 뒤쪽 벽 격자 — 공간에 "끝"을 만들어 준다. 이게 없으면 탁구대가
  // 허공에 떠 있고 그 너머는 무한한 검정이라 깊이감이 뚝 끊긴다.
  const WALL_Z = TABLE_FAR_Z - 1.6;
  const WALL_W = 4.6;
  const WALL_TOP = TABLE_Y + 3.2;
  for (let i = 0; i <= 8; i++) {
    const x = -WALL_W + (i * (WALL_W * 2)) / 8;
    seg(legs, x, LEG_BOTTOM_Y, WALL_Z, x, WALL_TOP, WALL_Z);
  }
  for (let i = 0; i <= 5; i++) {
    const y = LEG_BOTTOM_Y + (i * (WALL_TOP - LEG_BOTTOM_Y)) / 5;
    seg(legs, -WALL_W, y, WALL_Z, WALL_W, y, WALL_Z);
  }

  const objects = [
    buildLines(accent, 0xf24822, 0.95),
    buildLines(frame, 0xffffff, 0.55),
    buildLines(mesh, 0xffffff, 0.2),
    buildLines(legs, 0xffffff, 0.12),
  ];
  for (const o of objects) group.add(o);

  // 바닥 그리드 — 탁구대가 허공에 떠 있지 않다는 감각만 주는 정도로 아주 흐리게
  const grid = new THREE.GridHelper(24, 24, 0xffffff, 0xffffff);
  grid.position.y = LEG_BOTTOM_Y;
  const gridMat = grid.material as THREE.Material;
  gridMat.transparent = true;
  gridMat.opacity = 0.1;
  gridMat.depthWrite = false;
  group.add(grid);

  return {
    group,
    dispose: () => {
      for (const o of objects) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
      grid.geometry.dispose();
      gridMat.dispose();
    },
  };
}
