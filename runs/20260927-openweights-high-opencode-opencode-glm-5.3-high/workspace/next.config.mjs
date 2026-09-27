/** @type {import('next').NextConfig} */
const nextConfig = {
  // @resvg/resvg-js is a native module; keep it out of the webpack bundle.
  serverExternalPackages: ["@resvg/resvg-js"],
  // Fonts are read from disk at render time by @resvg/resvg-js, so make sure
  // they are traced into the serverless bundle for the routes that need them.
  outputFileTracingIncludes: {
    "/api/artwork": ["./public/fonts/static/**/*"],
    "/api/webhooks/stripe": ["./public/fonts/static/**/*"],
  },
  poweredByHeader: false,
};

export default nextConfig;
