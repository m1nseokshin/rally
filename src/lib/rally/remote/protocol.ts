/**
 * PC 화면(호스트) ↔ 폰 컨트롤러 사이에 오가는 메시지.
 *
 * 전송은 WebRTC DataChannel이다. 리듬 판정 윈도우가 0.12초라 서버를
 * 한 번 거치는 것만으로도 판정이 흔들려서, 중계 서버를 두는 대신 P2P로
 * 직접 잇는다. 시그널링(최초 handshake)만 외부 브로커를 쓰고, 연결된
 * 뒤로는 두 기기가 직접 주고받는다 — 같은 Wi-Fi면 사실상 LAN 지연이다.
 *
 * 포즈는 초당 수십 번 흐르므로 키 이름을 한 글자로 줄였다. DataChannel은
 * 메시지마다 오버헤드가 붙어서, 이 정도 빈도에선 이름 길이가 그대로
 * 대역폭이 된다.
 */

/** 폰 → PC */
export type ControllerMessage =
  /** 연결 직후 한 번 — PC가 "무엇이 붙었는지" 표시할 수 있게 */
  | { t: "hello"; name: string }
  /**
   * 라켓 위치. x/y는 화면 기준 0~1로, 카메라 손 추적이 내보내던 값과
   * 같은 좌표계다(그래야 씬 쪽을 손댈 필요가 없다).
   */
  | { t: "pose"; x: number; y: number; roll: number }
  /** 휘두른 순간. power 0(살살)~1(풀스윙) */
  | { t: "swing"; power: number; dir: number };

/** PC → 폰 — 폰 화면에 상태를 비춰주고 진동으로 피드백을 준다 */
export type HostMessage =
  | { t: "stage"; stage: "ready" | "playing" | "done" }
  | { t: "judge"; result: "perfect" | "good" | "miss"; score: number };

/**
 * 페어링 코드로 쓸 4글자. 헷갈리는 글자(0/O, 1/I/L)를 뺐다 — QR을 못 읽어
 * 손으로 칠 때 이런 게 바로 실패로 이어진다.
 */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function makePairingCode(len = 4): string {
  let out = "";
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) out += ALPHABET[buf[i] % ALPHABET.length];
  return out;
}

/**
 * PeerJS 공개 브로커는 전 세계가 같이 쓰는 이름 공간이라, 코드 네 글자만
 * 쓰면 남의 세션과 부딪힌다. 앱 고유 접두사를 붙여 사실상 우리 것만
 * 모이도록 한다.
 */
export const peerIdFor = (code: string) => `rally-xr-${code}`;
