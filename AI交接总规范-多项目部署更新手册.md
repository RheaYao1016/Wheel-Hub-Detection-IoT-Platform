# AI交接总规范：多项目部署、更新、转发与端口登记手册

本文件面向后续接手本仓库的 AI、自动化工具和运维人员。目标是让任何新接手者一次性看懂：

- 这个项目现在如何运行
- 以后如何更新和发布
- 阿里云与 Ubuntu 的职责如何划分
- 多项目共存时如何避免端口、路径、服务名、数据库冲突
- 如何通过阿里云映射端口连接不同 Ubuntu 主机
- 当前项目已经占用了哪些端口，后续不要重复

---

## 1. 总体原则

本项目长期推荐采用以下职责划分：

- 阿里云服务器：只做公网入口、反向代理、frps、中转、统一域名或统一 IP 入口
- Ubuntu 业务机：运行真实业务服务，包括 Java 后端、AI 后端、数据库、缓存、消息队列、MQTT、前端静态资源
- 开发机：只负责开发、调试、构建、上传和远程运维

不要把阿里云服务器当成主要业务宿主机。最佳实践是：

- 业务与数据尽量留在 Ubuntu
- 阿里云只暴露公网入口
- 外部访问统一走阿里云
- 内部真实服务统一落在 Ubuntu

这样做的优点：

- 迁移简单
- 多项目更容易统一管理
- 业务机和公网入口分层清晰
- 出问题时更容易排查

---

## 2. 当前项目的真实运行架构

当前项目严格遵循 `FRP TCP + Caddy 路径反代` 模式。

链路如下：

```text
浏览器 / 开发机
    ->
阿里云公网入口 http://118.31.164.41:8080/smart/
    ->
Caddy 反代 /smart/* -> 127.0.0.1:18011
    ->
frps 接收 remotePort=18011
    ->
frpc 转发到 Ubuntu 127.0.0.1:8020
    ->
Spring Boot 后端 + 前端静态页面
```

当前项目关键事实：

- Ubuntu 本地后端监听：`127.0.0.1:8020`
- Spring Boot context-path：`/smart`
- 阿里云 Caddy 对外入口：`http://118.31.164.41:8080/smart/`
- frpc 远端映射端口：`18011`
- 不使用 frps 的 HTTP 模式占用 `8080`
- `8080` 由阿里云上的 Caddy 统一占用

当前本地 Docker 联调模式也已可用，入口如下：

- 本地前后端入口：`http://127.0.0.1:18080/smart/`
- 本地 AI 健康检查：`http://127.0.0.1:15050/health`

---

## 3. 本项目更新发布时必须遵守的规则

以后更新本项目时，默认遵守以下规则：

1. 不直接改公网入口结构，优先保持 `/smart/` 不变。
2. 不随意改 Ubuntu 本地后端端口 `8020`，除非同步修改 `frpc`、Caddy、健康检查脚本。
3. 不随意改 `server.servlet.context-path=/smart`，否则前端资源路径、Axios 路径、公开链接、上传访问路径都会受到影响。
4. 不在阿里云上直接部署业务逻辑，阿里云只做入口和转发。
5. 新增功能优先在 Ubuntu 本地验证，再通过阿里云入口回归测试。
6. 新增公开路径时，要同步检查拦截器排除规则、SPA fallback、前端硬编码路径。
7. 不要将数据库直接暴露到公网供外部随意访问，推荐只暴露业务 API。

---

## 4. 标准更新流程

### 4.1 更新前检查

进入项目目录后先检查：

```bash
git status
git branch
./status.sh
```

如果是 Docker 本地联调模式，检查：

```bash
docker compose ps
docker compose logs --tail=100 app ai-backend
```

### 4.2 先确认本地代码已经推送到 Ubuntu

在任何启动、重启、发布动作之前，必须先确认“准备运行的代码”已经在 Ubuntu 上。

默认检查逻辑：

1. 先确认本地工作区是否有最新修改。
2. 再确认这些修改是否已经同步到 Ubuntu 项目目录。
3. 只有确认远端代码已更新后，才能执行构建、重启、发布。

推荐本地检查：

```bash
git status --short
```

推荐远端检查：

```bash
ssh aliyun-ubuntu-main
cd /srv/projects/smart-agriculture
git status --short
```

如果远端还没有最新代码，必须先推送或同步。推荐方式：

- `git pull`：适用于远端仓库直接拉取代码
- `rsync`：适用于本地未提交改动、需要原样同步到 Ubuntu
- `scp`：适用于只上传少量构建产物或配置文件

推荐 `rsync` 示例：

