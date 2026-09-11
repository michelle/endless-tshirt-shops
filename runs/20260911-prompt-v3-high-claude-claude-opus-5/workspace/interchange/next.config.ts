import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "opentype.js"],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
