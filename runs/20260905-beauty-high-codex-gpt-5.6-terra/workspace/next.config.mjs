/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  images: { unoptimized: true },
  experimental: { serverComponentsExternalPackages: ["@resvg/resvg-js"] },
};

export default nextConfig;
