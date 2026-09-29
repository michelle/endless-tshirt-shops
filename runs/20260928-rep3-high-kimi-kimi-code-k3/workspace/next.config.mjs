/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@resvg/resvg-js"],
    outputFileTracingIncludes: {
      "/api/artwork": ["./fonts/**"],
    },
  },
};

export default nextConfig;
