/** @type {import('next').NextConfig} */
const nextConfig = {
  // resvg-js and astronomy-engine are used inside route handlers only.
  serverExternalPackages: ['@resvg/resvg-js'],
};

module.exports = nextConfig;
