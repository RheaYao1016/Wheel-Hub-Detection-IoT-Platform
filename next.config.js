/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverComponentsExternalPackages: ['three', '@react-three/fiber'],
    optimizePackageImports: ['lucide-react', 'echarts', '@react-three/drei'],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glb|gltf|hdr)$/,
      type: 'asset/resource',
    });
    return config;
  },
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: true,
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
