import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The artwork renderer reads the Chivo TTFs off disk at request time, so the
  // font files have to be traced into the serverless bundle explicitly.
  outputFileTracingIncludes: {
    '/api/artwork/[ts]': ['./assets/**'],
    '/opengraph-image': ['./assets/**'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;
