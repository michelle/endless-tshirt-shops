import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/print-image': ['./fonts/**'],
  },
};

export default nextConfig;
