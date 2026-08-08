"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import * as THREE from "three";
import type { Tilt } from "@/lib/rally/useDeviceOrientation";
import type { HandPose } from "@/lib/rally/useHandTracking";
import type { Contact } from "@/lib/rally/scoring";
import {
  BALL_R,
  CONTACT_Z,
  GRAVITY,
  HIT_RADIUS_CLEAN,
  HIT_RADIUS_EDGE,
  HIT_RADIUS_Y_CLEAN,
  HIT_RADIUS_Y_EDGE,
  TABLE_FAR_Z,
  TABLE_HALF_W,
  TABLE_NEAR_Z,
  TABLE_Y,
} from "@/lib/rally/rallyConfig";
import { createTableWireframe } from "@/lib/rally/scene/table";
import { createPaddle } from "@/lib/rally/scene/paddle";
import { createBallPool } from "@/lib/rally/scene/ballPool";
import { createHitBurst } from "@/lib/rally/scene/hitBurst";
import { ballPosition, planBall } from "@/lib/rally/scene/trajectory";

export type SwingOutcome = {
  ballId: number | null;
  /** 라켓과 공의 가로 거리(world unit) — 디버깅/연출용 */
  offset: number;
  contact: Contact;
};

export type RallySceneHandle = {
  spawnBall: (b: { id: number; hitAt: number; strong: boolean; lane: number }) => void;
  /**
   * 스윙 순간 호출 — 라켓 애니메이션을 켜고 공간 판정을 즉시 동기 반환한다.
   * 리액트 상태를 한 번 거치면 프레임이 밀려 리듬 판정이 어긋나기 때문에
   * 반드시 동기여야 한다.
   */
  swing: (power: number, source: "hand" | "motion") => SwingOutcome;
  reset: () => void;
};

