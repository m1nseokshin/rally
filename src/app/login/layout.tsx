import PhoneFrame from "@/components/PhoneFrame";

/** 로그인 전용 — 온보딩과 같은 폰 프레임을 쓰되 하단 탭바는 없다 */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <PhoneFrame hideTabBar>{children}</PhoneFrame>;
}
