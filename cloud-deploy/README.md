# 云服务器直接部署说明

## 部署架构

- **前端 (Next.js)**: 监听 `0.0.0.0:3000`，通过 Next.js rewrites 把 `/api/*` 转发到后端
- **后端 (Spring Boot)**: 监听 `127.0.0.1:18081`
- **AI/ML Python 服务**: 暂不启动，以节省内存；需要时手动运行

## 访问地址

- 公网：`http://118.31.164.41:3000`
- Tailscale：`http://100.94.241.101:3000`

## 性能优化

- JVM: 堆内存 128m-256m，元空间 64m，G1 垃圾回收器
- Node: 旧生代限制 256MB，`--optimize-for-size`
- 不运行 AI/ML Python 服务，仅保留前后端
- 前端为静态生产构建，后端为可执行 jar

## 启动/停止

```bash
# 后端
nohup bash /opt/wheelhub/scripts/start-backend.sh > /opt/wheelhub/logs/backend.log 2>&1 &

# 前端
nohup bash /opt/wheelhub/scripts/start-frontend.sh > /opt/wheelhub/logs/frontend.log 2>&1 &
```

或使用 systemd 服务（推荐）：

```bash
sudo systemctl enable wheelhub-backend wheelhub-frontend
sudo systemctl start wheelhub-backend wheelhub-frontend
```

## 日志

- 后端：`/opt/wheelhub/logs/backend.log`
- 前端：`/opt/wheelhub/logs/frontend.log`
