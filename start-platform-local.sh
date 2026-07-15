#!/bin/bash
set -e

# 本地开发/验证启动脚本
# 访问地址：http://localhost:3001

node scripts/switch-basepath.mjs local
npm run build

PORT=3001 NEXT_PUBLIC_API_BASE_URL=http://localhost:18081/api npm run start -- --port 3001
