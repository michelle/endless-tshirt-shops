import type { NextConfig } from 'next';
const nextConfig: NextConfig = { poweredByHeader: false, serverExternalPackages: ['opentype.js', 'sharp'], outputFileTracingIncludes: {'/*': ['./public/fonts/*.woff']} };
export default nextConfig;
