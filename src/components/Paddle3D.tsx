"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import type { Tilt } from "@/lib/rally/useDeviceOrientation";
import type { HandPose } from "@/lib/rally/useHandTracking";

export type Paddle3DHandle = {
  /** 스윙 판정이 들어온 순간 호출 — 라켓이 앞으로 확 나갔다가 돌아온다 */
  swing: () => void;
};

type Props = {
  /** 자이로 기울기 — 손이 안 잡힐 때의 폴백. 매 프레임 직접 읽는다 */
  tiltRef: React.RefObject<Tilt>;
  /** 손 위치 — 잡히면 이게 우선이다. 함수라 매 프레임 직접 호출해서 읽는다 */
  getHandPose?: () => HandPose;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// 화면 하단 25%쯤 기본 위치 — 손이 안 잡힐 때 여기로 돌아온다
const BASE_X = 0;
const BASE_Y = -1.95;
const BASE_Z = -0.1;

/**
 * 카메라 배경 위에 겹쳐지는 3D 라켓. 손이 인식되면 손바닥 위치를 그대로
 * 따라 움직이고(실시간 핸드 트래킹), 손을 놓치면 자이로 기울기로
 * 자연스럽게 돌아간다 — 평면 아이콘이 아니라 진짜 가상공간의 물체다.
 */
const Paddle3D = forwardRef<Paddle3DHandle, Props>(function Paddle3D(
  { tiltRef, getHandPose },
  ref,
) {
  const mountRef = useRef<HTMLDivElement>(null);
  const swingEnergyRef = useRef(0);
  // 부드럽게 따라가기 위한 현재값 — 목표값(손 또는 자이로)으로 매 프레임 서서히 보간
  const currentTilt = useRef<Tilt>({ beta: 90, gamma: 0 });
  const currentPos = useRef({ x: BASE_X, y: BASE_Y });
  const currentHandAngle = useRef(0);
  // 손 추적 신뢰도 — present가 뚝뚝 끊겨도(매 프레임 검출 실패) 라켓이
  // 순간이동하지 않도록 0~1로 서서히 오르내리게 한다
  const handConfidence = useRef(0);

  useImperativeHandle(ref, () => ({
    swing: () => {
      swingEnergyRef.current = 1;
    },
  }));

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    // 화면 하단에서 손에 든 것처럼 작게 보이도록 멀찍이 두고 아래를 내려본다
    camera.position.set(0, 1.1, 4.4);
    camera.lookAt(0, -1.4, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    mount.appendChild(renderer.domElement);

    // 조명 — 브랜드 오렌지 포인트 라이트 하나로 야간 코트 느낌
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(1.5, 2.5, 2);
    scene.add(key);
    const rim = new THREE.PointLight(0xf24822, 2.2, 8);
    rim.position.set(-1.2, 0.6, 1.8);
    scene.add(rim);

    // 라켓 그룹 — 손잡이 + 블레이드(고무면) + 테두리 림
    const paddle = new THREE.Group();

    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.55,
      metalness: 0.15,
    });
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.13, 1.05, 20),
      handleMat,
    );
    handle.position.y = -0.92;
    paddle.add(handle);

    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0xf24822,
      roughness: 0.45,
      metalness: 0.1,
    });
    const blade = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.09, 40), bladeMat);
    blade.rotation.x = Math.PI / 2;
    paddle.add(blade);

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      roughness: 0.4,
      metalness: 0.3,
    });
    const rimRing = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.045, 12, 48), rimMat);
    paddle.add(rimRing);

    // 은은한 네온 테두리 — 브랜드 오렌지, 가산 발광 느낌
    const glowRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.86, 0.012, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xf24822, transparent: true, opacity: 0.9 }),
    );
    paddle.add(glowRing);

    paddle.scale.setScalar(0.4);
    paddle.position.set(BASE_X, BASE_Y, BASE_Z);
    paddle.rotation.x = -0.2;
    scene.add(paddle);

    const resize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);

      const hand = getHandPose?.();
      handConfidence.current = lerp(handConfidence.current, hand?.present ? 1 : 0, 0.15);
      const c = handConfidence.current;

      // 손 좌표(0~1, 화면 기준) → 라켓이 놓일 3D 좌표. 손을 놓치면(c→0)
      // 자연스럽게 기본 위치로 되돌아온다.
      const handWorldX = hand ? clamp((hand.x - 0.5) * 2.6, -1.3, 1.3) : BASE_X;
      const handWorldY = hand
        ? clamp(-2.15 + (1 - hand.y) * 1.9, -2.15, -0.35)
        : BASE_Y;
      const targetX = lerp(BASE_X, handWorldX, c);
      const targetY = lerp(BASE_Y, handWorldY, c);
      // 반응성은 손 쪽을 더 스냅있게(0.22), 자이로 폴백은 느긋하게(0.1)
      currentPos.current.x = lerp(currentPos.current.x, targetX, c > 0.05 ? 0.22 : 0.08);
      currentPos.current.y = lerp(currentPos.current.y, targetY, c > 0.05 ? 0.22 : 0.08);

      if (hand?.present) {
        currentHandAngle.current = lerp(currentHandAngle.current, hand.angle, 0.2);
      }

      // 자이로 목표값으로 서서히 보간 — 손이 없을 때만 회전에 반영
      const target = tiltRef.current;
      currentTilt.current.beta = lerp(currentTilt.current.beta, target.beta, 0.12);
      currentTilt.current.gamma = lerp(currentTilt.current.gamma, target.gamma, 0.12);
      const pitch = clamp(currentTilt.current.beta - 90, -50, 50);
      const gyroRoll = clamp(currentTilt.current.gamma, -45, 45);

      // 손 각도(라디안)와 자이로 롤(도) 중 신뢰도에 따라 섞는다
      const handRoll = THREE.MathUtils.radToDeg(currentHandAngle.current);
      const roll = lerp(gyroRoll, clamp(handRoll, -60, 60), c);

      // 스윙 에너지는 매 프레임 감쇠 — 짧게 튀었다 돌아오는 스프링 느낌
      swingEnergyRef.current *= 0.86;
      const swing = swingEnergyRef.current;

      paddle.position.x = currentPos.current.x;
      paddle.position.y = currentPos.current.y + swing * 0.15;
      paddle.position.z = BASE_Z + swing * 0.9;
      paddle.rotation.x = -0.2 + THREE.MathUtils.degToRad(pitch) * 0.5 * (1 - c) - swing * 0.9;
      paddle.rotation.z = THREE.MathUtils.degToRad(roll) * 0.5;

      glowRing.material.opacity = 0.55 + swing * 0.45 + c * 0.2;
      rim.intensity = 2.2 + swing * 3;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      handle.geometry.dispose();
      blade.geometry.dispose();
      rimRing.geometry.dispose();
      glowRing.geometry.dispose();
      handleMat.dispose();
      bladeMat.dispose();
      rimMat.dispose();
      (glowRing.material as THREE.Material).dispose();
      mount.removeChild(renderer.domElement);
    };
  }, [tiltRef, getHandPose]);

  return <div ref={mountRef} className="pointer-events-none absolute inset-0" aria-hidden />;
});

export default Paddle3D;
