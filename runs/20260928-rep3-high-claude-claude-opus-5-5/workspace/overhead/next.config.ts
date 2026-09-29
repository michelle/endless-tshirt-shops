import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js"],
  // The art renderer rasterizes text with these font files at runtime.
  outputFileTracingIncludes: {
    "/api/art/[kind]": ["./public/fonts/**/*"],
  },
};

export default nextConfig;
