import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js"],
  outputFileTracingIncludes: {
    "/api/print/**": ["./public/fonts/**"],
    "/api/print/*": ["./public/fonts/**"],
  },
};

export default nextConfig;
