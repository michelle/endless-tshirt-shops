/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The SVG rasteriser ships as WebAssembly and is fetched from /public at
  // runtime, so no native module has to match the server platform.
  serverExternalPackages: [],
};

export default nextConfig;
