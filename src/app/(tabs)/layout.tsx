import PhoneFrame from "@/components/PhoneFrame";
import OnboardingGate from "@/components/OnboardingGate";
import PageTransition from "@/components/PageTransition";

/** 탭 화면 전용 레이아웃 — 하단 탭바가 있는 일반 앱 화면 */
export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <PhoneFrame>
      <OnboardingGate />
      <PageTransition>{children}</PageTransition>
    </PhoneFrame>
  );
}
