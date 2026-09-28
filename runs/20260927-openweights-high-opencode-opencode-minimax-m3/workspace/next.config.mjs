/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
    // @resvg/resvg-js ships a native .node addon that webpack must not try to
    // bundle. Marking it as a server external keeps it out of the bundle and
    // lets the runtime require() resolve to the platform-native prebuilt binary.
    serverComponentsExternalPackages: ["@resvg/resvg-js"],
  },
};
export default nextConfig;
