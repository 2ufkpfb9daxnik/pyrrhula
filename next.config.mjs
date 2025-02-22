/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    forceSwcTransforms: true,
    appDir: true,
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

// CommonJS形式からESM形式に変更
export default nextConfig;
