/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@closepilot/core'],
  output: 'standalone',
};

module.exports = nextConfig;