```bash
rsync -avz -e "ssh -p 2222" ./ <ubuntu_user>@118.31.164.41:/srv/projects/smart-agriculture/
```

只有在“远端代码已是最新”这个前提成立后，才进入下一步构建和启动。

### 4.3 代码更新

如果是 Git 拉取更新：

```bash
git pull
```

如果是开发机上传新代码到 Ubuntu：

- 推荐上传到固定项目目录
- 上传前先备份旧版本
- 保留 `config/`、`data/`、`files/` 等运行时目录

### 4.4 构建

Java 后端构建：

```bash
./mvnw package -DskipTests -q
```

前端构建：

```bash
cd admin-platform/frontend
npm install
npm run build
cd ../..
```

### 4.5 启动或重启

当前 Ubuntu 非 Docker 运行模式：

```bash
./restart.sh
./status.sh
```

如果使用 systemd：

```bash
systemctl --user restart smart-agriculture-backend smart-agriculture-frpc
systemctl --user status smart-agriculture-backend smart-agriculture-frpc --no-pager
```

如果使用本地 Docker 全功能模式：

```bash
./docker-local.sh
docker compose ps
```

### 4.6 发布后验证

本地 Ubuntu 验证：

```bash
curl http://127.0.0.1:8020/smart/health
```

公网验证：

```bash
curl http://118.31.164.41:8080/smart/health
```

页面验证：

- 打开 `http://118.31.164.41:8080/smart/`
- 检查首页能否加载
- 检查登录
- 检查核心 API
- 检查文件访问
- 检查 AI 相关页面

---

## 5. 多项目部署统一规范

如果以后同一套阿里云入口和多台 Ubuntu 主机上要跑多个项目，必须统一做“命名、端口、路径、服务名、数据库名”的隔离。

### 5.1 每个项目必须独立的内容

每个新项目都必须有唯一的：

- 项目标识，例如 `smart-agriculture`
- 公网路径前缀，例如 `/smart`
- Ubuntu 本地服务端口，例如 `8020`
- frp remotePort，例如 `18011`
- Docker compose project name
- systemd 服务名
- 数据库名
- 数据目录
- 日志目录

### 5.2 推荐命名规则

建议所有项目统一遵守：

```text
项目代号: smart-agriculture
公网路径: /smart
本地应用端口: 8020
FRP远端端口: 18011
systemd服务名:
  smart-agriculture-backend
  smart-agriculture-frpc
数据库名:
  smart_agriculture
运行目录:
  /srv/projects/smart-agriculture
日志目录:
  /srv/projects/smart-agriculture/data/logs
```

### 5.3 多项目冲突规避规则

不要重复使用以下项目级资源：

- Spring Boot 本地端口
- AI 服务端口
- MySQL 对外映射端口
- Redis 对外映射端口
- RabbitMQ 管理台端口
- MQTT 端口
- frp remotePort
- Caddy 的路径前缀
- Docker volume 名称
- systemd 服务名
- 数据库名

### 5.4 推荐端口规划策略

建议统一按项目编号分段，便于长期扩展。

示例：

| 项目编号 | Java端口 | AI端口 | frp远端端口 | 公开路径 |
|---|---:|---:|---:|---|
| P01 | 8020 | 5050 | 18011 | `/smart` |
| P02 | 8030 | 5060 | 18021 | `/edu` |
| P03 | 8040 | 5070 | 18031 | `/crm` |

如果未来项目增多，建议继续按固定步长递增，避免临时拍脑袋分配。

---

## 6. 阿里云与多 Ubuntu 主机连接规范

如果阿里云充当统一 SSH 中转入口，而多台 Ubuntu 主机通过阿里云映射出来，建议固定如下使用方式：

- `2222`：主 Ubuntu 服务器
- `3333`：第二台 Ubuntu 服务器
- `4444`：第三台 Ubuntu 服务器
- 后续新增机器继续使用统一规则，例如 `5555`、`6666`

### 6.1 直接 SSH 连接示例

主 Ubuntu：

```bash
ssh -p 2222 <ubuntu_user>@118.31.164.41
```

第二台 Ubuntu：

```bash
ssh -p 3333 <ubuntu_user>@118.31.164.41
```

第三台 Ubuntu：

```bash
ssh -p 4444 <ubuntu_user>@118.31.164.41
```

### 6.2 SCP 上传示例

上传到主 Ubuntu：

```bash
scp -P 2222 local-file.zip <ubuntu_user>@118.31.164.41:/srv/projects/
```

上传到第二台 Ubuntu：

```bash
scp -P 3333 local-file.zip <ubuntu_user>@118.31.164.41:/srv/projects/
```

