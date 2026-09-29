/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@resvg/resvg-js"],
  },
};

export default nextConfig;
