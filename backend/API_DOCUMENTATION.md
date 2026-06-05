# Industrial-Surface-Defect-Detection-System - API 文档

## 概述

本文档介绍 Industrial-Surface-Defect-Detection-System（工业表面缺陷智能检测系统）的后端 REST API。所有 API 基于 OpenAPI 3.0 规范，提供自动化的在线文档和交互式测试。

## Swagger/OpenAPI 文档访问

启动后端服务后，通过以下地址访问 API 文档：

| 资源 | URL |
|------|-----|
| **Swagger UI**（交互式文档） | `http://localhost:18081/swagger-ui.html` |
| **OpenAPI JSON**（机器可读规范） | `http://localhost:18081/v3/api-docs` |
| **OpenAPI YAML** | `http://localhost:18081/v3/api-docs.yaml` |

## 快速开始

### 1. 启动后端服务

```bash
# 方式一：使用 Maven
cd backend
mvn spring-boot:run

# 方式二：打包后运行
cd backend
mvn clean package -DskipTests
java -jar target/backend-0.0.1-SNAPSHOT.jar

# 方式三：使用启动脚本
start-backend.bat    # Windows
```

### 2. 访问 Swagger UI

打开浏览器访问: `http://localhost:18081/swagger-ui.html`

### 3. 认证

大多数 API 端点需要 Bearer Token 认证。认证流程：

1. 在 Swagger UI 页面右上角点击 **"Authorize"** 按钮（锁形图标）
2. 输入你的 Token（无需 `Bearer ` 前缀，系统会自动添加）
3. 点击 **"Authorize"** 完成认证
4. 后续所有请求将自动携带该 Token

**获取 Token 方式：**

```bash
# 先通过登录接口获取 Token
curl -X POST http://localhost:18081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password","role":"admin"}'

# 响应中包含 token 字段，复制该 token 值
```

## API 分组

平台 API 按功能模块分为以下组：

| 分组名称 | 基础路径 | 描述 |
|----------|---------|------|
| **Authentication** | `/api/auth` | 用户认证与授权（登录、注册、会话、注销） |
| **Admin Management** | `/api/admin` | 系统管理（告警管理、数据导入） |
| **Dashboard** | `/api/dashboard` | 仪表盘数据（指挥中心、数字孪生、监控面板） |
| **Enterprise Platform** | `/api` | 企业级功能（AI、数据源、标注、训练） |
| **Data Export** | `/api/export` | 数据导出（CSV/TSV） |
| **Audit Logs** | `/api/audit` | 审计日志查询 |
| **WebSocket** | `/api/ws` | WebSocket 连接统计 |
| **Platform Health** | `/api` | 平台健康检查 |

## 详细 API 端点

### Authentication (`/api/auth`)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| POST | `/api/auth/login` | 用户登录，获取 Bearer Token | 否 |
| POST | `/api/auth/register` | 注册新用户 | 否 |
| GET | `/api/auth/session` | 查询当前会话信息 | 是 |
| POST | `/api/auth/logout` | 注销当前会话 | 是 |

### Admin Management (`/api/admin`)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/admin/alerts` | 查询告警记录 | 是 |
| PATCH | `/api/admin/alerts/{id}` | 更新告警状态 | 是 |
| GET | `/api/admin/imports` | 查询导入记录（分页） | 是 |
| POST | `/api/admin/imports` | 创建导入任务 | 是 |
| PATCH | `/api/admin/imports/{id}` | 更新导入状态 | 是 |
| DELETE | `/api/admin/imports/{id}` | 删除导入记录 | 是 |
| GET | `/api/admin/imports/{id}/log` | 下载导入日志 | 是 |

### Dashboard (`/api/dashboard`)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/dashboard/command-center` | 获取指挥中心数据 | 否 |
| GET | `/api/dashboard/digital-twin` | 获取数字孪生数据 | 否 |
| GET | `/api/dashboard/monitor` | 获取监控面板数据 | 否 |
| GET | `/api/dashboard/admin` | 获取管理面板数据 | 否 |
| POST | `/api/dashboard/sync` | 同步仪表盘数据 | 是 |
| GET | `/api/dashboard/health` | 仪表盘健康检查 | 否 |

