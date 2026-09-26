/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@napi-rs/canvas'],
  // Terrain tiles + geocoding are fetched server-side only.
  images: { unoptimized: true },
};

export default nextConfig;
