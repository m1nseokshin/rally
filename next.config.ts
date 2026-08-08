import type { NextConfig } from "next";

// GitHub Pages는 프로젝트 페이지라 https://m1nseokshin.github.io/rally/ 처럼
// 서브패스에서 서빙된다 — 로컬 개발(dev)에선 서브패스가 없어야 하니
// production 빌드(next build, GH Actions가 실행)에서만 basePath를 켠다.
// (BASE_PATH와 같은 조건 — lib/basePath.ts)
const isGithubPagesBuild = process.env.NEXT_PUBLIC_GITHUB_PAGES === "1";

const nextConfig: NextConfig = {
  /* config options here */
  // Spotify가 리다이렉트 URI로 127.0.0.1을 강제해서 PC 테스트도 그 오리진으로
  // 접속해야 하는데, Next dev 서버는 기본적으로 localhost 외 오리진을 막는다.
  allowedDevOrigins: ["127.0.0.1", "localhost"],

  // GitHub Pages는 정적 파일만 서빙한다 — API 라우트/미들웨어/서버 컴포넌트의
  // 동적 렌더링이 이 앱엔 없어서(Spotify 연동도 전부 브라우저에서 fetch로
  // 처리) 정적 export가 그대로 통한다.
  ...(isGithubPagesBuild && {
    output: "export",
    basePath: "/rally",
    assetPrefix: "/rally/",
    // GitHub Pages는 폴더+index.html 구조로 라우팅해야 새로고침해도
    // 404가 안 난다 — Next export가 만드는 devices/index.html 같은
    // 구조와 맞춰준다.
    trailingSlash: true,
  }),
};

export default nextConfig;
