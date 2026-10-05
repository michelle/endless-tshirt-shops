/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  outputFileTracingIncludes: {
    "/api/preview": ["./assets/**/*", "./data/**/*"],
    "/api/artwork/[token]": ["./assets/**/*", "./data/**/*"],
    "/api/artwork/[token]/route": ["./assets/**/*", "./data/**/*"],
  },
  async rewrites() {
    return [{ source: "/prints/:token.png", destination: "/api/artwork/:token" }];
  },
};

export default nextConfig;
