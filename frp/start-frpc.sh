#!/bin/bash
set -e

# 与 /home/jarvis/Projects/DEPLOY_WITH_FRP.md 一致：
# 依赖共享的 ai-website-frp-tunnel.service（本地 7000 -> 云端 7000）
# 本服务只负责把本地 3001/18081 通过 frp TCP 映射到云端。

UNIT="wheelhub-frpc.service"
SERVICE_DIR="$HOME/.config/systemd/user"

mkdir -p "$SERVICE_DIR"
cp "$(dirname "$0")/wheelhub-frpc.service" "$SERVICE_DIR/$UNIT"

systemctl --user daemon-reload
systemctl --user enable "$UNIT"
systemctl --user restart "$UNIT"
sleep 2
systemctl --user status "$UNIT" --no-pager