### 6.3 rsync 同步示例

```bash
rsync -avz -e "ssh -p 2222" ./ <ubuntu_user>@118.31.164.41:/srv/projects/smart-agriculture/
```

### 6.4 推荐 SSH 配置

建议在开发机的 `~/.ssh/config` 中加入：

```sshconfig
Host aliyun-ubuntu-main
  HostName 118.31.164.41
  Port 2222
  User <ubuntu_user>

Host aliyun-ubuntu-2
  HostName 118.31.164.41
  Port 3333
  User <ubuntu_user>

Host aliyun-ubuntu-3
  HostName 118.31.164.41
  Port 4444
  User <ubuntu_user>
```

以后连接就可以直接使用：

```bash
ssh aliyun-ubuntu-main
ssh aliyun-ubuntu-2
ssh aliyun-ubuntu-3
```

### 6.5 重要说明

如果 `2222`、`3333`、`4444` 是阿里云转发端口，而不是 Ubuntu 真正的 SSH 监听端口，那么：

- 外部只能连阿里云 IP
- 端口区分的是“转发到哪一台 Ubuntu”
- Ubuntu 内部默认 SSH 仍可能是 `22`

因此排障时要区分：

- 阿里云入口端口
- Ubuntu 真正 SSH 端口
- frp 或 NAT 转发是否生效

---

## 7. 新项目接入这套体系的标准步骤

以后任何新项目接入时，按这个顺序执行。

### 7.1 先做资源登记

先登记以下内容，未登记前不要上线：

- 项目标识
- Ubuntu 主机
- 公网路径前缀
- 本地应用端口
- AI 端口
- frp remotePort
- 数据库名
- Redis 是否独占
- RabbitMQ 是否独占
- MQTT 是否独占

### 7.2 分配公网访问策略

推荐优先使用“同 IP + 不同路径前缀”：

- `/smart`
- `/edu`
- `/crm`

这样最省端口，也最适合 Caddy/Nginx 管理。

只有在以下情况才考虑单独端口或单独域名：

- WebSocket 或协议要求特殊
- 第三方回调必须独立域名
- 项目隔离要求更高

### 7.3 分配 frp 远端端口

每个项目必须独占一个 remotePort，例如：

- `smart-agriculture -> 18011`
- `smart-edu -> 18021`
- `crm -> 18031`

不要复用同一个 remotePort。

### 7.4 修改阿里云 Caddy

为每个项目新增唯一路径规则，例如：

```caddy
handle_path /smart/* {
    reverse_proxy 127.0.0.1:18011
}

handle_path /edu/* {
    reverse_proxy 127.0.0.1:18021
}
```

### 7.5 修改 Ubuntu frpc

每个项目一个独立代理段，例如：

```toml
[[proxies]]
name = "smart-agriculture-tcp"
type = "tcp"
localIP = "127.0.0.1"
localPort = 8020
remotePort = 18011
```

### 7.6 修改项目自身路径配置

项目必须统一以下内容：

- 前端 `publicPath`
- 前端 API `baseURL`
- 后端 `server.servlet.context-path`
- 公开文件访问路径
- 登录回调路径
- WebSocket 路径

如果这些不一致，就会出现前端能打开但接口 404、静态资源 404、登录失败、上传失败等问题。

---

## 8. Docker 模式与 Ubuntu 常驻模式的关系

本项目目前存在两种有效运行方式。

### 8.1 Ubuntu 常驻运行模式

适合正式长期运行：

- Java 后端在 Ubuntu 直接跑
- 前端构建后由 Spring Boot 提供
- frpc 常驻
- 阿里云 Caddy 做统一入口

这个模式是当前推荐正式架构。

### 8.2 Docker 本地全功能模式

适合开发机联调和本地验证：

- Java 后端容器
- AI 后端容器
- MySQL 容器
- Redis 容器
- RabbitMQ 容器
- Mosquitto 容器

启动命令：

```bash
./docker-local.sh
```

常用命令：

```bash
docker compose ps
docker compose logs -f app ai-backend
docker compose down
```

不要把“开发机 Docker 端口”误当成“Ubuntu 正式端口”。

---

## 9. 故障排查顺序

任何“页面打不开、接口超时、阿里云能访问但 Ubuntu 本地正常”的问题，按以下顺序排查。

1. Ubuntu 本地服务是否正常
2. Ubuntu 本地健康检查是否正常
3. frpc 是否正常在线
4. 阿里云 frps 是否收到连接
5. 阿里云 Caddy 配置是否指向正确的 remotePort
6. 公网路径前缀是否写对
7. 前端 `publicPath` 和 `baseURL` 是否与 context-path 一致
8. 是否误把本地 Docker 端口当成正式环境端口

