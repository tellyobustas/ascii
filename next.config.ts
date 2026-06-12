import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/video/render": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
  reactStrictMode: true,
};

export default nextConfig;
