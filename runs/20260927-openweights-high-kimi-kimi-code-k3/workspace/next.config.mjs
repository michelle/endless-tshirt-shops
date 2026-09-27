/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["sharp", "opentype.js"],
    outputFileTracingIncludes: {
      "/api/art/[token]": ["./assets/fonts/**"],
      "/api/preview": ["./assets/fonts/**"],
    },
  },
};

export default nextConfig;
