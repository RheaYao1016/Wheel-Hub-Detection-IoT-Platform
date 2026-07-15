#!/bin/bash
set -e

# 低资源 Next.js 启动脚本
# 端口：3000

export PORT=3000
export HOST=0.0.0.0
export NODE_ENV=production
export BACKEND_INTERNAL_URL=http://127.0.0.1:18081
export NEXT_PUBLIC_BASE_PATH=""
export NEXT_PUBLIC_API_BASE_URL="/api"
export TZ=Asia/Shanghai

# Node.js 低内存设置：最大旧生代 256MB
cd /opt/wheelhub/frontend
exec /usr/local/bin/wheelhub-node \
  --max-old-space-size=256 \
  --optimize-for-size \
  node_modules/next/dist/bin/next \
  start --port 3000 --hostname 0.0.0.0
