/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Chivo is read from disk at request time, and Vercel's tracer cannot see that
  // through `path.join(process.cwd(), …)`. Without this the OG route 500s and,
  // worse, the print asset could ship a blank shirt. Pin it explicitly.
  outputFileTracingIncludes: {
    '/api/artwork': ['./public/fonts/Chivo-Bold.ttf'],
    '/opengraph-image': ['./public/fonts/Chivo-Bold.ttf'],
  },
  async headers() {
    return [
      {
        // Prodigi fetches artwork by URL; make sure nothing in front of it caches
        // a *different* timestamp under the same key and keep it publicly fetchable.
        source: '/api/artwork',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
    ];
  },
};

export default nextConfig;
