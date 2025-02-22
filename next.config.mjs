/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    forceSwcTransforms: true,
    appDir: true,
  },
  poweredByHeader: false,
  reactStrictMode: true,
  // キャッシュヘッダーの設定を追加
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
    ];
  },
};

export default nextConfig;
