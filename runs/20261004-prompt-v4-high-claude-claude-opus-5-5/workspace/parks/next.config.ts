import type { NextConfig } from "next";

const wasm = ["./node_modules/@resvg/resvg-wasm/index_bg.wasm"];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-wasm"],
  outputFileTracingIncludes: { "/api/print/[file]": wasm, "/api/mockup/[file]": wasm },
};

export default nextConfig;
