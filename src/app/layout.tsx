import type { Metadata, Viewport } from "next";
import { Bebas_Neue } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import { BASE_PATH } from "@/lib/basePath";
import NoContextMenu from "@/components/NoContextMenu";
import "./globals.css";

// Pretendard — Nike의 Helvetica Now/Futura와 가장 결이 가까운 한글 폰트.
// 기하학적 그로테스크 조형이라 헬베티카 계열 영문과 섞여도 이질감이 없다.
const pretendard = localFont({
  src: "../fonts/PretendardVariable.woff2",
  variable: "--font-pretendard",
  weight: "45 920",
  display: "swap",
});

// 영문 디스플레이 헤드라인 전용 — 한글엔 글리프가 없어 자동으로 Pretendard로 폴백된다.
const bebas = Bebas_Neue({
  variable: "--font-bebas",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Rally",
  description:
    "음악을 분석해 리듬 탁구 XR 세션을 만들고, 기기를 관리하고, 하루의 집중을 되짚는 앱",
  // 홈/플레이/기기/인사이트/설정 탭을 홈 화면에 설치 가능한 웹앱으로 만든다.
  // /rally(XR 세션)는 카메라·오디오·Spotify 실시간 상태를 다루는 화면이라
  // 서비스워커 캐싱 대상에서 의도적으로 제외했다 — 그래서 매니페스트(app/manifest.ts)만
  // 있고 서비스워커는 두지 않았다. 캐시가 이 화면에 끼면 카메라 프레임이나
  // 재생 동기화가 오히려 어긋난다. manifest 링크는 app/manifest.ts가 있으면
  // Next가 자동으로 추가해줘서 여기서 따로 지정하지 않는다.
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Rally",
  },
  // 메타데이터 API의 아이콘/매니페스트 경로는 basePath를 자동으로 안 붙여준다
  // (에셋 청크·<Link>와 달리) — GitHub Pages(/rally 서브패스)에서 깨지지 않게
  // 직접 붙인다.
  icons: {
    // 브라우저 탭(파비콘)은 16/32처럼 작은 크기를 먼저 찾는다 — 192/512만 있으면
    // 그걸 억지로 축소해 탭에 넣는데, 로고처럼 가는 획이 있는 마크는 그 축소에서
    // 뭉개진다. 작은 크기를 따로 구워 뒀다.
    icon: [
      { url: `${BASE_PATH}/icons/favicon-16.png`, sizes: "16x16", type: "image/png" },
      { url: `${BASE_PATH}/icons/favicon-32.png`, sizes: "32x32", type: "image/png" },
      { url: `${BASE_PATH}/icons/icon-192.png`, sizes: "192x192", type: "image/png" },
      { url: `${BASE_PATH}/icons/icon-512.png`, sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: `${BASE_PATH}/icons/apple-touch-icon.png`, sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111111" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  // viewport-fit: cover는 일부러 안 쓴다. 이걸 켜면 콘텐츠가 노치·홈
  // 인디케이터 영역까지 직접 확장되고, 그 이후로는 env(safe-area-inset-*)를
  // 우리가 일일이 계산해서 되돌려 막아야 한다 — iOS 26에서 바로 그 계산
  // 경로(safe-area 로직 자체)가 고장 나서, 탭바가 화면 끝에 안 닿고 뜨는
  // 증상으로 나타났다. 이 옵션을 안 켜면 Safari가 애초에 콘텐츠를 안전
  // 영역 안에만 그려서, 우리가 뭘 계산할 필요 자체가 없어진다.
};

// 저장된 테마를 첫 페인트 전에 <html>에 반영 — React가 하이드레이션하기
// 전이라 한 프레임이라도 잘못된 테마가 번쩍이는 걸(FOUC) 막는다.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("rally-theme");
    var dark =
      stored === "dark" ||
      (stored !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // theme-init 스크립트가 하이드레이션 전에 data-theme을 직접 심는다 —
  // 서버가 그린 마크업엔 이 속성이 없어 React가 불일치로 보고 콘솔에 에러를
  // 찍는다. 의도된 차이라 suppressHydrationWarning으로 알려준다.
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${pretendard.variable} ${bebas.variable} antialiased`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_INIT_SCRIPT}
        </Script>
        {/* 잠시 꺼둠 — 요청 시 다시 켜기 */}
        {/* <NoContextMenu /> */}
        {children}
      </body>
    </html>
  );
}