type Props = {
  /** 자이로 기울기 — 손이 안 잡힐 때의 폴백. 매 프레임 직접 읽는다 */
  tiltRef: React.RefObject<Tilt>;
  /** 실제 자이로 이벤트가 들어온 적 있는가 — 없으면 회전에 반영하지 않는다 */
  hasGyroRef: React.RefObject<boolean>;
  /** 손 위치 — 잡히면 이게 우선이다. 함수라 매 프레임 직접 호출해서 읽는다 */
  getHandPose?: () => HandPose;
  /** 비트 엔진이 시간의 진실의 원천 — 접근 궤적은 전부 이 값의 순수 함수다 */
  getElapsed: () => number;
  onBallMissed?: (id: number) => void;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// 화면 하단 — 손이 안 잡힐 때 라켓이 돌아오는 기본 위치
const BASE_X = 0;
const BASE_Y = -1.95;
const BASE_Z = CONTACT_Z;

/**
 * 손→월드 가로 게인. 2.6이면 최외곽 레인에 닿으려고 손이 화면 x=0.9까지
 * 가야 하는데 거기선 MediaPipe가 손을 놓친다. 3.2로 넓혀 x=0.77이면
 * 닿게 했다 — LANE_HALF_SPAN 0.85와 세트로 움직이는 값이다.
 */
const HAND_GAIN_X = 3.2;
const PADDLE_X_LIMIT = 1.45;

/**
 * 카메라 배경 위에 겹쳐지는 3D 랠리 씬 — 라인 탁구대, 날아오는 공,
 * 손을 따라오는 라켓이 모두 같은 3D 공간에 있다.
 *
 * 공 상태는 리액트가 아니라 이 안의 ref/렌더 루프가 들고 있다. 매 프레임
 * setState를 하면 60Hz로 리렌더가 돌아 프레임이 무너지기 때문이다.
 * 점수/콤보 같은 게임 규칙은 그대로 page.tsx에 남아 있고, 여기서는
 * 위치·충돌·연출만 책임진다.
 */
const RallyScene = forwardRef<RallySceneHandle, Props>(function RallyScene(
  { tiltRef, hasGyroRef, getHandPose, getElapsed, onBallMissed },
  ref,
) {
  const mountRef = useRef<HTMLDivElement>(null);

  // 콜백 prop은 전부 ref에 담는다 — 마운트 이펙트의 deps를 []로 두기 위해서다.
  // prop 하나라도 deps에 들어가면 그게 불안정해지는 순간 매 렌더 WebGL
  // 컨텍스트가 파괴·재생성돼 전부 무너진다.
  const getElapsedRef = useRef(getElapsed);
  const getHandPoseRef = useRef(getHandPose);
  const onBallMissedRef = useRef(onBallMissed);
  useEffect(() => {
    getElapsedRef.current = getElapsed;
    getHandPoseRef.current = getHandPose;
    onBallMissedRef.current = onBallMissed;
  }, [getElapsed, getHandPose, onBallMissed]);

  // 렌더 루프와 imperative 핸들이 공유하는 상태
  const apiRef = useRef<{
    spawn: (b: { id: number; hitAt: number; strong: boolean; lane: number }) => void;
    swing: (power: number, source: "hand" | "motion") => SwingOutcome;
    reset: () => void;
  } | null>(null);

  useImperativeHandle(ref, () => ({
    spawnBall: (b) => apiRef.current?.spawn(b),
    swing: (power, source) =>
      apiRef.current?.swing(power, source) ?? { ballId: null, offset: 0, contact: "none" },
    reset: () => apiRef.current?.reset(),
  }));

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    // 거리 안개 — 먼 라인이 어둠 속으로 잦아든다. 모든 선이 같은 밝기면
    // 눈이 원근을 못 읽어서 바닥에 그린 격자처럼 보인다. 3D 느낌을 만드는
    // 가장 값싸고 강력한 장치다.
    scene.fog = new THREE.Fog(0x000000, 5.5, 17);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
    // 화면 하단에서 손에 든 것처럼 작게 보이도록 멀찍이 두고 아래를 내려본다.
    // rallyConfig의 모든 좌표가 이 카메라에서 역산된 값이라 함부로 못 옮긴다.
    camera.position.set(0, 1.1, 4.4);
    camera.lookAt(0, -1.4, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    mount.appendChild(renderer.domElement);

    // 조명 — 브랜드 오렌지 포인트 라이트 하나로 야간 코트 느낌
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 0.9);
    key.position.set(1.5, 2.5, 2);
    scene.add(key);
    const rim = new THREE.PointLight(0xf24822, 2.2, 10);
    rim.position.set(-1.2, 0.6, 1.8);
    scene.add(rim);

    const table = createTableWireframe();
    scene.add(table.group);

    const paddle = createPaddle();
    paddle.group.position.set(BASE_X, BASE_Y, BASE_Z);
    paddle.group.rotation.x = -0.2;
    scene.add(paddle.group);

    const pool = createBallPool(scene, 12);
    const burst = createHitBurst(scene);

    // 부드럽게 따라가기 위한 현재값 — 목표값(손 또는 자이로)으로 매 프레임 보간
    const currentTilt: Tilt = { beta: 90, gamma: 0 };
    const currentPos = { x: BASE_X, y: BASE_Y };
    let currentHandAngle = 0;
    // 손 추적 신뢰도 — present가 뚝뚝 끊겨도 라켓이 순간이동하지 않도록 0~1로 서서히
    let handConfidence = 0;
    let swingEnergy = 0;
    let paddleRoll = 0;

    const tmp = { x: 0, y: 0, z: 0 };

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

    apiRef.current = {
      spawn: ({ id, hitAt, strong, lane }) => {
        pool.acquire(planBall(id, hitAt, strong, lane));
      },

      swing: (power, source) => {
        swingEnergy = 0.6 + 0.4 * power;

        const t = getElapsedRef.current();
        // 타격 가능 시간대의 공 중 가장 임박한 것을 고른다
        let best: (typeof pool.slots)[number] | null = null;
        let bestDiff = Infinity;
        for (const s of pool.slots) {
          if (!s.active || s.state !== "flying" || !s.plan) continue;
          const diff = Math.abs(s.plan.hitAt - t);
          if (diff < 0.35 && diff < bestDiff) {
            bestDiff = diff;
            best = s;
          }
        }
        if (!best || !best.plan) return { ballId: null, offset: 0, contact: "none" };

        ballPosition(best.plan, t, tmp);
        const dx = Math.abs(paddle.group.position.x - tmp.x);
        const dy = Math.abs(paddle.group.position.y - tmp.y);

        let contact: Contact;
        if (source === "motion") {
          // 모션 카메라 폴백은 신뢰할 라켓 x가 없다 — 공간 판정을 적용하면
          // 손 추적이 죽은 사용자가 영영 점수를 못 낸다. 무조건 통과시킨다.
          contact = "clean";
        } else if (dx <= HIT_RADIUS_CLEAN && dy <= HIT_RADIUS_Y_CLEAN) {
          contact = "clean";
        } else if (dx <= HIT_RADIUS_EDGE && dy <= HIT_RADIUS_Y_EDGE) {
          contact = "edge";
        } else {
          contact = "none";
        }

        if (contact === "none") {
          // 헛스윙 — 공은 그대로 날아가 미스로 처리된다
          return { ballId: best.plan.id, offset: dx, contact };
        }

        // ── 튕겨나가는 궤적: 여기서부터 렌더 dt 적분으로 전환한다.
        // 더 이상 박자에 묶이지 않으니 물리로 돌려도 안전하다.
        const up = lerp(0.3, 0.14, power); // 세게 칠수록 낮고 빠르게
        const speed = lerp(6.0, 14.0, power);
        let vx = clamp((tmp.x - paddle.group.position.x) * -3.0 + paddleRoll * 2.0, -4, 4);
        if (contact === "edge") vx += Math.sign(tmp.x - paddle.group.position.x || 1) * 2.4;

        best.pos.set(tmp.x, tmp.y, tmp.z);
        best.vel.set(vx, speed * Math.sin(up), -speed * Math.cos(up));
        best.state = "hit";
        best.age = 0;
        burst.fire(best.pos, power);

        return { ballId: best.plan.id, offset: dx, contact };
      },

      reset: () => {
        pool.releaseAll();
        swingEnergy = 0;
      },
    };

    let raf = 0;
    let prevFrame = performance.now();
    const startedAt = performance.now();
    let camX = 0;
    let camY = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const now = performance.now();
      // 탭 전환 등으로 프레임이 크게 뛰면 물리가 폭발하니 상한을 둔다
      const dt = Math.min(0.05, (now - prevFrame) / 1000);
      prevFrame = now;

      // ── 라켓
      const hand = getHandPoseRef.current?.();
      // clarity(주먹이든 편 손바닥이든 명확한 포즈면 1)로 신뢰도가 오르는
      // 속도를 가중한다 — 애매한 손 모양이면 천천히, 확실하면 빠르게 따라간다.
      const clarity = hand?.present ? 0.55 + hand.clarity * 0.45 : 0;
      handConfidence = lerp(handConfidence, hand?.present ? 1 : 0, 0.15 * (0.5 + clarity));
      const c = handConfidence;

      const handWorldX = hand ? clamp((hand.x - 0.5) * HAND_GAIN_X, -PADDLE_X_LIMIT, PADDLE_X_LIMIT) : BASE_X;
      const handWorldY = hand ? clamp(-2.15 + (1 - hand.y) * 1.9, -2.15, -0.35) : BASE_Y;
      currentPos.x = lerp(currentPos.x, lerp(BASE_X, handWorldX, c), c > 0.05 ? 0.24 : 0.08);
      currentPos.y = lerp(currentPos.y, lerp(BASE_Y, handWorldY, c), c > 0.05 ? 0.24 : 0.08);

      if (hand?.present) currentHandAngle = lerp(currentHandAngle, hand.angle, 0.2);

      const target = tiltRef.current;
      currentTilt.beta = lerp(currentTilt.beta, target.beta, 0.12);
      currentTilt.gamma = lerp(currentTilt.gamma, target.gamma, 0.12);
      // 자이로 이벤트가 한 번도 없었으면(데스크톱) 기울기를 반영하지 않는다
      const gyro = hasGyroRef.current ? 1 : 0;
      const pitch = clamp(currentTilt.beta - 90, -50, 50) * gyro;
      const gyroRoll = clamp(currentTilt.gamma, -45, 45) * gyro;
      const handRoll = THREE.MathUtils.radToDeg(currentHandAngle);
      paddleRoll = lerp(gyroRoll, clamp(handRoll, -60, 60), c);

      swingEnergy *= 0.86;
      const sw = swingEnergy;

      paddle.group.position.x = currentPos.x;
      paddle.group.position.y = currentPos.y + sw * 0.15;
      paddle.group.position.z = BASE_Z + sw * 0.9;
      paddle.group.rotation.x = -0.2 + THREE.MathUtils.degToRad(pitch) * 0.5 * (1 - c) - sw * 0.9;
      paddle.group.rotation.z = THREE.MathUtils.degToRad(paddleRoll) * 0.5;
      paddle.glowRing.material.opacity = 0.5 + sw * 0.45 + c * 0.25;
      rim.intensity = 2.2 + sw * 3;

      // ── 공
      const t = getElapsedRef.current();
      /** 공 아래 탁구대에 그림자 링을 놓는다 — 높이가 높을수록 크고 흐리게 */
      const placeShadow = (s: (typeof pool.slots)[number], x: number, y: number, z: number) => {
        const overTable =
          Math.abs(x) <= TABLE_HALF_W + 0.4 && z <= TABLE_NEAR_Z + 0.4 && z >= TABLE_FAR_Z;
        s.shadow.visible = overTable;
        if (!overTable) return;
        const height = Math.max(0, y - TABLE_Y);
        // 상판 바로 위에 살짝 띄운다 — 완전히 같은 높이면 라인과 겹쳐 지저분해진다
        s.shadow.position.set(x, TABLE_Y + 0.004, z);
        const r = BALL_R * (1.15 + height * 0.85);
        s.shadow.scale.set(r, r, r);
        (s.shadow.material as THREE.MeshBasicMaterial).opacity = clamp(0.5 - height * 0.22, 0.06, 0.5);
      };

      for (const s of pool.slots) {
        if (!s.active || !s.plan) continue;

        if (s.state === "flying") {
          // 접근 구간은 elapsed의 순수 함수 — 오디오가 흔들려도 박자를 유지한다
          ballPosition(s.plan, t, tmp);
          s.mesh.position.set(tmp.x, tmp.y, tmp.z);
          s.glow.position.copy(s.mesh.position);
          placeShadow(s, tmp.x, tmp.y, tmp.z);

          if (t > s.plan.hitAt + 0.3) {
            s.state = "missed";
            s.pos.copy(s.mesh.position);
            // 놓친 공은 그대로 나를 지나쳐 간다
            s.vel.set(s.plan.bV[0], s.plan.bV[1] - GRAVITY * 0.3, s.plan.bV[2]);
            s.age = 0;
            if (!s.reported) {
              s.reported = true;
              onBallMissedRef.current?.(s.plan.id);
            }
          }
          continue;
        }

        // hit / missed — 자유비행 적분
        s.age += dt;
        s.vel.y -= GRAVITY * dt;
        s.pos.addScaledVector(s.vel, dt);

        const floor = TABLE_Y + BALL_R;
        const overTable =
          Math.abs(s.pos.x) <= TABLE_HALF_W &&
          s.pos.z <= TABLE_NEAR_Z &&
          s.pos.z >= TABLE_FAR_Z;
        if (s.pos.y <= floor && s.vel.y < 0 && overTable) {
          s.pos.y = floor;
          s.vel.y = -s.vel.y * 0.62;
          s.vel.x *= 0.9;
          s.vel.z *= 0.9;
        }

        s.mesh.position.copy(s.pos);
        s.glow.position.copy(s.pos);
        placeShadow(s, s.pos.x, s.pos.y, s.pos.z);
        if (s.state === "missed") {
          const fade = clamp(1 - s.age / 0.9, 0, 1);
          (s.glow.material as THREE.MeshBasicMaterial).opacity = 0.18 * fade;
          s.mesh.scale.setScalar(BALL_R * (0.4 + 0.6 * fade));
        }

        if (
          s.pos.y < TABLE_Y - 2.5 ||
          s.pos.z < TABLE_FAR_Z - 4 ||
          s.pos.z > 3.0 ||
          s.age > 2.5
        ) {
          s.mesh.scale.setScalar(BALL_R);
          pool.release(s);
        }
      }

      // ── 카메라 시차(패럴랙스) — 3D 느낌을 만드는 가장 강력한 단서.
      // 정지된 원근 그림은 아무리 정확해도 평면으로 읽히는데, 시점이
      // 조금만 움직여도 앞뒤 물체가 다른 속도로 흘러 뇌가 즉시 깊이를 읽는다.
      // 손을 따라 시점이 살짝 돌아가고(내가 코트를 들여다보는 느낌),
      // 손이 없을 땐 아주 느린 관성 흔들림만 남긴다.
      const sway = (now - startedAt) / 1000;
      const targetCamX = (hand?.present ? (hand.x - 0.5) * 0.9 : 0) + Math.sin(sway * 0.37) * 0.12;
      const targetCamY = (hand?.present ? (0.5 - hand.y) * 0.5 : 0) + Math.sin(sway * 0.29) * 0.07;
      camX = lerp(camX, targetCamX, 0.05);
      camY = lerp(camY, targetCamY, 0.05);
      camera.position.set(camX, 1.1 + camY, 4.4);
      // 시선은 탁구대 중앙에 고정 — 그래야 평행이동이 아니라 "둘러보는" 시차가 된다
      camera.lookAt(camX * 0.25, -1.4, -1.2);

      burst.update(dt);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      apiRef.current = null;
      burst.dispose();
      pool.dispose();
      table.dispose();
      paddle.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
    // 의도적으로 빈 deps — 콜백은 전부 ref로 읽는다. 위 주석 참고.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} className="pointer-events-none absolute inset-0" aria-hidden />;
});

export default RallyScene;
