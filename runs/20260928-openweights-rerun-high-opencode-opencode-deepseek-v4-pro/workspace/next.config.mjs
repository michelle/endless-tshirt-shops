/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep the native canvas module external so its .node binary is not
    // bundled by webpack.
    serverComponentsExternalPackages: ['@napi-rs/canvas'],
  },
  // The design PNG endpoint is deterministic and cacheable.
  async headers() {
    return [
      {
        source: '/api/design.png',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
