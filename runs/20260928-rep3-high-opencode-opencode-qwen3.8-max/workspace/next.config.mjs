/** @type {import('next').NextConfig} */
const nextConfig = {
  // resvg is a native module; keep it out of the webpack bundle and load it
  // from node_modules at runtime instead.
  serverExternalPackages: ['@resvg/resvg-js'],
  // resvg reads the bundled TTFs from disk at runtime; make sure the
  // serverless function tracer includes them in the deployed bundle.
  outputFileTracingIncludes: {
    '/api/**/*': ['./public/fonts/*.ttf'],
  },
};

export default nextConfig;
