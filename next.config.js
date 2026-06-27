/** @type {import('next').NextConfig} */
const nextConfig = {
  // pdf-parse is a CommonJS lib that should run server-side only.
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse"],
  },
};

module.exports = nextConfig;
