import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["sharp", "opentype.js", "astronomy-engine"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./data/**/*", "./fonts/**/*", "./node_modules/@img/sharp-linux-arm64/**/*", "./node_modules/@img/sharp-libvips-linux-arm64/**/*"],
    "/order/**/*": ["./data/**/*", "./fonts/**/*", "./node_modules/@img/sharp-linux-arm64/**/*", "./node_modules/@img/sharp-libvips-linux-arm64/**/*"],
  },
};
export default config;
