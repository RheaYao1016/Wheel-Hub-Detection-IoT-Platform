#!/bin/bash
set -e

# 本地运行 Wheel Hub 前后端
# 供 Tailscale 直接访问：http://<本机-tailscale-ip>:3001/wheelhub/
# 供云端 frps HTTP 代理转发：http://118.31.164.41:8080/wheelhub/

cd "$(dirname "$0")"

terminate_port() {
  local port="$1"
  local pids=""
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -ti tcp:"${port}" 2>/dev/null || true)"
  fi
  if [ -n "$pids" ]; then
    echo "Releasing port ${port}: ${pids}"
    kill $pids 2>/dev/null || true
    sleep 1
    kill -9 $pids 2>/dev/null || true
  fi
}

echo "[0/3] Cleaning previous local services ..."
pkill -f "backend-0.0.1-SNAPSHOT.jar" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
pkill -f "./frpc -c frpc.toml" 2>/dev/null || true
terminate_port 18081
terminate_port 3001
sleep 2

# 1. 启动后端（Spring Boot）
echo "[1/3] Starting backend on 127.0.0.1:18081 ..."
nohup bash start-local-backend.sh > backend-local.log 2>&1 &
sleep 12

# 2. 启动前端（Next.js 子目录模式）
if [ "${SKIP_FRONTEND_BUILD:-0}" != "1" ]; then
  echo "[2/4] Building frontend production bundle ..."
  npm run build > frontend-build.log 2>&1
else
  echo "[2/4] Skipping frontend build because SKIP_FRONTEND_BUILD=1"
fi

echo "[3/4] Starting frontend on 0.0.0.0:3001 ..."
export PORT=3001
export NEXT_PUBLIC_API_BASE_URL=/wheelhub/api
export BACKEND_INTERNAL_URL=http://127.0.0.1:18081
nohup npm run start -- --port 3001 --hostname 0.0.0.0 > frontend-local.log 2>&1 &
sleep 8

# 3. 启动 frpc HTTP 代理
echo "[4/4] Starting frpc (HTTP /wheelhub -> local 3001) ..."
cd frp
if [ -x "./frpc" ] && ./frpc -v >/dev/null 2>&1; then
  nohup ./frpc -c frpc.toml > frpc.log 2>&1 &
  sleep 3
else
  echo "Skipping frpc: current binary is not executable on this machine." | tee frpc.log
fi

echo "Done. Check logs: backend-local.log, frontend-local.log, frp/frpc.log"
