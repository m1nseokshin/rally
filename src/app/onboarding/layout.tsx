import PhoneFrame from "@/components/PhoneFrame";

/** 온보딩 전용 — 탭 화면과 같은 폰 프레임을 쓰되 하단 탭바는 없다 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <PhoneFrame hideTabBar>{children}</PhoneFrame>;
}
