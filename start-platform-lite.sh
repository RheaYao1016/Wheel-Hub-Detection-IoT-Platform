#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

BACKEND_DIR="$ROOT_DIR/backend"
DATA_DIR="$BACKEND_DIR/data"
AI_ML_WORKSPACE="$DATA_DIR/ai-ml"
SERVICE_DIR="$ROOT_DIR/services/ai-ml"

BACKEND_PORT=18081
FRONTEND_PORT=3001
AI_PORT=18100

mkdir -p "$DATA_DIR"
mkdir -p "$AI_ML_WORKSPACE"

pick_port() {
  local candidate="$1"
  while ss -Hln | awk '{print $4}' | grep -qE ":${candidate}$"; do
    candidate=$((candidate + 1))
  done
  echo "$candidate"
}

BACKEND_PORT=$(pick_port "$BACKEND_PORT")
FRONTEND_PORT=$(pick_port "$FRONTEND_PORT")
AI_PORT=$(pick_port "$AI_PORT")

echo "[Platform Lite] Ports: backend=$BACKEND_PORT frontend=$FRONTEND_PORT ai=$AI_PORT"

wait_for_url() {
  local url="$1"
  local label="$2"
  local max_wait="${3:-30}"
  local waited=0
  echo "[Platform Lite] Waiting for $label at $url ..."
  while ! curl -fsS "$url" >/dev/null 2>&1; do
    sleep 1
    waited=$((waited + 1))
    if [ "$waited" -ge "$max_wait" ]; then
      echo "[Platform Lite] $label did not become ready within ${max_wait}s."
      return 1
    fi
  done
  echo "[Platform Lite] $label is healthy."
}

# AI/ML service
if ! curl -fsS "http://localhost:${AI_PORT}/health" >/dev/null 2>&1; then
  echo "[Platform Lite] Starting AI/ML service on port $AI_PORT ..."
  cd "$SERVICE_DIR"
  AI_ML_WORKSPACE="$AI_ML_WORKSPACE" "$SERVICE_DIR/.venv/bin/python" -m uvicorn main:app --host 0.0.0.0 --port "$AI_PORT" > "$ROOT_DIR/ai-ml-service.log" 2>&1 &
  AI_PID=$!
  wait_for_url "http://localhost:${AI_PORT}/health" "AI/ML service" 60 || true
else
  echo "[Platform Lite] AI/ML service already running."
fi

# Backend
if ! curl -fsS "http://localhost:${BACKEND_PORT}/api/dashboard/health" >/dev/null 2>&1; then
  echo "[Platform Lite] Starting Spring Boot backend on port $BACKEND_PORT ..."
  cd "$BACKEND_DIR"
  SERVER_PORT="$BACKEND_PORT" \
    APP_DATA_HOME="$DATA_DIR" \
    APP_CORS_ALLOWED_ORIGINS="http://localhost:${FRONTEND_PORT},http://127.0.0.1:${FRONTEND_PORT}" \
    APP_AI_ML_BASE_URL="http://127.0.0.1:${AI_PORT}" \
    "$BACKEND_DIR/mvnw" spring-boot:run > "$ROOT_DIR/backend-service.log" 2>&1 &
  BACKEND_PID=$!
  wait_for_url "http://localhost:${BACKEND_PORT}/api/dashboard/health" "Spring Boot backend" 120 || true
else
  echo "[Platform Lite] Spring Boot backend already running."
fi

# Frontend
echo "[Platform Lite] Starting Next.js frontend on http://localhost:${FRONTEND_PORT} ..."
cd "$ROOT_DIR"
NEXT_PUBLIC_API_BASE_URL="http://localhost:${BACKEND_PORT}/api" \
  PORT="$FRONTEND_PORT" \
  npm run start -- --port "$FRONTEND_PORT" > "$ROOT_DIR/frontend-service.log" 2>&1 &
FRONTEND_PID=$!
wait_for_url "http://localhost:${FRONTEND_PORT}/login" "Next.js frontend" 60 || true

echo "[Platform Lite] All services started."
echo "  Frontend: http://localhost:${FRONTEND_PORT}"
echo "  Backend:  http://localhost:${BACKEND_PORT}/api"
echo "  AI/ML:    http://localhost:${AI_PORT}"

# Keep script alive if sourced, otherwise background processes stay alive because not disowned
wait
