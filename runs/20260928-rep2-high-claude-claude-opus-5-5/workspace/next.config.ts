import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js"],
  outputFileTracingIncludes: {
    "/api/print/[token]": ["./public/fonts/**/*"],
    "/api/preview/[token]": ["./public/fonts/**/*"],
  },
};

export default nextConfig;
