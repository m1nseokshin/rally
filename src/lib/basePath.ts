// next.config.ts와 같은 조건으로 basePath를 결정한다. 메타데이터 아이콘/매니페스트처럼
// Next가 자동으로 경로를 다시 써주지 않는 "하드코딩된 절대 경로" 앞에 붙여 쓴다 —
// Vercel(루트 도메인)에선 빈 문자열, GitHub Pages 빌드에선 "/rally".
export const BASE_PATH = process.env.NEXT_PUBLIC_GITHUB_PAGES === "1" ? "/rally" : "";

/**
 * GitHub Pages 빌드는 next.config의 trailingSlash: true 때문에 실제 페이지가
 * `/callback/spotify/`(끝 슬래시 포함)에 생성된다. 슬래시 없는 주소는 301로
 * 넘어가는데, Spotify는 redirect_uri를 **정확히** 일치시켜야 해서 그 차이만으로
 * INVALID_CLIENT가 난다. 콘솔에 등록하는 주소와 코드가 만드는 주소를 맞춘다.
 */
export const TRAILING_SLASH = process.env.NEXT_PUBLIC_GITHUB_PAGES === "1" ? "/" : "";
