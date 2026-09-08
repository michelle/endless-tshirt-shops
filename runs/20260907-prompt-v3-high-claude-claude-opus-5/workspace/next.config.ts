import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js"],
  // resvg loads fonts from disk, so they must be traced into the lambda.
  outputFileTracingIncludes: {
    "/api/art/**": ["./public/fonts/**"],
  },
};

export default nextConfig;
