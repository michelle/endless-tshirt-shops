import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js"],
  outputFileTracingIncludes: {
    "/api/print/*": ["./assets/fonts/**/*"],
    "/api/preview/*": ["./assets/fonts/**/*"],
  },
};

export default nextConfig;
