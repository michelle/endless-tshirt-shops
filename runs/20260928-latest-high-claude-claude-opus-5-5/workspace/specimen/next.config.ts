import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@resvg/resvg-js"],
  // The print renderer reads the TTFs from disk; make sure they ship with the functions that render.
  outputFileTracingIncludes: {
    "/api/mockup": ["./public/fonts/**/*"],
    "/api/order": ["./public/fonts/**/*"],
    "/api/webhooks/stripe": ["./public/fonts/**/*"],
  },
};

export default nextConfig;
