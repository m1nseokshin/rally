import * as THREE from "three";

/**
 * 3D 라켓 — 손잡이 + 블레이드(고무면) + 테두리 림 + 네온 발광 링.
 * 씬 구성만 담당하고 움직임은 RallyScene의 렌더 루프가 맡는다.
 */
export function createPaddle(): {
  group: THREE.Group;
  glowRing: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>;
  dispose: () => void;
} {
  const group = new THREE.Group();

  const handleMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.55,
    metalness: 0.15,
  });
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 1.05, 20), handleMat);
  handle.position.y = -0.92;
  group.add(handle);

  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0xf24822,
    roughness: 0.45,
    metalness: 0.1,
  });
  const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.09, 40), bladeMat);
  blade.rotation.x = Math.PI / 2;
  group.add(blade);

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0x0a0a0a,
    roughness: 0.4,
    metalness: 0.3,
  });
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.045, 12, 48), rimMat);
  group.add(rimRing);

  // 은은한 네온 테두리 — 브랜드 오렌지. 그립/스윙 상태를 밝기로 알린다.
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xf24822,
    transparent: true,
    opacity: 0.9,
  });
  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.86, 0.012, 8, 48), glowMat);
  group.add(glowRing);

  group.scale.setScalar(0.4);

  return {
    group,
    glowRing,
    dispose: () => {
      handle.geometry.dispose();
      blade.geometry.dispose();
      rimRing.geometry.dispose();
      glowRing.geometry.dispose();
      handleMat.dispose();
      bladeMat.dispose();
      rimMat.dispose();
      glowMat.dispose();
    },
  };
}
