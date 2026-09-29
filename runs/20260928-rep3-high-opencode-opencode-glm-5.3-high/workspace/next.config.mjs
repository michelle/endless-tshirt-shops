/** @type {import('next').NextConfig} */
const nextConfig = {
  // @resvg/resvg-js is a native module; keep it external to the server bundle.
  experimental: {
    serverComponentsExternalPackages: ["@resvg/resvg-js"],
    // Bundle the OFL font files into the serverless functions.
    outputFileTracingIncludes: {
      "/api/**": ["./fonts/**"],
      "/success": ["./fonts/**"],
    },
  },
};

export default nextConfig;
