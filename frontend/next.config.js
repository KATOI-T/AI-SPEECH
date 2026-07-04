/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 3Dモデルファイル用の設定
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glb|gltf|vrm)$/,
      type: "asset/resource",
    });
    return config;
  },
};

module.exports = nextConfig;
