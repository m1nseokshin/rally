import { SPATIAL_GATE } from "./rallyConfig";
import type { Judgement } from "./useBeatEngine";

/** 라켓이 공에 얼마나 정확히 갔는가 — 타이밍과 별개인 공간 판정 결과 */
export type Contact = "none" | "edge" | "clean";

/**
 * 타이밍 등급(비트 엔진)에 공간 판정을 겹쳐 최종 등급을 낸다.
 *
 * 비트 엔진은 여전히 시간의 진실의 원천이다 — 이 함수는 "박자는 맞았는데
 * 라켓이 엉뚱한 데 있었다"는 경우만 깎는다. 반대로 공간이 완벽해도
 * 박자가 틀렸으면 그건 이미 timing이 miss로 들어온다.
 */
export function applyContact(timing: Judgement, contact: Contact): Judgement {
  if (SPATIAL_GATE === "off") return timing;
  if (timing === "miss") return "miss";
  if (contact === "clean") return timing;

  if (SPATIAL_GATE === "strict") {
    // 진짜 탁구 — 빗맞으면 넘어가지 않는다
    return "miss";
  }

  // assist — 빗맞아도 한 등급 강등으로 봐준다
  if (contact === "edge") return timing === "perfect" ? "good" : "miss";
  return "miss";
}
