import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/api/print-art", headers: [{ key: "Cache-Control", value: "public, max-age=86400, s-maxage=86400" }] }];
  },
};

export default nextConfig;
