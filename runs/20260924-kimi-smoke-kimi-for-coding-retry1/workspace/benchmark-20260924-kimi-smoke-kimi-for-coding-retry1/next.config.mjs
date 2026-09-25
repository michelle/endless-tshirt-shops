/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // @napi-rs/canvas ships native .node binaries; keep them out of the bundle.
  experimental: {
    serverComponentsExternalPackages: ['@napi-rs/canvas', 'canvas'],
  },
};

export default nextConfig;
