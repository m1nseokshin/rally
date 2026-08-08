import type { MetadataRoute } from "next";
import { BASE_PATH } from "@/lib/basePath";

// output: "export"(정적 export)에서는 라우트 핸들러가 빌드 타임에 고정 결과를
// 낼 수 있다는 걸 명시해야 한다 — 이 매니페스트는 요청마다 달라질 게 없다.
export const dynamic = "force-static";

// public/manifest.webmanifest 정적 파일 대신 Next의 manifest 파일 컨벤션을 쓴다.
// 정적 파일은 basePath(/rally, GitHub Pages 빌드에서만 켜짐)를 모르고 그대로
// 서빙되지만, 이 방식은 Next가 아이콘/시작 경로에 basePath를 자동으로 붙여줘서
// Vercel(루트 도메인)과 GitHub Pages(/rally 서브패스) 양쪽에서 별도 파일 없이
// 같은 소스로 정확한 경로가 나온다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rally — 리듬 탁구 XR",
    short_name: "Rally",
    description:
      "음악을 분석해 리듬 탁구 XR 세션을 만들고, 기기를 관리하고, 하루의 집중을 되짚는 앱",
    start_url: `${BASE_PATH}/`,
    scope: `${BASE_PATH}/`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "ko",
    icons: [
      {
        src: `${BASE_PATH}/icons/icon-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${BASE_PATH}/icons/icon-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `${BASE_PATH}/icons/maskable-192.png`,
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: `${BASE_PATH}/icons/maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
