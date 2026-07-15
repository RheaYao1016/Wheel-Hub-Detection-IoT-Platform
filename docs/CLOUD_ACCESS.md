# 通过 frp + Caddy 子目录访问云端部署指南

> 本项目的公网部署严格遵循 `/home/jarvis/Projects/DEPLOY_WITH_FRP.md` 的规范：
> - 使用 **frp TCP 代理** + 云端 **Caddy** 路径反代。
> - 不使用 frps HTTP 模式占用 8080。
> - 本地 `frpc` 通过共享 SSH 隧道 `local:7000 -> cloud:7000` 连接到 frps。

## 架构概览

```
公网用户
    │
    ├─ 公网 ──► 118.31.164.41:8080/wheelhub/*
    └─ Tailscale ──► 100.94.241.101:8080/wheelhub/*
                │
                ▼
        云服务器：Caddy（监听 0.0.0.0:8080）
                │
                ├── /wheelhub/_next/static、/images、/draco ──► /opt/wheelhub-static（本地静态文件）
                ├── /wheelhub/api/* ──► localhost:18081（frp TCP → 本机后端）
                ├── /wheelhub/* ──────► localhost:3001（frp TCP → 本机前端）
                └── 其他路径 ─────────► localhost:8081（frps HTTP，供其他项目复用）
                │
                ▼
        云服务器：frps (bindPort=7000, proxyBindAddr=127.0.0.1, vhostHTTPPort=8081)
                │
                ▼
        本机：frpc（通过 ai-website-frp-tunnel.service 的 SSH 隧道连接 127.0.0.1:7000）
                │
                ├──► 127.0.0.1:3001  Next.js 前端
                └──► 127.0.0.1:18081 Spring Boot 后端
```

与普通项目不同，WheelHub 有独立的前端和后端，因此建立了两条 TCP 隧道：

| 代理名 | 本地端口 | 云端端口 | 用途 |
|--------|---------|---------|------|
| `wheelhub-frontend-tcp` | 3001 | 3001 | Next.js 前端 |
| `wheelhub-api-tcp` | 18081 | 18081 | Spring Boot 后端 API |

## 当前访问地址

| 方式 | URL |
|------|-----|
| 公网 | `http://118.31.164.41:8080/wheelhub/` |
| Tailscale | `http://100.94.241.101:8080/wheelhub/` |

> 公网访问前，需要在阿里云控制台的安全组中放行 **TCP 8080** 端口。

## 本地启动（接入云端）

### 1. 启动后端与 AI/ML

```bash
# AI/ML
cd services/ai-ml
AI_ML_WORKSPACE=./backend/data/ai-ml .venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 18100

# Spring Boot
cd backend
SERVER_PORT=18081 APP_DATA_HOME=./backend/data \
  APP_CORS_ALLOWED_ORIGINS="http://localhost:3001" \
  APP_AI_ML_BASE_URL=http://127.0.0.1:18100 \
  ./mvnw spring-boot:run
```

### 2. 启动前端（子目录模式）

```bash
./start-platform-cloud.sh
```

该脚本会：
1. 切换 `next.config.js` 到 `basePath: '/wheelhub'`
2. 构建生产包
3. 启动 Next.js 于 `0.0.0.0:3001`

### 3. 启动 frpc 隧道

```bash
./frp/start-frpc.sh
```

该脚本会把 `frp/wheelhub-frpc.service` 安装为本机 systemd 用户服务并启动。

前置依赖：
- 已存在共享 SSH 隧道 `ai-website-frp-tunnel.service`（把本地 7000 转发到云端 7000）。
- 如果该服务不存在，参考 `/home/jarvis/Projects/DEPLOY_WITH_FRP.md` 创建，或在 `~/.config/systemd/user/` 下新建一个类似服务。

查看状态：

```bash
systemctl --user status wheelhub-frpc.service
systemctl --user status ai-website-frp-tunnel.service
```

### 4. 访问

```text
http://118.31.164.41:8080/wheelhub/
```

## 切换回本地模式

如果需要在本地直接访问（不使用子目录）：

```bash
./start-platform-local.sh
```

该脚本会切换 `next.config.js` 到 `basePath: ''` 并重新构建。

## 云端 Caddy 配置

云端 Caddy 统一入口在 `/opt/caddy/Caddyfile`。WheelHub 相关片段：

```caddy
:8080 {
    log {
        output discard
    }

    # 根路径直接跳到登录页，避免 Next.js 与 Caddy 的斜杠来回跳转导致空白
    @wheelhubRoot path /wheelhub /wheelhub/
    redir @wheelhubRoot /wheelhub/login 308

    handle_path /wheelhub/_next/static/* {
        root * /opt/wheelhub-static/_next/static
        file_server { precompressed gzip }
        header -Server
    }

    handle_path /wheelhub/images/* {
        root * /opt/wheelhub-static/images
        file_server { precompressed gzip }
        header -Server
    }

    handle_path /wheelhub/draco/* {
        root * /opt/wheelhub-static/draco
        file_server { precompressed gzip }
        header -Server
    }

    handle /wheelhub/api/* {
        uri strip_prefix /wheelhub
        reverse_proxy localhost:18081
        header -Server
    }

    handle /wheelhub/* {
        reverse_proxy localhost:3001
        header -Server
    }
}
```

