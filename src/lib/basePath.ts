// next.config.ts와 같은 조건으로 basePath를 결정한다. 메타데이터 아이콘/매니페스트처럼
// Next가 자동으로 경로를 다시 써주지 않는 "하드코딩된 절대 경로" 앞에 붙여 쓴다 —
// Vercel(루트 도메인)에선 빈 문자열, GitHub Pages 빌드에선 "/rally".
export const BASE_PATH = process.env.NEXT_PUBLIC_GITHUB_PAGES === "1" ? "/rally" : "";
