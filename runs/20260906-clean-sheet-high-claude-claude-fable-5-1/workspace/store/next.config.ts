import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/print/[file]": ["./assets/fonts/**/*"],
    "/mockup/[file]": ["./assets/fonts/**/*"],
  },
  serverExternalPackages: ["@resvg/resvg-js"],
};

export default nextConfig;
