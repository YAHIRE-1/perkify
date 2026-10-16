/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@perkify/auth"],
  async rewrites() {
    const api = process.env.PERKIFY_API_URL;
    if (!api) {
      throw new Error("PERKIFY_API_URL no está definida (necesaria para el rewrite de auth)");
    }
    return [
      {
        source: "/api/auth/:path*",
        destination: `${api}/api/auth/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;