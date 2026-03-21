/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },

  // API proxy (redundant with Nginx but useful for local dev)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://konggest-backend:8000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
