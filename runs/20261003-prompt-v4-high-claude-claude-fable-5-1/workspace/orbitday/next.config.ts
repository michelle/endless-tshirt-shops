import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-wasm"],
  outputFileTracingIncludes: {
    "/api/art/[token]": ["./node_modules/@resvg/resvg-wasm/index_bg.wasm"],
    "/api/art/**": ["./node_modules/@resvg/resvg-wasm/index_bg.wasm"],
    "/api/health": ["./node_modules/@resvg/resvg-wasm/index_bg.wasm"],
  },
  reactStrictMode: true,
};

export default nextConfig;
