import PhoneFrame from "@/components/PhoneFrame";
import PageTransition from "@/components/PageTransition";

/**
 * 로그인 전용 — 온보딩과 같은 폰 프레임을 쓰되 하단 탭바는 없다.
 * (tabs) 그룹 밖이라 PageTransition을 여기서 직접 감싼다 — 설정에서
 * 들어오는 상세 페이지라 오른쪽에서 밀려 들어와야 한다.
 */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <PhoneFrame hideTabBar>
      <PageTransition>{children}</PageTransition>
    </PhoneFrame>
  );
}
