/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@resvg/resvg-js', 'astronomy-engine'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'pwintyimages.blob.core.windows.net' },
      { protocol: 'https', hostname: '*.prodigi.com' },
    ],
  },
};

export default nextConfig;
