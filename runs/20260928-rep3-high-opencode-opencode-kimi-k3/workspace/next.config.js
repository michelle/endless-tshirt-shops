/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@napi-rs/canvas'],
    outputFileTracingIncludes: {
      '/api/artwork': ['./public/fonts/**', './data/**'],
      '/api/checkout': ['./data/**'],
      '/api/order/status': ['./data/**'],
      '/api/stripe/webhook': ['./data/**'],
    },
  },
};

module.exports = nextConfig;
