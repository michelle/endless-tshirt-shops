/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@resvg/resvg-js'],
  outputFileTracingIncludes: {
    '/api/**': ['./fonts/**'],
    '/success': ['./fonts/**'],
  },
  poweredByHeader: false,
};
export default nextConfig;
