# 更精巧的工业表面缺陷智能检测系统

<div align="center">

![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3-green?logo=spring)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**Industrial Surface Defect Intelligent Detection System**

[English](#english-documentation) | [中文文档](#中文文档)

</div>

---

## 中文文档

### 📋 目录

- [产品概述](#产品概述)
- [技术架构](#技术架构)
- [核心功能](#核心功能)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [UI组件库](#ui组件库)
- [性能优化](#性能优化)
- [部署指南](#部署指南)
- [开发指南](#开发指南)
- [API文档](#api文档)
- [下一轮开发建议](#下一轮开发建议)

---

### 产品概述

本系统是一套完整的工业表面缺陷智能检测系统，覆盖从机械执行、视觉算法、数字孪生到运营看板的全链路能力。系统采用前后端分离架构，支持多角色权限管理、实时数据监控、AI分析助手等企业级功能。

#### 核心价值

| 模块 | 描述 |
|------|------|
| 🔧 **一体化工位设计** | 对中、夹紧、旋转、翻转整合为单工位执行闭环 |
| 👁️ **视觉算法链路** | 从边缘识别到尺寸测量形成标准化流程 |
| 📊 **运营级看板** | 设备状态、告警闭环、数字孪生映射统一展示 |
| 🤖 **AI分析助手** | 集成OpenAI兼容模型，支持智能分析 |

---

### 技术架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 14)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Pages     │  │ Components  │  │   Hooks     │              │
│  │  (App Router)│  │  (UI Lib)   │  │  (Zustand)  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                         │                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              API Layer (Next.js API Routes)              │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (Spring Boot 3)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │    Auth     │  │   Dashboard │  │  Enterprise │              │
│  │  Service    │  │   Service   │  │   Service   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                         │                                        │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              AI/ML Bridge Service                        │    │
│  └─────────────────────────────────────────────────────────┘    │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI/ML Service (FastAPI)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  OpenAI API │  │   Report    │  │    YOLO     │              │
│  │   Bridge    │  │  Generator  │  │  Training   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

#### 技术栈详情

| 层级 | 技术 | 版本 |
|------|------|------|
| **前端框架** | Next.js | 14.2.x |
| **UI组件** | shadcn/ui + Radix UI | Latest |
| **样式方案** | Tailwind CSS | 3.4.x |
| **状态管理** | Zustand | 4.5.x |
| **图表库** | ECharts | 5.5.x |
| **3D可视化** | Three.js + React Three Fiber | 0.168.x |
| **后端框架** | Spring Boot | 3.x |
| **AI服务** | FastAPI | Latest |
| **数据库** | Prisma ORM | 5.16.x |

---

### 核心功能

#### 🏠 项目总览 (`/home`)
- 创新特色展示
- 技术方案总览
- 研究目的与行业价值
- 项目进度追踪

#### 📊 指挥中心 (`/visualize`)
- 质量结构总览（饼图）
- 近30天检测趋势（折线图）
- 实时工单队列
- 执行日志滚动

#### 🏭 现场中台 (`/operations`)
- 实时监控
- 数字孪生
- 设备状态管理

#### 🤖 智能工作台 (`/workspace`)
- AI助手对话
- 数据中心
- 报告管理
- 训练任务
- 标注工具

#### ⚙️ 运营后台 (`/admin`)
- 告警管理
- 数据导入
- 检测记录
- 存储管理
- 轮毂数据

---

### 快速开始

#### 环境要求

- Node.js >= 18.x
- Java >= 17
- Python >= 3.10
- Maven >= 3.8

#### 一键启动

```powershell
# 启动完整平台
.\start-platform.bat

# 或分步启动
.\start-ai-ml.bat      # AI/ML服务 (端口: 18100)
.\start-backend.bat    # 后端服务 (端口: 18081)
.\start-frontend.bat   # 前端服务 (端口: 3001)
```

#### 手动启动

**1. 启动 AI/ML 服务**
```powershell
cd services\ai-ml
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
$env:AI_ML_WORKSPACE="..\..\backend\data\ai-ml"
.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 18100
```

**2. 启动后端服务**
```powershell
cd backend
$env:SERVER_PORT=18081
$env:APP_CORS_ALLOWED_ORIGINS="http://localhost:3001"
$env:APP_AI_ML_BASE_URL="http://localhost:18100"
mvnw.cmd spring-boot:run
```

**3. 启动前端服务**
```powershell
npm install
$env:PORT=3001
$env:NEXT_PUBLIC_API_BASE_URL="http://localhost:18081/api"
npm run dev
```

#### 访问地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:3001 |
| 后端API | http://localhost:18081/api |
| AI/ML服务 | http://localhost:18100 |

---

### 项目结构

```
Wheel-Hub-Detection-IoT-Platform/
├── app/                          # Next.js App Router
│   ├── components/               # 组件库
│   │   ├── ui/                   # shadcn/ui 组件
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── DropdownMenu.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Progress.tsx
│   │   │   ├── ScrollArea.tsx
│   │   │   ├── Separator.tsx
│   │   │   ├── Tabs.tsx
│   │   │   ├── Tooltip.tsx
│   │   │   └── Avatar.tsx
│   │   ├── Charts/               # 图表组件
│   │   ├── Layout/               # 布局组件
│   │   ├── Theme/                # 主题组件
│   │   └── Locale/               # 国际化组件
│   ├── home/                     # 首页
│   ├── visualize/                # 指挥中心
│   ├── operations/               # 现场中台
│   ├── workspace/                # 智能工作台
│   ├── admin/                    # 运营后台
│   └── api/                      # API路由
├── backend/                      # Spring Boot 后端
│   └── src/main/java/com/rheayao/wheelhub/
│       ├── auth/                 # 认证模块
│       ├── dashboard/            # 仪表盘模块
│       ├── enterprise/           # 企业模块
│       └── storage/              # 存储模块
├── services/ai-ml/               # FastAPI AI服务
│   ├── main.py
│   └── requirements.txt
├── lib/                          # 前端工具库
│   ├── utils.ts                  # 工具函数
│   ├── auth-session.ts           # 认证会话
│   ├── dashboard-client.ts       # 仪表盘客户端
│   └── runtime-cache.ts          # 运行时缓存
├── types/                        # TypeScript 类型定义
├── public/                       # 静态资源
│   ├── images/
│   ├── models/
│   └── draco/
├── docs/                         # 文档
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

### UI组件库

本项目基于 [shadcn/ui](https://ui.shadcn.com/) 构建了一套现代化的UI组件库，具有以下特点：

#### 设计特点

- **渐变主题**：使用CSS变量实现多主题切换
- **玻璃态效果**：backdrop-blur实现毛玻璃效果
- **发光边框**：动态渐变边框效果
- **微交互动画**：hover、focus、active状态动画
- **响应式设计**：完美适配桌面端和移动端

#### 可用组件

| 组件 | 描述 |
|------|------|
| `Button` | 多变体按钮（default/outline/ghost/glow等） |
| `Card` | 卡片容器（default/glass/elevated/bordered） |
| `Badge` | 状态徽章（default/success/warning/destructive/glow） |
| `Progress` | 进度条（带渐变和发光效果） |
| `Input` | 输入框（带focus状态动画） |
| `Dialog` | 对话框（带动画过渡） |
| `DropdownMenu` | 下拉菜单 |
| `Tabs` | 标签页切换 |
| `Tooltip` | 工具提示 |
| `ScrollArea` | 滚动区域 |
| `Avatar` | 头像组件 |
| `Separator` | 分隔线 |

#### 使用示例

```tsx
import { Button } from "@/app/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Badge";
import { Progress } from "@/app/components/ui/Progress";

export default function MyComponent() {
  return (
    <Card variant="glass" className="glow-border">
      <CardHeader>
        <CardTitle className="text-gradient">标题</CardTitle>
      </CardHeader>
      <CardContent>
        <Badge variant="success">已完成</Badge>
        <Progress value={75} className="mt-4" />
        <Button variant="glow" className="mt-4">开始</Button>
      </CardContent>
    </Card>
  );
}
```

---

### 性能优化

#### 已实施的优化

| 优化项 | 描述 |
|--------|------|
| **代码分割** | Next.js自动代码分割，按需加载 |
| **图片优化** | 使用Next.js Image组件，支持WebP/AVIF |
| **字体优化** | 系统字体优先，减少网络请求 |
| **CSS优化** | Tailwind CSS按需生成，最小化CSS |
| **Tree Shaking** | 移除未使用的代码 |
| **懒加载** | 图片和组件懒加载 |
| **运行时缓存** | sessionStorage + 内存缓存，合并重复请求 |

#### 性能指标

```
Route (app)                    Size      First Load JS
┌ ○ /                          138 B     87.4 kB
├ ○ /home                      8.53 kB   104 kB
├ ○ /visualize                 355 kB    455 kB
├ ○ /operations                3.62 kB   272 kB
└ ○ /workspace                 5.79 kB   114 kB
```

---

### 部署指南

#### Docker部署

```dockerfile
# Dockerfile 示例
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3001
CMD ["node", "server.js"]
```

#### 环境变量

```env
# 前端
PORT=3001
NEXT_PUBLIC_API_BASE_URL=http://localhost:18081/api

# 后端
SERVER_PORT=18081
APP_CORS_ALLOWED_ORIGINS=http://localhost:3001
APP_AI_ML_BASE_URL=http://localhost:18100

# AI/ML
AI_ML_WORKSPACE=./backend/data/ai-ml
```

---

### 开发指南

#### 代码规范

```powershell
# 代码检查
npm run lint

# 类型检查
npm run typecheck

# 代码格式化
npm run format
```

#### Git提交规范

```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
perf: 性能优化
test: 测试相关
chore: 构建/工具相关
```

---

### API文档

#### 认证API

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 用户登出 |
| GET | `/api/auth/session` | 获取会话信息 |

#### 仪表盘API

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/dashboard/command-center` | 指挥中心数据 |
| GET | `/api/dashboard/health` | 健康检查 |
| GET | `/api/dashboard/statistics` | 统计数据 |

#### 企业API

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/enterprise/providers` | 获取AI提供商列表 |
| POST | `/api/enterprise/providers` | 创建AI提供商 |
| GET | `/api/enterprise/sessions` | 获取会话列表 |
| POST | `/api/enterprise/chat` | 发送聊天消息 |

---

### 下一轮开发建议

#### 高优先级

1. **全量文案国际化**
   - 检查所有页面文案是否通过`text()`管理
   - 统一后端返回的中文fallback

2. **设计系统化**
   - 补充button/input/form/badge/status token
   - 完善移动端spacing token
   - 定义空态、加载态、错误态规范

3. **并发与性能**
   - 后端接口级缓存与分页
   - 服务端分页实现
   - Optimistic update
   - WebSocket/SSE状态推送

#### 中优先级

4. **认证与安全**
   - Token刷新策略
   - 多端登录管理
   - Provider key加密脱敏

5. **自动化测试**
   - Playwright E2E测试
   - 核心页面截图对比
   - 登录/切换语言/AI对话链路测试

---

## English Documentation

### Overview

This is a complete wheel hub inspection IoT platform covering the entire chain from mechanical execution, visual algorithms, digital twins to operational dashboards. The system uses a front-end and back-end separated architecture, supporting multi-role permission management, real-time data monitoring, AI analysis assistants, and other enterprise-level features.

### Quick Start

```powershell
# Start the complete platform
.\start-platform.bat

# Or start services separately
.\start-ai-ml.bat      # AI/ML Service (Port: 18100)
.\start-backend.bat    # Backend Service (Port: 18081)
.\start-frontend.bat   # Frontend Service (Port: 3001)
```

### Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | Next.js | 14.2.x |
| UI Components | shadcn/ui + Radix UI | Latest |
| Styling | Tailwind CSS | 3.4.x |
| State Management | Zustand | 4.5.x |
| Charts | ECharts | 5.5.x |
| 3D Visualization | Three.js + React Three Fiber | 0.168.x |
| Backend | Spring Boot | 3.x |
| AI Service | FastAPI | Latest |

### Core Features

- **Home Overview**: Innovation showcase, technical roadmap, project progress tracking
- **Command Center**: Quality structure overview, 30-day trend analysis, real-time work order queue
- **Operations Hub**: Real-time monitoring, digital twin, device status management
- **AI Workspace**: AI assistant dialogue, data center, report management, training tasks
- **Admin Console**: Alert management, data import, inspection records, storage management

### Development

```powershell
# Install dependencies
npm install

# Development server
npm run dev

# Build for production
npm run build

# Lint check
npm run lint

# Type check
npm run typecheck
```

---

## License

This project is licensed under the MIT License.

---

<div align="center">

**Built with ❤️ for Industrial IoT**

</div>
