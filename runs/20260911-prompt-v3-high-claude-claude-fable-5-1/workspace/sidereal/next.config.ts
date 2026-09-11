import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // resvg is a native binding; keep it out of the bundler.
  serverExternalPackages: ["@resvg/resvg-js"],
  // The renderer reads the bundled fonts from disk at runtime.
  outputFileTracingIncludes: {
    "/*": ["./assets/fonts/**/*"],
  },
};

export default nextConfig;
