#!/bin/bash
set -e

# 本地运行 Spring Boot 后端（供 frp/Tailscale 转发到云端）

export SERVER_PORT=18081
export APP_DATA_HOME="./backend/data"
export APP_CORS_ALLOWED_ORIGINS="http://localhost:3001,http://118.31.164.41:8081,http://100.94.241.101:8081"
export APP_AI_ML_BASE_URL="http://127.0.0.1:18100"
export APP_SECURITY_SECRET="wheel-hub-platform-secret"
export APP_DEMO_ENABLED="true"
export APP_AUTH_SESSION_HOURS="12"
export TZ=Asia/Shanghai

mkdir -p "$APP_DATA_HOME"

cd backend
JAR_PATH="$(find target -maxdepth 1 -name '*.jar' ! -name '*original*.jar' | head -n 1)"

if [ -z "$JAR_PATH" ]; then
  echo "Backend jar not found. Building with Maven wrapper ..."
  chmod +x ./mvnw
  ./mvnw -q -DskipTests package
  JAR_PATH="$(find target -maxdepth 1 -name '*.jar' ! -name '*original*.jar' | head -n 1)"
fi

if [ -z "$JAR_PATH" ]; then
  echo "Unable to locate a runnable backend jar under backend/target." >&2
  exit 1
fi

exec java \
  -Xms128m \
  -Xmx512m \
  -XX:MaxMetaspaceSize=128m \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 \
  -XX:+UseStringDeduplication \
  -jar "$JAR_PATH"
