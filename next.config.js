const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  distDir: '.next-app',
  basePath: '/wheel',
  images: {
    remotePatterns: [],
    formats: ['image/avif', 'image/webp'],
    unoptimized: true,
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
  headers: async () => [
    {
      source: '/manifest.json',
      headers: [
        {
          key: 'Content-Type',
          value: 'application/manifest+json',
        },
        {
          key: 'Cache-Control',
          value: 'public, max-age=3600',
        },
      ],
    },
    {
      source: '/sw.js',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=0, must-revalidate',
        },
        {
          key: 'Service-Worker-Allowed',
          value: '/',
        },
      ],
    },
    {
      source: '/offline.html',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=86400',
        },
      ],
    },
  ],
};

module.exports = withSentryConfig(nextConfig, {
  // 自动上传Source Map到Sentry
  sourcemaps: {
    disable: true,
    hideSourceMaps: true,
  },

  // 编译时自动注入Sentry SDK
  automaticVercelMonitors: false,

  // 禁用遥测数据收集
  telemetry: false,

  // 拓宽客户端源映射
  widenClientFileUpload: false,

  // 禁用Sentry CLI调试信息（生产环境）
  debug: false,
});
