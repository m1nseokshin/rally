import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Spotify가 리다이렉트 URI로 127.0.0.1을 강제해서 PC 테스트도 그 오리진으로
  // 접속해야 하는데, Next dev 서버는 기본적으로 localhost 외 오리진을 막는다.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
