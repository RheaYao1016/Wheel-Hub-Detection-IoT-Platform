#!/bin/bash

print_port_status() {
  if command -v ss >/dev/null 2>&1; then
    ss -tlnp 2>/dev/null | grep -E "18081|3001" && return 0
  fi

  if command -v lsof >/dev/null 2>&1; then
    lsof -nP -iTCP -sTCP:LISTEN 2>/dev/null | grep -E ":(18081|3001)" && return 0
  fi

  return 1
}

echo "=== Wheel Hub Local Services ==="
ps aux | grep -E "java .*target/.*\\.jar|next-server|node .*next/dist/bin/next|./frpc -c frpc.toml" | grep -v grep || echo "No services running"

echo ""
echo "=== Ports ==="
print_port_status || echo "No listening ports"

echo ""
echo "=== Quick Health Checks ==="
curl -s -o /dev/null -w "backend 127.0.0.1:18081/api/health: %{http_code}\n" http://127.0.0.1:18081/api/health || true
curl -sL -o /dev/null -w "frontend 127.0.0.1:3001/wheelhub/login: %{http_code}\n" http://127.0.0.1:3001/wheelhub/login || true
