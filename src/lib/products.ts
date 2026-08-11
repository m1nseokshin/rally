import type { DictKey } from "@/lib/i18n/dictionary";

/**
 * 제품/서비스 소개 — 홈의 레일과 뉴스룸형 상세 페이지가 같이 쓴다.
 *
 * public/images/ 아래에 파일을 넣고 여기 image/hero에 경로만 적으면 자동으로
 * 반영된다. image가 목록 썸네일과 상세 히어로 둘 다의 기본값이고, hero를
 * 따로 주면 상세에서만 다른 이미지를 쓸 수 있다. 비워두면 브랜드 그라디언트로
 * 대체된다 — 이미지가 없다고 레이아웃이 깨지지 않게 폴백을 먼저 만들어 뒀다.
 * (GitHub Pages 서브패스는 렌더 시점에 BASE_PATH가 붙는다)
 */
export type ProductSection = {
  headingKey: DictKey;
  bodyKey: DictKey;
  /** 본문 중간 이미지 — 없으면 이미지 없이 글만 나온다 */
  image?: string;
};

export type Product = {
  id: string;
  /** 목록 카드의 위쪽 작은 라벨 */
  eyebrowKey: DictKey;
  nameKey: DictKey;
  taglineKey: DictKey;
  /** 상세 상단 대형 이미지 */
  hero?: string;
  /** 목록 카드 썸네일 */
  image?: string;
  /** 카드/상세 상단의 폴백 그라디언트 두 색 */
  cover: [string, string];
  /** 상세 상단 스펙 — 라벨/값 모두 사전 키 */
  specs: { labelKey: DictKey; valueKey: DictKey }[];
  sections: ProductSection[];
};

export const products: Product[] = [
  {
    id: "vision",
    eyebrowKey: "product.vision.eyebrow",
    nameKey: "product.vision.name",
    taglineKey: "product.vision.tagline",
    image: "/images/rally-vision.png",
    cover: ["#f24822", "#7a1f0c"],
    specs: [
      { labelKey: "product.spec.size", valueKey: "product.vision.spec.size" },
      { labelKey: "product.spec.weight", valueKey: "product.vision.spec.weight" },
      { labelKey: "product.spec.display", valueKey: "product.vision.spec.display" },
      { labelKey: "product.spec.resolution", valueKey: "product.vision.spec.resolution" },
      { labelKey: "product.spec.refreshRate", valueKey: "product.vision.spec.refreshRate" },
      { labelKey: "product.spec.fov", valueKey: "product.vision.spec.fov" },
      { labelKey: "product.spec.tracking", valueKey: "product.vision.spec.tracking" },
      { labelKey: "product.spec.handTracking", valueKey: "product.vision.spec.handTracking" },
      { labelKey: "product.spec.connectivity", valueKey: "product.vision.spec.connectivity" },
      { labelKey: "product.spec.chargingType", valueKey: "product.vision.spec.chargingType" },
      { labelKey: "product.spec.battery", valueKey: "product.vision.spec.battery" },
    ],
    sections: [
      { headingKey: "product.vision.s1.heading", bodyKey: "product.vision.s1.body" },
      { headingKey: "product.vision.s2.heading", bodyKey: "product.vision.s2.body" },
      { headingKey: "product.vision.s3.heading", bodyKey: "product.vision.s3.body" },
    ],
  },
  {
    id: "paddle",
    eyebrowKey: "product.paddle.eyebrow",
    nameKey: "product.paddle.name",
    taglineKey: "product.paddle.tagline",
    image: "/images/rally-paddle.png",
    cover: ["#1151ff", "#0a1d5c"],
    specs: [
      { labelKey: "product.spec.size", valueKey: "product.paddle.spec.size" },
      { labelKey: "product.spec.weight", valueKey: "product.paddle.spec.weight" },
      { labelKey: "product.spec.battery", valueKey: "product.paddle.spec.battery" },
      { labelKey: "product.spec.connectivity", valueKey: "product.paddle.spec.connectivity" },
      { labelKey: "product.spec.chargingType", valueKey: "product.paddle.spec.chargingType" },
      { labelKey: "product.spec.motionSensor", valueKey: "product.paddle.spec.motionSensor" },
      { labelKey: "product.spec.hapticActuator", valueKey: "product.paddle.spec.hapticActuator" },
    ],
    sections: [
      { headingKey: "product.paddle.s1.heading", bodyKey: "product.paddle.s1.body" },
      { headingKey: "product.paddle.s2.heading", bodyKey: "product.paddle.s2.body" },
    ],
  },
];

export function findProduct(id: string | null) {
  return products.find((p) => p.id === id) ?? null;
}
