/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/wheelhub',
  assetPrefix: '/wheelhub',
  env: {
    NEXT_PUBLIC_BASE_PATH: '/wheelhub',
  },
  images: {
    remotePatterns: [],
    formats: ['image/avif', 'image/webp'],
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.BACKEND_INTERNAL_URL || 'http://127.0.0.1:18081'}/api/:path*`,
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ['three', '@react-three/fiber'],
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glb|gltf|hdr)$/,
      type: 'asset/resource',
    });
    return config;
  },
  compress: false,
  poweredByHeader: false,
  reactStrictMode: true,
  swcMinify: false,
  productionBrowserSourceMaps: false,
};

module.exports = nextConfig;