### Enterprise Platform

#### AI 管理
| 方法 | 路径 | 描述 | 所需角色 |
|------|------|------|---------|
| GET | `/api/ai/providers` | 列出 AI 提供商 | 任意认证用户 |
| POST | `/api/ai/providers` | 创建 AI 提供商 | admin, engineer |
| POST | `/api/ai/providers/test` | 测试 AI 提供商 | admin, engineer |
| GET | `/api/ai/prompt-presets` | 列出提示词预设 | 任意认证用户 |
| GET | `/api/ai/assistant/settings` | 获取 AI 助手设置 | 任意认证用户 |
| POST | `/api/ai/assistant/settings` | 更新 AI 助手设置 | admin, engineer |
| GET | `/api/ai/indexes` | 列出 AI 索引目录 | 任意认证用户 |
| GET | `/api/ai/indexes/export` | 导出 AI 索引 (CSV) | 任意认证用户 |
| GET | `/api/ai/protocol/guide` | 获取 AI 协议指南 | 任意认证用户 |

#### AI 对话
| 方法 | 路径 | 描述 | 所需角色 |
|------|------|------|---------|
| GET | `/api/ai/chat/sessions` | 列出对话会话 | 任意认证用户 |
| GET | `/api/ai/chat/sessions/{sessionId}` | 获取对话消息 | 任意认证用户 |
| POST | `/api/ai/chat/sessions` | 创建对话会话 | 任意认证用户 |
| POST | `/api/ai/chat/sessions/{sessionId}/profile` | 更新会话配置 | 任意认证用户 |
| POST | `/api/ai/chat/sessions/{sessionId}/messages` | 发送对话消息 | 任意认证用户 |

#### 数据源
| 方法 | 路径 | 描述 | 所需角色 |
|------|------|------|---------|
| GET | `/api/data-sources` | 列出数据源 | 任意认证用户 |
| POST | `/api/data-sources` | 创建数据源 | admin, engineer |
| POST | `/api/data-sources/upload` | 上传数据文件 | admin, engineer, operator |

#### 分析任务
| 方法 | 路径 | 描述 | 所需角色 |
|------|------|------|---------|
| GET | `/api/analysis/jobs` | 列出分析任务 | admin, engineer, operator, viewer |
| POST | `/api/analysis/jobs` | 创建分析任务 | 任意认证用户 |
| GET | `/api/analysis/jobs/{jobId}` | 获取任务详情 | admin, engineer, operator, viewer |
| POST | `/api/analysis/jobs/{jobId}/reports` | 生成报告 | admin, engineer, operator |

#### 报告
| 方法 | 路径 | 描述 | 所需角色 |
|------|------|------|---------|
| GET | `/api/reports` | 列出报告 | admin, engineer, operator, viewer |
| GET | `/api/reports/{reportId}/download` | 下载报告 | admin, engineer, operator, viewer |

#### 标注项目
| 方法 | 路径 | 描述 | 所需角色 |
|------|------|------|---------|
| GET | `/api/annotation/projects` | 列出标注项目 | admin, engineer, operator |
| POST | `/api/annotation/projects` | 创建标注项目 | admin, engineer, operator |
| GET | `/api/annotation/projects/{projectId}/assets` | 列出标注资源 | admin, engineer, operator |
| POST | `/api/annotation/projects/{projectId}/assets` | 上传标注资源 | admin, engineer, operator |
| GET | `/api/annotation/projects/{projectId}/labels` | 列出标注标签 | admin, engineer, operator |
| POST | `/api/annotation/projects/{projectId}/labels` | 保存标注标签 | admin, engineer, operator |
| POST | `/api/annotation/projects/{projectId}/export-yolo` | 导出 YOLO 数据集 | admin, engineer, operator |
| GET | `/api/annotation/assets/{assetId}/content` | 获取资源内容 | admin, engineer, operator |

