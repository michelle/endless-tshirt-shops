import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Artwork and mockups are deterministic for a given URL, so they are
        // safe to cache hard. Prodigi fetches the artwork URLs directly when
        // preparing print-ready assets, and Stripe fetches the mockups.
        source: '/api/:kind(artwork|preview)/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};

export default nextConfig;
