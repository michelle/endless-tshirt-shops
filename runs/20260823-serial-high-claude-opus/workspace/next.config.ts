import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // @napi-rs/canvas ships a platform-specific .node binary. Keep it external so
  // the bundler doesn't try to trace/inline it, and tell Vercel to include the
  // native files in the serverless bundle.
  serverExternalPackages: ['@napi-rs/canvas'],
  outputFileTracingIncludes: {
    '/api/**/*': ['./public/fonts/**/*'],
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
