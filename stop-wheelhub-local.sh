#!/bin/bash

terminate_port() {
  local port="$1"
  local pids=""
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -ti tcp:"${port}" 2>/dev/null || true)"
  fi
  if [ -n "$pids" ]; then
    kill $pids 2>/dev/null || true
    sleep 1
    kill -9 $pids 2>/dev/null || true
  fi
}

echo "Stopping Wheel Hub local services ..."
pkill -f "start-local-backend.sh" 2>/dev/null || true
pkill -f "backend-0.0.1-SNAPSHOT.jar" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
cd "$(dirname "$0")/frp"
pkill -f "./frpc -c frpc.toml" 2>/dev/null || true
terminate_port 18081
terminate_port 3001
echo "Stopped."
