/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Disable canvas for PDF.js
    config.resolve.alias.canvas = false;
    return config;
  },
};

module.exports = nextConfig;
