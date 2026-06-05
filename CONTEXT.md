# Wheel-Hub-Detection-IoT-Platform-slim — 项目上下文文件

> 版本: 2.2.0 | 生成日期: 2026-06-01
> 本文件为全项目快速导航索引，涵盖架构、目录、模块、API、数据模型、部署配置等全部内容。

---

## 1. 项目概览

**名称**: 工业表面缺陷智能检测系统 (Industrial Surface Defect Detection System)
**定位**: 企业级工业表面缺陷检测平台，覆盖监控、数字孪生、AI 分析、报告和工作流
**技术栈**: Next.js 14 (App Router) + Spring Boot 3.4 + PostgreSQL 16 + Redis 7 + FastAPI (Python)
**包名**: `industrial-surface-defect-detection`

---

## 2. 系统架构

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Browser    │────▶│  Next.js 前端     │────▶│ Spring Boot 后端 │
│  (React 18)  │◀────│  (Port 3000/3005) │◀────│  (Port 18081)   │
└──────────────┘     └──────────────────┘     └────────┬────────┘
                      │  API Routes (Prisma)            │
                      │  Server Components              │
                      └─────────────────────────────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │  PostgreSQL 16   │
                                              │  (Port 5432)     │
                                              └─────────────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │  Redis 7         │
                                              │  (Port 6379)     │
                                              └─────────────────┘
                                                       │
                                              ┌────────▼────────┐
                                              │  AI/ML Service   │
                                              │  FastAPI:18100   │
                                              └─────────────────┘
