import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js"],
  outputFileTracingIncludes: {
    "/api/art": ["./public/fonts/*"],
    "/api/art/route": ["./public/fonts/*"],
    "/api/health": ["./public/fonts/*"],
    "/api/health/route": ["./public/fonts/*"],
  },
};

export default nextConfig;
