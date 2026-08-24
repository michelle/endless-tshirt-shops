/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The artwork renderer reads the print typeface off disk at request time.
  outputFileTracingIncludes: {
    '/api/artwork': ['./assets/Chivo-Bold.ttf'],
  },
  async headers() {
    return [
      {
        source: '/api/artwork',
        headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }],
      },
    ];
  },
};

export default nextConfig;
