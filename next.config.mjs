/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    forceSwcTransforms: true,
  },
  poweredByHeader: false,
  reactStrictMode: true,
  output: "standalone",
  async headers() {
    return [
      {
        source: "/api/users",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=60, stale-while-revalidate=30",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store",
          },
        ],
      },
    ];
  },
  images: {
    domains: ["avatars.githubusercontent.com"],
  },
};

export default nextConfig;
