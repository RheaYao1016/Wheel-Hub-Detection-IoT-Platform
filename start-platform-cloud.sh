#!/bin/bash
set -e

# 云服务器子目录部署配置
# 依赖：云服务器上已运行 frps（bindPort=7000，token=aiwebsite）和 Caddy
# Tailscale 访问地址：http://100.94.241.101:8080/wheelhub/
# 公网访问地址（需开放安全组 8080）：http://118.31.164.41:8080/wheelhub/

export NEXT_PUBLIC_API_BASE_URL="/wheelhub/api"
export BACKEND_INTERNAL_URL="http://127.0.0.1:18081"

node scripts/switch-basepath.mjs cloud
NEXT_PUBLIC_API_BASE_URL="/wheelhub/api" BACKEND_INTERNAL_URL="http://127.0.0.1:18081" npm run build

# 启动前端（绑定到所有接口，供 frp 隧道转发）
PORT=3001 NEXT_PUBLIC_API_BASE_URL="/wheelhub/api" BACKEND_INTERNAL_URL="http://127.0.0.1:18081" npm run start -- --port 3001 --hostname 0.0.0.0
