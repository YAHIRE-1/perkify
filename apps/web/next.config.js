/** @type {import('next').NextConfig} */
const { varlockNextConfigPlugin } = require("@varlock/nextjs-integration/plugin");

const nextConfig = {
  transpilePackages: ["@perkify/auth"],
  async rewrites() {
    const api = process.env.NEXT_PUBLIC_PERKIFY_API_URL;
    if (!api) {
      throw new Error("NEXT_PUBLIC_PERKIFY_API_URL no está definida (necesaria para el rewrite de auth)");
    }
    return [
      {
        source: "/api/auth/:path*",
        destination: `${api}/api/auth/:path*`,
      },
    ];
  },
};

module.exports = varlockNextConfigPlugin()(nextConfig);