推荐检查命令：

```bash
curl http://127.0.0.1:8020/smart/health
curl http://118.31.164.41:8080/smart/health
systemctl --user status smart-agriculture-backend smart-agriculture-frpc --no-pager
docker compose ps
```

---

## 10. 当前项目专属信息

以下内容是当前仓库已经确认的真实配置，后续不要重复占用。

### 10.1 当前项目标识

- 项目名：`smart-agriculture`
- 前端路径前缀：`/smart`
- Spring 应用名：`smart-agriculture`

### 10.2 Ubuntu 正式运行端口

| 类型 | 值 | 说明 |
|---|---:|---|
| Java 本地监听端口 | `8020` | Ubuntu 本地 Spring Boot |
| Spring context-path | `/smart` | 对外路径前缀 |
| frp remotePort | `18011` | 阿里云接入后转回 Ubuntu |
| 公网入口 | `118.31.164.41:8080` | Caddy 统一入口 |

### 10.3 本地 Docker 联调端口

| 类型 | 值 | 说明 |
|---|---:|---|
| Web 入口 | `18080` | 本地 Docker 访问入口 |
| AI 服务 | `15050` | 本地 Docker AI 后端 |
| MySQL | `3306` | 本地 Docker MySQL |
| Redis | `6379` | 本地 Docker Redis |
| RabbitMQ AMQP | `5672` | 本地 Docker RabbitMQ |
| RabbitMQ 管理台 | `15672` | RabbitMQ Web UI |
| MQTT TCP | `1883` | Mosquitto |
| MQTT WebSocket | `8083` | Mosquitto WS |

### 10.4 当前数据库与中间件

- MySQL 数据库名：`smart_agriculture`
- Redis：当前 Docker 模式占用 `6379`
- RabbitMQ：当前 Docker 模式占用 `5672` 和 `15672`
- Mosquitto：当前 Docker 模式占用 `1883` 和 `8083`

### 10.5 当前阿里云 SSH 转发约定

| 阿里云入口端口 | 目标机器 | 用途 |
|---|---|---|
| `2222` | 主 Ubuntu | 默认业务主机 |
| `3333` | 第二台 Ubuntu | 第二业务主机 |
| `4444` | 第三台 Ubuntu | 第三业务主机 |

如果未来新增机器，继续顺延登记，不要临时占用未记录端口。

---

## 11. 项目端口与资源登记模板

以后每新增一个项目，都要先补这张表。

| 项目名 | Ubuntu主机 | 公网路径 | Java端口 | AI端口 | frp远端端口 | DB名 | Redis端口 | RabbitMQ端口 | MQTT端口 | 备注 |
|---|---|---|---:|---:|---:|---|---:|---|---|---|
| smart-agriculture | Ubuntu-1 | `/smart` | `8020` | `5050` | `18011` | `smart_agriculture` | `6379` | `5672/15672` | `1883/8083` | 已使用 |
| smart-edu | 待分配 | `/edu` | 待分配 | 待分配 | 待分配 | 待分配 | 待分配 | 待分配 | 待分配 | 预留 |
| project-3 | 待分配 | `/xxx` | 待分配 | 待分配 | 待分配 | 待分配 | 待分配 | 待分配 | 待分配 | 预留 |

---

## 12. AI 接手时的最短行动指南

如果未来是 AI 接手本项目，默认执行顺序如下：

1. 先读本文件。
2. 再读 `AGENTS.md`。
3. 确认当前是“Ubuntu 常驻模式”还是“本地 Docker 模式”。
4. 检查端口和路径是否与本文件一致。
5. 更新代码前先备份配置和运行数据。
6. 构建后先做本地健康检查，再做阿里云入口健康检查。
7. 如需新增项目，先登记端口、路径和 remotePort，再写配置。
8. 任何情况下都不要让两个项目共用同一组关键端口和同一路径前缀。

---

## 13. 必须长期维护的事实清单

后续每次变更都要同步更新本文件，尤其是以下内容：

- 阿里云公网 IP 是否变化
- SSH 转发端口 `2222/3333/4444` 是否变化
- 当前项目的公网路径是否变化
- 当前项目的 `frp remotePort` 是否变化
- Ubuntu 本地 Java 端口是否变化
- Docker 联调端口是否变化
- 数据库名、中间件端口是否变化
- 新增项目的端口占用登记

如果配置变了但本文件没更新，后续 AI 大概率会接手出错。
