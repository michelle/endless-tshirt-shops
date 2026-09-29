/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@napi-rs/canvas"],
    // Ensure the bundled fonts are traced into the serverless output for the
    // design route (which reads them from the filesystem at runtime).
    outputFileTracingIncludes: {
      "/api/design": ["./lib/fonts/**/*"],
    },
  },
};

export default nextConfig;
