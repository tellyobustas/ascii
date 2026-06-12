import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/text/video": ["./node_modules/ffmpeg-static/ffmpeg"],
    "/api/video/render": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
  reactStrictMode: true,
};

export default nextConfig;
