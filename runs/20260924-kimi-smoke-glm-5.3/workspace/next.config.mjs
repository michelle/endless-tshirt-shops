/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The print renderer loads fonts + the resvg wasm binary from the filesystem
  // at request time, so make sure they are traced into the serverless bundle.
  experimental: {
    outputFileTracingIncludes: {
      "/api/print": ["./src/lib/assets/**"],
    },
  },
};

export default nextConfig;
