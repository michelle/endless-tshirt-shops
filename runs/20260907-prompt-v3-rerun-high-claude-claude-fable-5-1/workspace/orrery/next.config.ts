import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js"],
  outputFileTracingIncludes: {
    "/api/render": ["./src/fonts/*.ttf"],
    "/api/print/[id]": ["./src/fonts/*.ttf"],
  },
};

export default nextConfig;
