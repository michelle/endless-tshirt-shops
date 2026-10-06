/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    serverComponentsExternalPackages: ["@resvg/resvg-js", "astronomy-engine"],
  },
};

export default nextConfig;
