/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a self-contained .next/standalone build for Docker images.
  output: "standalone",
};

module.exports = nextConfig;
