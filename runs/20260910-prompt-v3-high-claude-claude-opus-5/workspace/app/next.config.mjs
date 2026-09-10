/** @type {import('next').NextConfig} */
const nextConfig = {
  // resvg is a native addon; leave it out of the bundler and load it at runtime.
  serverExternalPackages: ['@resvg/resvg-js'],
  outputFileTracingIncludes: {
    '/api/artwork': ['./fonts/**'],
    '/api/preview': ['./fonts/**'],
  },
};

export default nextConfig;
