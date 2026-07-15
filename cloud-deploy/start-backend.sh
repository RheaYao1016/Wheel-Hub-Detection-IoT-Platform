#!/bin/bash
set -e

# 低资源 Spring Boot 启动脚本
# 内存限制：堆 256MB，元空间 64MB

export SERVER_PORT=18081
export APP_DATA_HOME=/opt/wheelhub/data
export APP_CORS_ALLOWED_ORIGINS="http://118.31.164.41:3000,http://100.94.241.101:3000"
export APP_AI_ML_BASE_URL="http://127.0.0.1:18100"
export APP_SECURITY_SECRET="wheel-hub-platform-secret"
export APP_DEMO_ENABLED="true"
export APP_AUTH_SESSION_HOURS="12"
export TZ=Asia/Shanghai

mkdir -p "$APP_DATA_HOME"

cd /opt/wheelhub/backend
exec /usr/local/bin/wheelhub-java \
  -Xms96m \
  -Xmx192m \
  -XX:MaxMetaspaceSize=64m \
  -XX:+UseG1GC \
  -XX:MaxGCPauseMillis=200 \
  -XX:+UseStringDeduplication \
  -jar backend-0.0.1-SNAPSHOT.jar