```

**数据流**:
1. 浏览器 → Next.js 前端 (SSR/CSR)
2. 前端 → Spring Boot 后端 API (`/api/*`) — 主要数据源
3. 前端 → Next.js API Routes (`/api/*`) — Prisma 直连数据库的辅助路由
4. 后端 → AI/ML 服务 (`:18100`) — AI 分析、训练、报告生成
5. 后端 → Redis — 分布式缓存
6. 后端 → PostgreSQL — 持久化存储

---

## 3. 目录结构速查

| 目录 | 用途 | 关键文件 |
|------|------|----------|
| `app/` | Next.js App Router 页面和 API | 见下方详细表 |
| `app/components/` | React 组件库 | Layout/, Charts/, ui/, Monitor/, Theme/ |
| `app/api/` | Next.js API Routes | wheels/, logs/, sync/, admin/, statistics/ 等 |
| `backend/` | Spring Boot 后端 (Java 17) | src/main/java/com/rheayao/wheelhub/ |
| `services/ai-ml/` | FastAPI AI/ML 服务 | main.py, requirements.txt |
| `lib/` | 前端工具库 | auth-session.ts, dashboard-client.ts, prisma.ts 等 |
| `types/` | TypeScript 类型定义 | auth.ts, platform.ts, imports.ts, alerts.ts |
| `prisma/` | Prisma 数据库模型 | schema.prisma |
| `public/` | 静态资源 | images/, models/, draco/ |
| `docker/` | Docker 配置 | nginx/, postgres/ |
| `docs/` | 项目文档 | ARCHITECTURE.md, DEPLOY.md 等 |
| `e2e/` | Playwright E2E 测试 | pages/, tests/ |
| `scripts/` | 工具脚本 | import-data.ts, generate-pwa-icons.mjs |
| `tools/` | 开发辅助工具 | i18n-guard.mjs, theme-contrast-audit.mjs 等 |
| `css/` | 遗留 CSS (旧 HTML 页面) | admin.css, monitor.css 等 |
| `js/` | 遗留 JS (旧 HTML 页面) | echarts.js, three.core.js 等 |
| `.github/workflows/` | CI/CD | ci.yml, cd.yml, code-quality.yml |

---

## 4. 前端页面路由 (app/ 目录)

| 路由路径 | 文件 | 功能描述 |
|----------|------|----------|
| `/` | `app/page.tsx` | 根路径，自动重定向到 `/home` |
| `/home` | `app/home/page.tsx` | 首页/总览，展示平台导览、核心流程、模块卡片、路线图 |
| `/visualize` | `app/visualize/page.tsx` | 指挥中心，KPI指标、质量饼图、吞吐趋势、项目队列、执行日志 |
| `/operations` | `app/operations/page.tsx` | 运行中台，系统状态、监控摄像头、告警、数字孪生传感器 |
| `/workspace` | `app/workspace/page.tsx` | 智能工作区，AI助手/数据中心/报告/训练/标注统一入口 |
| `/monitor` | `app/monitor/page.tsx` | 监控中心，摄像头墙、告警队列、设备状态追踪 |
| `/digital-twin` | `app/digital-twin/page.tsx` | 数字孪生，3D模型、传感器数据、工艺流程、设备网格 |
| `/admin` | `app/admin/page.tsx` | 管理后台，告警/数据导入/检测/存储/轮毂管理 |
| `/admin/alerts` | `app/admin/alerts/page.tsx` | 告警管理 |
| `/admin/data-import` | `app/admin/data-import/page.tsx` | 数据导入管理 |
| `/admin/inspections` | `app/admin/inspections/page.tsx` | 检测记录管理 |
| `/admin/storage` | `app/admin/storage/page.tsx` | 存储管理 |
| `/admin/wheels` | `app/admin/wheels/page.tsx` | 轮毂数据管理 |
| `/login` | `app/login/page.tsx` | 登录页，用户认证 |
| `/ai-assistant` | `app/ai-assistant/page.tsx` | AI助手，聊天、查询历史、可视化数据 |
| `/data-hub` | `app/data-hub/page.tsx` | 数据中心，数据源管理、导入日志 |
| `/reports` | `app/reports/page.tsx` | 报告中心，报告生成与筛选 |
| `/training` | `app/training/page.tsx` | 训练中心，ML模型训练任务管理 |
| `/annotation` | `app/annotation/page.tsx` | 标注工作室，数据标注与项目管理 |
| `/platform-config` | `app/platform-config/page.tsx` | 平台配置 |

---

## 5. Next.js API Routes (app/api/)

| 路由 | 方法 | 功能 |
|------|------|------|
| `/api/wheels` | GET/POST/PUT/DELETE | 轮毂CRUD，支持分页/游标/筛选/批量导入 |
| `/api/logs` | GET | 检测日志列表（模拟36条数据） |
| `/api/sync` | POST | 数据同步触发 |
| `/api/admin` | GET | 管理员快照数据 |
| `/api/command-center` | GET | 指挥中心快照数据 |
| `/api/digital-twin` | GET | 数字孪生快照数据 |
| `/api/monitor` | GET | 监控快照数据 |
| `/api/statistics` | GET | 统计数据（总览/尺寸分布/型号分布/质量/每日/设备状态） |
| `/api/imports` | GET/POST | 导入批次列表与新增 |
| `/api/imports/[id]` | GET/DELETE | 单个导入批次详情与删除 |
| `/api/imports/[id]/log` | GET | 导入批次日志 |

---

## 6. Spring Boot 后端模块

**基础包**: `com.rheayao.wheelhub`

| 模块 | 类 | 功能 |
|------|-----|------|
| 认证 | `AuthController`, `AuthService` | 用户登录/登出/权限验证 |
| 企业 | `EnterpriseController` | 企业平台、AI辅助协议 |
| 仪表板 | `DashboardController` | 数据展示和统计API |
| 导出 | `DataExportController` | 数据导出 |
| WebSocket | `AiResultWebSocketHandler` | AI分析结果实时推送 |
| 审计 | `AuditLogController` | 操作审计日志 |
| 配置 | `OpenApiConfig` | Swagger/OpenAPI文档配置 |
| 通用 | `ApiEnvelope` | 统一API响应封装 |

**后端端口**: 18081
**后端框架**: Spring Boot 3.4.4, Java 17
**依赖**: Spring Web, WebSocket, AOP, Data Redis, Validation, SpringDoc OpenAPI, Sentry

---

## 7. AI/ML 服务 (FastAPI)

**文件**: `services/ai-ml/main.py`
**端口**: 18100
**框架**: FastAPI + Pydantic

| 端点 | 方法 | 功能 |
|------|------|------|
| `/health` | GET | 健康检查，返回CUDA/训练后端状态 |
| `/v1/chat/completions` | POST | OpenAI兼容聊天接口（代理转发） |
| `/chat/respond` | POST | AI聊天响应（含意图分类） |
| `/analysis/run` | POST | AI分析执行（质量诊断） |
| `/data-sources/profile` | POST | 数据源画像 |
| `/reports/generate` | POST | 报告生成（CSV/CSV7/XLSX/DOCX/PNG） |
| `/training/jobs` | POST | YOLO训练任务创建 |
| `/training/control` | POST | 训练控制（暂未实现） |

**核心能力**:
- 支持 OpenAI 兼容的远程 AI 提供方路由
- 意图分类: general-chat / analyze-quality / prepare-report / prepare-training / navigate-workspace / review-data-source
- 检测域: wheel_hub / bridge_cable / weld_joint / general_asset
- 报告格式: CSV, CSV7, XLSX, DOCX, PNG
- 训练后端: Ultralytics YOLOv10

---

## 8. 数据库模型 (Prisma)

**文件**: `prisma/schema.prisma`
**数据库**: PostgreSQL 16

| 模型 | 表名 | 字段 | 说明 |
|------|------|------|------|
| `Wheel` | `wheels` | id, wheelNumber, diameter, averageBolt, center, pcd, type, createdAt, updatedAt | 轮毂检测记录 |
| `Statistics` | `statistics` | id, totalCount, testedCount, untestedCount, completionRate, qualifiedCount, unqualifiedCount, date, createdAt | 统计快照 |
| `DeviceStatus` | `device_statuses` | id, deviceName, status, runningTime, lastUpdate | 设备运行状态 |
| `SizeDistribution` | `size_distributions` | id, size, count, date | 尺寸分类统计 |
| `ModelDistribution` | `model_distributions` | id, modelName, count, date | 型号分类统计 |

**索引优化**: Wheel 表包含 createdAt, type, diameter, pcd 单字段索引及 type+createdAt, diameter+type, pcd+type, createdAt(desc)+type 复合索引

---

## 9. 认证系统

**类型文件**: `types/auth.ts`
**会话管理**: `lib/auth-session.ts`

**用户角色**: `admin` | `engineer` | `operator` | `viewer` | `user`(映射为operator)

**会话存储**: sessionStorage
- `wh_auth_token` — JWT Token
- `wh_auth_user` — 用户名
- `wh_auth_role` — 角色
- `wh_auth_display` — 显示名
- `wh_auth_email` — 邮箱
- `wh_auth_dept` — 部门
- `wh_auth_expires` — 过期时间

**导航权限**:
- admin: 全部页面 + 管理后台
- engineer/viewer: 排除指挥中心和运行中台
- operator: 全部核心页面

---

## 10. 前端组件库

### 布局组件 (`app/components/Layout/`)
| 组件 | 功能 |
|------|------|
| `Header` | 顶部导航栏，含Logo/导航/主题切换/账户菜单 |
| `Navigation` | 主导航，支持桌面/移动端/折叠模式 |
| `Footer` | 页脚 |
| `Card` | 通用卡片容器 |
| `BackButton` | 返回按钮 |
| `AccountMenu` | 账户下拉菜单 |
| `ShowcaseDock` | 展示停靠栏 |
| `PageTransitionShell` | 页面过渡动画 |
| `MobileGestureProvider` | 移动端手势支持 |
| `ViewportProvider` | 视口信息Provider |
| `TransitionLink` | 带过渡动画的链接 |

### UI 组件 (`app/components/ui/`)
| 组件 | 功能 |
|------|------|
| `Button` | 按钮 |
| `Card` | UI卡片 |
| `Badge` | 徽章 |
| `Dialog` | 对话框 |
| `DropdownMenu` | 下拉菜单 |
| `Input` | 输入框 |
| `Loading` | 加载状态 |
| `Pagination` | 分页 |
| `Progress` | 进度条 |
| `ProgressOverlay` | 全屏进度覆盖 |
| `ScrollArea` | 滚动区域 |
| `Separator` | 分隔线 |
| `Skeleton` | 骨架屏 |
| `Tabs` | 标签页 |
| `Toast` | 提示消息 |
| `Tooltip` | 工具提示 |
| `Avatar` | 头像 |
| `EmptyState` | 空状态 |

### 图表组件 (`app/components/Charts/`)
| 组件 | 功能 |
|------|------|
| `LineChart` | 折线图 (ECharts) |
| `PieChart` | 饼图 (ECharts) |

### 其他组件
| 组件 | 位置 | 功能 |
|------|------|------|
| `ThemeProvider/ThemeToggle` | `components/Theme/` | 主题切换（明暗模式） |
| `CameraFeed` | `components/Monitor/` | 摄像头画面 |
| `StatsCards` | `components/Stats/` | 统计卡片 |
| `PwaInstallPrompt` | `components/` | PWA安装提示 |
| `FloatingAssistant` | `components/Assistant/` | 浮动AI助手 |
| `LocaleProvider` | `components/Locale/` | 国际化Provider |
| `ServiceWorkerRegistration` | `components/` | Service Worker 注册 |

---

## 11. 工具库 (lib/)

| 文件 | 功能 |
|------|------|
| `auth-session.ts` | 认证会话管理（sessionStorage读写/JWT解析/过期检查） |
| `csrf.ts` | CSRF Token 管理 |
| `dashboard-client.ts` | 后端API客户端（fetchPlatformData/requestPlatformJson/requestPlatformBlob） |
| `enterprise-client.ts` | 企业API客户端 |
| `enterprise-localization.ts` | 企业本地化 |
| `locale.ts` | 语言环境工具 |
| `navigation-transition.ts` | 导航过渡动画 |
| `platform-data.ts` | 平台数据工具 |
| `prisma.ts` | Prisma客户端单例 |
| `pwa-utils.ts` | PWA工具 |
| `runtime-cache.ts` | 运行时缓存（内存缓存+请求去重） |
| `runtime-endpoint-config.ts` | 运行时端点配置（API基础URL/AI提供方配置，支持localStorage动态修改） |
| `sentry-utils.ts` | Sentry监控工具 |
| `server-cache.ts` | 服务端缓存（CacheKeys/CacheTTL） |
| `theme.ts` | 主题工具 |
| `utils.ts` | 通用工具函数（cn类名合并等） |
| `i18n/client.ts` | i18n客户端 |
| `i18n/resources.ts` | i18n资源 |
| `i18n/auto-page-resources.ts` | 自动页面i18n资源 |
| `i18n/manual-page-resources.ts` | 手动页面i18n资源 |
| `hooks/use-mobile-gestures.ts` | 移动端手势Hook |
| `hooks/use-sentry-performance.ts` | Sentry性能监控Hook |

---

## 12. 环境配置

**文件**: `.env.example` / `.env.local`

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | `postgresql://user:password@localhost:5432/wheel_hub_platform` | PostgreSQL连接 |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:18081/api` | 后端API地址 |
| `APP_AI_ML_BASE_URL` | `http://localhost:18100` | AI/ML服务地址 |
| `APP_DATA_HOME` | `./backend/data` | 共享数据目录 |
| `APP_SECURITY_SECRET` | `wheel-hub-platform-secret-CHANGE-IN-PRODUCTION` | 加密密钥 |
| `SERVER_PORT` | `18081` | 后端端口 |
| `PORT` | `3001` | 前端端口 |
| `AI_ML_PORT` | `18100` | AI/ML端口 |
| `APP_CORS_ALLOWED_ORIGINS` | `http://localhost:3001` | CORS配置 |
| `NEXT_PUBLIC_SENTRY_DSN` | — | Sentry DSN |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | `0.1` | 性能采样率 |

---

## 13. Docker 部署

### docker-compose.yml 服务

| 服务 | 镜像 | 端口 | 说明 |
|------|------|------|------|
| `postgres` | postgres:16-alpine | 5432 | PostgreSQL 数据库 |
| `redis` | redis:7-alpine | 6379 | Redis 缓存 |
| `backend` | 自建 (backend/Dockerfile) | 18081 | Spring Boot 后端 |
| `frontend` | 自建 (Dockerfile.frontend) | 3000 | Next.js 前端 |
| `ai-ml` | 自建 (services/ai-ml/Dockerfile) | 18100 | AI/ML 服务 (可选, profiles: ai/all) |

### Dockerfile.frontend (多阶段构建)
- Stage 1 (builder): node:20-alpine → npm ci → prisma generate → next build
- Stage 2 (runner): node:20-alpine → standalone输出 → 非root用户运行

### Nginx 配置 (docker/nginx/)
- `nginx.conf`: 主配置（gzip/安全头/限流）
- `conf.d/default.conf`: 反向代理规则
  - `/` → frontend:3000
  - `/api/` → backend:18081 (限流30r/s)
  - `/ws/` → backend:18081 (WebSocket)
  - `/nginx-health` → 200 OK

---

## 14. CI/CD

| 工作流 | 文件 | 触发条件 | 功能 |
|--------|------|----------|------|
| CI | `.github/workflows/ci.yml` | Push/PR | 代码检查与测试 |
| CD | `.github/workflows/cd.yml` | Release/Manual | 部署 |
| Code Quality | `.github/workflows/code-quality.yml` | Push/PR | 代码质量检查 |

---

## 15. 测试

**E2E 测试**: Playwright
- 配置: `playwright.config.ts`, `playwright.acceptance.config.ts`
- 页面对象: `e2e/pages/` (BasePage, HomePage, LoginPage, AdminPage, OperationsPage, CommandCenterPage)
- 测试用例: `e2e/tests/` (home, login, admin, operations, command-center, manual-acceptance)

---

## 16. 关键配置文件

| 文件 | 用途 |
|------|------|
| `next.config.js` | Next.js配置（standalone输出、Sentry集成、3D模型加载、PWA头信息） |
| `tailwind.config.ts` | Tailwind CSS配置 |
| `tsconfig.json` | TypeScript配置 |
| `postcss.config.js` | PostCSS配置 |
| `package.json` | 依赖与脚本 |
| `prisma/schema.prisma` | 数据库模型 |
| `docker-compose.yml` | 开发环境Docker编排 |
| `docker-compose.prod.yml` | 生产环境Docker编排（资源限制/日志/Nginx） |
| `netlify.toml` | Netlify部署配置 |
| `_redirects` | Netlify重定向规则 |
| `instrumentation.ts` | Next.js instrumentation |
| `sentry.client.config.ts` | Sentry客户端配置 |
| `sentry.server.config.ts` | Sentry服务端配置 |
| `sentry.edge.config.ts` | Sentry Edge配置 |

---

## 17. NPM 脚本

| 命令 | 功能 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 (端口3005) |
| `npm run lint` | ESLint检查 |
| `npm run format` | Prettier格式化 |
| `npm run typecheck` | TypeScript类型检查 |
| `npm run i18n:guard` | i18n完整性检查 |
| `npm run db:push` | 推送Prisma模型到数据库 |
| `npm run db:migrate` | 运行数据库迁移 |
| `npm run db:generate` | 生成Prisma客户端 |
| `npm run db:studio` | 打开Prisma Studio |
| `npm run test:e2e` | 运行E2E测试 |

---

## 18. 遗留静态页面

项目根目录包含旧版静态HTML页面（非Next.js），使用原生JS/CSS:

| 文件 | 对应页面 |
|------|----------|
| `Home_Page.html` | 首页 |
| `Visualize.html` | 可视化 |
| `Monitor.html` | 监控 |
| `Admin_Index.html` | 管理后台 |
| `Digital_Twin.html` | 数字孪生 |
| `Data_Import.html` | 数据导入 |

配套CSS: `css/` 目录 (admin.css, common.css, dataimport.css, digitaltwin.css, homepage.css, map.css, monitor.css, visualize.css)
配套JS: `js/` 目录 (admin.js, app-shell.js, china.js, data-import.js, digitaltwin.js, echarts.js, echarts.min.js, jquery-2.1.1.min.js, loadHistory.js, monitor.js, three.core.js, visual.js)

---

## 19. 数据文件

| 文件 | 用途 |
|------|------|
| `data.json` | 示例/种子数据 |
| `defects.csv` | 缺陷数据 |
| `inspections.csv` | 检测数据 |
| `logs.csv` | 日志数据 |
| `parts_spec.csv` | 零件规格 |
| `projects.csv` | 项目数据 |

---

## 20. 3D 模型资源

| 文件 | 位置 | 用途 |
|------|------|------|
| `1.glb` | `public/models/` | 3D模型 (GLB格式) |
| `1.hdr`, `20.hdr` | `public/models/` | HDR环境贴图 |
| `TianXiaWuShuang.STL` | `public/models/` | STL模型 |
| `cemian.STL` | 项目根目录 | 侧面STL模型 |
| `draco/` | `public/draco/` | Draco压缩解码器 |

---

## 21. 运行时端点配置

**文件**: `lib/runtime-endpoint-config.ts`

支持在浏览器端通过 localStorage 动态修改API端点:
- `platform_api_base_url` — 后端API基础URL
- `platform_ai_provider_base_url` — AI提供方基础URL
- `platform_ai_provider_chat_model` — 聊天模型名
- `platform_ai_provider_embedding_model` — 嵌入模型名

默认API基础URL自动推断: `${window.location.protocol}//${window.location.hostname}:18081/api`

---

## 22. 启动脚本

| 脚本 | 用途 |
|------|------|
| `start-platform.bat` | 一键启动全平台 |
| `start-frontend.bat` | 仅启动前端 |
| `start-backend.bat` | 仅启动后端 |
| `start-ai-ml.bat` | 仅启动AI/ML服务 |
| `start-platform-lite.bat` | 精简版启动 |
| `start-platform-enterprise.bat` | 企业版启动 |
| `docker-start.bat` / `docker-start.sh` | Docker启动 |
| `一键启动与验证.bat` / `.ps1` | 一键启动与验证 |
| `点我进行一键启动.bat` | 快捷启动入口 |
