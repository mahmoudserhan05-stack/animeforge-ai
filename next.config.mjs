/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  eslint: {
    // We already run lint separately in CI/dev; don't block builds on it.
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
