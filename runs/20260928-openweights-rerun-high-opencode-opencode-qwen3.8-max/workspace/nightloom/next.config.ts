import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // resvg ships native binaries; keep it out of the bundler.
  serverExternalPackages: ["@resvg/resvg-js"],
};

export default nextConfig;
