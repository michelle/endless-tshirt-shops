/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Keep the native resvg binary out of the webpack bundle.
    serverComponentsExternalPackages: ["@resvg/resvg-js"],
    // Bundle the font TTFs into serverless functions so resvg can load them at runtime.
    outputFileTracingIncludes: {
      "/api/**/*": ["./assets/fonts/**/*"],
    },
  },
};

export default nextConfig;
