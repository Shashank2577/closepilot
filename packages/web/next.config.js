/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@closepilot/core'],
  // 'standalone' needed for Docker self-hosting, must be omitted for Vercel.
  // Set NEXT_OUTPUT=standalone in the web Dockerfile; leave unset for Vercel.
  ...(process.env.NEXT_OUTPUT === 'standalone' ? { output: 'standalone' } : {}),
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    return [
      // Proxy all /api/* requests to the Hono backend EXCEPT /api/user (Next.js route)
      {
        source: '/api/deals/:path*',
        destination: `${apiUrl}/api/deals/:path*`,
      },
      {
        source: '/api/activities/:path*',
        destination: `${apiUrl}/api/activities/:path*`,
      },
      {
        source: '/api/approvals/:path*',
        destination: `${apiUrl}/api/approvals/:path*`,
      },
      {
        source: '/api/analytics/:path*',
        destination: `${apiUrl}/api/analytics/:path*`,
      },
      {
        source: '/api/webhooks/:path*',
        destination: `${apiUrl}/api/webhooks/:path*`,
      },
      {
        source: '/api/version',
        destination: `${apiUrl}/api/version`,
      },
    ];
  },
};

module.exports = nextConfig;
