/** @type {import('next').NextConfig} */
const nextConfig = {
  // resvg's wasm binary and the IM Fell font files are read from disk at request
  // time by the print-file renderer, so they must be traced into that function.
  outputFileTracingIncludes: {
    '/api/art': ['./assets/**/*'],
  },
};
export default nextConfig;
