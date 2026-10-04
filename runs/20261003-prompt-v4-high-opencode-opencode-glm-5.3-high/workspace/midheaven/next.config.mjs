/** @type {import('next').NextConfig} */
const nextConfig = {
  // @resvg/resvg-js ships a native binding; keep it external to the server bundle
  serverExternalPackages: ['@resvg/resvg-js'],
}

export default nextConfig
