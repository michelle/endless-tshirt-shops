import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // @napi-rs/canvas ships a native binary; it must stay external to the bundle.
  serverExternalPackages: ['@napi-rs/canvas'],
  // The print renderer reads the Chivo TTF at runtime, so keep it in the
  // function bundle that Next.js traces for the artwork routes.
  outputFileTracingIncludes: {
    '/api/artwork/**': ['./src/assets/fonts/**'],
    '/api/og': ['./src/assets/fonts/**'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ];
  },
};

export default nextConfig;
