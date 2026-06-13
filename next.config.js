/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      '/api/recommend': ['./data/**'],
      '/api/dashboard': ['./data/**'],
    },
  },
};

module.exports = nextConfig;