其中静态资源由云端本地磁盘直接提供，其余动态请求通过 frp TCP 隧道回到本机。

## 更新云端静态资源

每次重新构建前端后，需要把新的静态资源同步到云服务器：

```bash
rm -rf /tmp/wheelhub-static
mkdir -p /tmp/wheelhub-static/_next
cp -r .next/static /tmp/wheelhub-static/_next/static
cp -r public/images /tmp/wheelhub-static/images
cp -r public/draco /tmp/wheelhub-static/draco
cd /tmp && tar czf wheelhub-static.tar.gz wheelhub-static

scp /tmp/wheelhub-static.tar.gz root@118.31.164.41:/opt/
ssh root@118.31.164.41 "cd /opt && rm -rf wheelhub-static && tar xzf wheelhub-static.tar.gz && rm wheelhub-static.tar.gz"

# 可选：重新预压缩以启用 gzip 传输
ssh root@118.31.164.41 "cd /opt/wheelhub-static && find . -type f ! -name '*.gz' ! -name '*.br' -exec gzip -k -9 {} \;"
```

## 云端性能优化（已完成）

针对 1.6 GB 内存的阿里云 ECS，已做以下深度优化：

1. **磁盘清理**：删除云端废弃的 `/opt/wheelhub`、`/opt/frp-wheelhub`，清空 apt 缓存、旧日志，释放约 2.7 GB 空间。
2. **停用非必要服务**：移除 Docker snap，停用 ModemManager、multipathd、udisks2、tuned、unattended-upgrades、networkd-dispatcher，释放约 200 MB 内存。
3. **系统参数调优**：新增 `/etc/sysctl.d/99-wheelhub-tuning.conf`，调整 vfs_cache_pressure、dirty_ratio、overcommit、keepalive、file-max 等参数。
4. **日志与资源限制**：
   - 新增 `/etc/logrotate.d/wheelhub`，限制 frps / Caddy 日志大小。
   - systemd journal 最大 50 MB。
   - frps / Caddy 限制内存上限 128 MB、禁止 swap、限制文件句柄。
5. **静态资源预压缩**：对 `/opt/wheelhub-static` 下文件生成 `.gz`，Caddy 直接提供 gzip 版本，减少 60% 以上静态传输量。
6. **frps 安全加固**：`proxyBindAddr = "127.0.0.1"`，所有 frp TCP 端口只监听服务器本地，外网无法直接访问。

优化后云端内存占用从约 600 MB 降至约 420 MB，剩余可用内存约 1.2 GB。

## 管理与排错

### 本地排查

```bash
# 查看 frpc 状态
systemctl --user status wheelhub-frpc.service

# 重启 frpc
systemctl --user restart wheelhub-frpc.service

# 查看日志
journalctl --user -u wheelhub-frpc.service -f
```

### 云端排查

```bash
ssh root@118.31.164.41

# 查看 frps / Caddy
systemctl status frps.service
systemctl status caddy-wheelhub.service

# 查看端口监听
ss -tlnp | grep -E '8080|8081|3001|18081|7000'

# 查看日志
journalctl -u frps.service -f
journalctl -u caddy-wheelhub.service -f
```

### 常见现象

| 现象 | 原因 | 处理 |
|------|------|------|
| 公网访问 404 | Caddy 未配置该路径 | 检查 `/opt/caddy/Caddyfile` 并 `systemctl reload caddy-wheelhub.service` |
| 公网访问空内容 / 连接失败 | 本地 frpc 未启动或云端 TCP 端口未监听 | 检查 `systemctl --user status wheelhub-frpc.service` 和 `ss -tlnp \| grep 3001` |
| 访问 `/wheelhub/` 一片空白 | Next.js 与 Caddy 的斜杠重定向循环 | 确认 Caddyfile 中有 `@wheelhubRoot` 跳转到 `/wheelhub/login` |
| frpc 日志提示 `proxy [xxx] already exists` | 存在旧 frpc 进程占用端口 | `pkill -9 -f 'Wheel-Hub-Detection-IoT-Platform/frp/frpc'` 后重启服务 |
| 静态资源报 404 | `/opt/wheelhub-static` 未同步 | 重新执行“更新云端静态资源”步骤 |

## 不干扰其他项目的说明

- 未修改 `/opt/frp` 中的 frps 二进制文件。
- frp 隧道使用独立的代理名 `wheelhub-frontend-tcp` / `wheelhub-api-tcp`，与现有 `hnc-*`、`ai-website` 等代理共存。
- Caddy 监听 **8080**；frps 的 `vhostHTTPPort` 调整为 **8081**，Caddy 会把非 `/wheelhub/*` 的请求继续转发给 frps，保证服务器上其他项目不受影响。
- 所有 frp TCP 端口只绑定 **127.0.0.1**，外网无法直接访问，安全组只需放行 8080。
