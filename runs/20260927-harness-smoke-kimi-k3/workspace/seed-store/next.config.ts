import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@napi-rs/canvas"],
  outputFileTracingIncludes: {
    "/api/artwork": ["./fonts/**/*"],
  },
};

export default nextConfig;