#### 模型训练
| 方法 | 路径 | 描述 | 所需角色 |
|------|------|------|---------|
| GET | `/api/training/jobs` | 列出训练任务 | admin, engineer, operator, viewer |
| POST | `/api/training/jobs` | 创建训练任务 | admin, engineer |
| POST | `/api/training/jobs/{jobId}/actions` | 控制训练任务 | admin, engineer |
| GET | `/api/model-ops/versions` | 列出模型版本 | admin, engineer, viewer |

### Data Export (`/api/export`)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/export/alerts` | 导出告警记录 (CSV/TSV) | 是 |
| GET | `/api/export/imports` | 导出导入记录 (CSV/TSV) | 是 |
| GET | `/api/export/wheels` | 导出轮毂检测数据 (CSV/TSV) | 是 |

### Audit Logs (`/api/audit`)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/audit/logs` | 查询审计日志（分页） | 是 |
| GET | `/api/audit/logs/recent` | 获取近期审计日志 | 是 |
| GET | `/api/audit/logs/count` | 获取日志总数 | 是 |

### WebSocket (`/api/ws`)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/ws/stats` | 获取 WebSocket 统计 | 是 |

### Platform Health (`/api`)

| 方法 | 路径 | 描述 | 认证 |
|------|------|------|------|
| GET | `/api/health` | 平台整体健康检查 | 否 |

## 请求示例

### 登录获取 Token

```bash
curl -X POST http://localhost:18081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123",
    "role": "admin"
  }'
```

**响应:**
```json
{
  "success": true,
  "username": "admin",
  "role": "admin",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "displayName": "系统管理员",
  "email": "admin@example.com",
  "department": "管理部",
  "expiresAt": "2024-12-31T23:59:59",
  "message": "登录成功"
}
```

### 查询告警记录

```bash
curl -X GET "http://localhost:18081/api/admin/alerts?level=critical&status=open" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 创建 AI 提供商

```bash
curl -X POST http://localhost:18081/api/ai/providers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "id": "openai-001",
    "name": "OpenAI GPT-4",
    "baseUrl": "https://api.openai.com",
    "apiKey": "sk-...",
    "chatModel": "gpt-4",
    "enabled": true
  }'
```

### 导出轮毂数据

```bash
curl -X GET "http://localhost:18081/api/export/wheels?format=csv" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -o wheel-data.csv
```

## 响应格式

### 标准成功响应

```json
{
  "status": "success",
  "message": "操作成功描述",
  "requestId": "uuid-string",
  "data": { ... }
}
```

### 标准错误响应

```json
{
  "status": "error",
  "message": "错误描述",
  "requestId": "uuid-string",
  "data": null
}
```

## 错误码

| HTTP 状态码 | 含义 |
|------------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或 Token 无效/过期 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 技术栈

| 组件 | 版本 |
|------|------|
| Spring Boot | 3.4.4 |
| springdoc-openapi | 2.8.4 |
| Java | 17+ |
| OpenAPI 规范 | 3.0 |

## 配置项

在 `backend/src/main/resources/application.properties` 中可配置 Swagger 相关选项：

```properties
# Swagger UI 路径
springdoc.swagger-ui.path=/swagger-ui.html

# OpenAPI JSON 路径
springdoc.api-docs.path=/v3/api-docs

# 按 HTTP 方法排序操作
springdoc.swagger-ui.operationsSorter=method

# 按字母顺序排序标签
springdoc.swagger-ui.tagsSorter=alpha

# 启用 Try it out 按钮
springdoc.swagger-ui.tryItOutEnabled=true

# 启用搜索过滤
springdoc.swagger-ui.filter=true
```

## 注意事项

1. **认证**: 除登录和健康检查外，大多数 API 需要 Bearer Token 认证
2. **文件上传**: 文件上传接口使用 `multipart/form-data` 格式，最大文件大小 50MB
3. **文件导出**: 导出接口直接返回文件流，可通过浏览器或 curl 下载
4. **分页**: 列表接口默认返回分页数据，可通过 `page` 和 `pageSize` 参数控制
5. **时区**: 所有时间字段使用 ISO 8601 格式，服务器时区为系统默认时区
6. **字符编码**: 所有接口使用 UTF-8 编码
