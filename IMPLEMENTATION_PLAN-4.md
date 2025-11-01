# 轮毂检测物联网平台 - 完整改造实施计划

## 📋 项目概述

**项目名称**: 轮毂检测物联网平台  
**当前状态**: 静态HTML页面  
**目标**: 改造成前后端分离的现代化Web应用  
**推荐方案**: Next.js + Vercel + PostgreSQL (Neon/Supabase) + Prisma + Tailwind CSS

---

## 🎯 技术栈选择说明

### 为什么选择 Next.js？
- ✅ **全栈框架**: 内置API路由，前后端一体，适合你的场景
- ✅ **SEO友好**: 服务端渲染，搜索引擎优化
- ✅ **自动优化**: 图片优化、代码分割、性能优化内置
- ✅ **部署简单**: Vercel一键部署，免费额度友好
- ✅ **TypeScript支持**: 类型安全，减少错误

### 为什么选择 Vercel？
- ✅ **零配置部署**: 连接GitHub自动构建部署
- ✅ **自动HTTPS**: 免费SSL证书
- ✅ **全球CDN**: 全球加速
- ✅ **免费额度**: 个人项目够用
- ✅ **域名绑定简单**: 几分钟完成

### 为什么选择 Neon/Supabase？
- ✅ **免费额度**: 开发阶段够用
- ✅ **PostgreSQL**: 稳定可靠的关系型数据库
- ✅ **Web控制台**: 可视化管理数据
- ✅ **连接简单**: 一条连接串即可

---

## 📐 项目结构规划

```
wheel-detection-platform/
├── app/                          # Next.js App Router
│   ├── layout.tsx               # 根布局（导航栏、全局样式）
│   ├── page.tsx                 # 主页 (/)
│   ├── visualize/
│   │   └── page.tsx            # 可视化平台 (/visualize)
│   ├── monitor/
│   │   └── page.tsx            # 实时监控 (/monitor)
│   ├── digital-twin/
│   │   └── page.tsx            # 数字孪生 (/digital-twin)
│   ├── api/                     # API路由
│   │   ├── wheels/
│   │   │   └── route.ts        # 轮毂数据CRUD
│   │   ├── statistics/
│   │   │   └── route.ts        # 统计数据
│   │   └── realtime/
│   │       └── route.ts        # 实时数据（WebSocket）
│   └── components/              # React组件
│       ├── Layout/
│       │   ├── Header.tsx      # 导航栏
│       │   └── Navigation.tsx  # 导航按钮
│       ├── Charts/
│       │   ├── SizeChart.tsx   # 尺寸分类图表
│       │   ├── ModelChart.tsx  # 型号分类图表
│       │   └── QualityChart.tsx # 合格率图表
│       ├── ThreeViewer/
│       │   └── ModelViewer.tsx # 3D模型查看器
│       ├── Monitor/
│       │   ├── CameraFeed.tsx   # 摄像头组件
│       │   └── StatsCards.tsx  # 统计卡片
│       └── DataTable/
│           └── WheelList.tsx   # 轮毂数据列表
├── lib/                         # 工具库
│   ├── prisma.ts               # Prisma客户端
│   ├── websocket.ts            # WebSocket服务
│   └── utils.ts                # 工具函数
├── prisma/
│   └── schema.prisma           # 数据库模型定义
├── public/                     # 静态资源
│   ├── images/                 # 图片
│   ├── models/                 # 3D模型文件
│   │   ├── 1.glb
│   │   └── *.hdr
│   └── draco/                  # Draco压缩库
├── .env.local                  # 本地环境变量（不提交）
├── .env.example                # 环境变量示例（提交）
├── package.json
├── tailwind.config.ts          # Tailwind配置
├── tsconfig.json               # TypeScript配置
└── next.config.js              # Next.js配置
```

---

## 🗄️ 数据库设计

### Prisma Schema (prisma/schema.prisma)

```prisma
// 轮毂检测记录
model Wheel {
  id            String   @id @default(cuid())
  wheelNumber   String   @unique // 轮毂编号，如 "202503110001"
  diameter      Float    // 直径 (mm)
  averageBolt   Float    // 平均螺栓孔径 (mm)
  center        Float    // 中心孔径 (mm)
  pcd           Float    // 孔距 (PCD, mm)
  type          String   // 状态: "合格" | "不合格"
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([createdAt])
  @@index([type])
}

// 统计数据快照（用于缓存，提升性能）
model Statistics {
  id              String   @id @default(cuid())
  totalCount      Int      // 轮毂总数
  testedCount     Int      // 已检测数
  untestedCount   Int      // 未检测数
  completionRate  Float    // 完成率 (%)
  qualifiedCount  Int      // 合格数
  unqualifiedCount Int     // 不合格数
  date            DateTime @default(now()) @unique
  createdAt       DateTime @default(now())
  
  @@index([date])
}

// 设备运行状态
model DeviceStatus {
  id              String   @id @default(cuid())
  deviceName      String   // 设备名称: "传送机构" | "中心夹具" | "侧面夹具" | "检测机构"
  status          String   // 状态: "运行中" | "待机" | "故障"
  runningTime     Int      // 运行时长（分钟）
  lastUpdate      DateTime @default(now())
  
  @@unique([deviceName])
}

// 尺寸分类统计（按尺寸规格）
model SizeDistribution {
  id        String   @id @default(cuid())
  size      String   // "15寸" | "16寸" | "17寸" | "18寸" | "19寸"
  count     Int      @default(0)
  date      DateTime @default(now())
  
  @@unique([size, date])
  @@index([date])
}

// 型号分类统计
model ModelDistribution {
  id        String   @id @default(cuid())
  modelName String   // 型号名称
  count     Int      @default(0)
  date      DateTime @default(now())
  
  @@unique([modelName, date])
  @@index([date])
}
```

---

## 🔌 API路由设计

### 1. 轮毂数据 API (`/api/wheels`)

```
GET    /api/wheels          # 获取轮毂列表（支持分页、筛选）
POST   /api/wheels          # 创建新轮毂检测记录
GET    /api/wheels/:id      # 获取单个轮毂详情
PUT    /api/wheels/:id      # 更新轮毂数据
DELETE /api/wheels/:id      # 删除轮毂记录
```

### 2. 统计数据 API (`/api/statistics`)

```
GET /api/statistics/overview      # 获取总体统计（总数、已检测、完成率等）
GET /api/statistics/size-dist     # 获取尺寸分类统计
GET /api/statistics/model-dist    # 获取型号分类统计
GET /api/statistics/quality       # 获取合格/不合格统计
GET /api/statistics/daily         # 获取每日检测数量（折线图）
GET /api/statistics/devices       # 获取设备运行状态
```

### 3. 实时数据 API (`/api/realtime`)

```
WebSocket /api/realtime/ws        # WebSocket连接，推送实时更新
GET       /api/realtime/status     # 获取当前实时状态（轮询备用）
```

---

## 🎨 UI/UX美化方案

### 设计原则
1. **保持现有风格**: 深色科技感主题，蓝紫色渐变背景
2. **响应式设计**: 移动端、平板、桌面端适配
3. **性能优化**: 懒加载、虚拟滚动、图片优化
4. **交互增强**: 悬浮效果、过渡动画、加载状态

### Tailwind CSS主题配置

```js
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e3f2fd',
          500: '#0089ff',
          700: '#036178',
          900: '#04187d',
        },
        accent: '#077e8e',
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(to right, #04187d, #077e8e, #04187d)',
      },
    },
  },
}
```

### 组件化设计

1. **布局组件**: Header, Sidebar, Footer
2. **数据展示**: Card, Table, StatCard
3. **图表组件**: PieChart, LineChart, BarChart (基于ECharts)
4. **3D可视化**: ThreeViewer (Three.js集成)
5. **实时监控**: CameraFeed, StatusIndicator

---

## 📦 依赖包清单

### 核心依赖
```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@prisma/client": "^5.0.0",
    "prisma": "^5.0.0",
    "echarts": "^5.4.0",
    "echarts-for-react": "^3.0.2",
    "three": "^0.160.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.88.0",
    "zustand": "^4.4.0",          // 状态管理
    "axios": "^1.6.0",             // HTTP请求
    "date-fns": "^3.0.0"           // 日期处理
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/three": "^0.160.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

---

## 🚀 实施步骤（详细）

### Phase 0: 环境准备（一次性）

#### 1. 安装 Node.js
- 访问 https://nodejs.org/
- 下载 LTS 版本（推荐 20.x）
- 安装后验证：
  ```bash
  node -v    # 应显示 v20.x.x
  npm -v     # 应显示 10.x.x
  ```

#### 2. 安装 VS Code 及插件
- 推荐插件：
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - Prisma
  - Auto Rename Tag

#### 3. 安装 Git
- Windows: 下载 Git for Windows
- 验证：`git --version`
- 配置：
  ```bash
  git config --global user.name "你的名字"
  git config --global user.email "你的邮箱"
  ```

---

### Phase 1: 创建Next.js项目

#### 步骤1.1: 初始化项目
```bash
# 在项目目录执行
npx create-next-app@latest wheel-detection-platform --typescript --tailwind --app --no-src-dir

# 或逐步选择：
# - TypeScript: Yes
# - ESLint: Yes
# - Tailwind CSS: Yes
# - App Router: Yes
# - src/ directory: No (保持简单)
# - import alias: Yes (默认 @/*)
```

#### 步骤1.2: 进入项目并启动
```bash
cd wheel-detection-platform
npm run dev
# 访问 http://localhost:3000 查看初始页面
```

---

### Phase 2: 迁移静态资源

#### 步骤2.1: 复制资源文件
- 图片 → `public/images/`
- 3D模型 → `public/models/`
- Draco库 → `public/draco/`

#### 步骤2.2: 迁移CSS样式
- 将关键样式提取到 `app/globals.css`
- 使用 Tailwind 工具类重构

#### 步骤2.3: 安装额外依赖
```bash
npm install echarts echarts-for-react three @react-three/fiber @react-three/drei
npm install -D @types/three
```

---

### Phase 3: 创建数据库

#### 步骤3.1: 注册数据库服务
1. **Neon** (推荐): https://neon.tech
   - 注册账号
   - 创建项目
   - 复制连接串 (DATABASE_URL)

2. **Supabase** (备选): https://supabase.com
   - 注册账号
   - 创建项目
   - 获取连接串

#### 步骤3.2: 配置Prisma
```bash
npm install -D prisma
npm install @prisma/client
npx prisma init
```

编辑 `.env`:
```
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
```

编辑 `prisma/schema.prisma`（见上方数据库设计）

#### 步骤3.3: 执行迁移
```bash
npx prisma migrate dev --name init
npx prisma generate
```

---

### Phase 4: 创建API路由

#### 示例：轮毂数据API (`app/api/wheels/route.ts`)
- GET: 列表查询（分页、筛选）
- POST: 创建记录

#### 示例：统计数据API (`app/api/statistics/route.ts`)
- 从数据库聚合查询
- 返回JSON格式

---

### Phase 5: 创建React组件

#### 5.1 布局组件
- `app/components/Layout/Header.tsx`: 导航栏
- `app/components/Layout/Navigation.tsx`: 导航按钮组

#### 5.2 页面组件
- `app/page.tsx`: 主页（项目介绍）
- `app/visualize/page.tsx`: 可视化平台
- `app/monitor/page.tsx`: 实时监控
- `app/digital-twin/page.tsx`: 数字孪生

#### 5.3 业务组件
- 图表组件（ECharts包装）
- 3D模型组件（Three.js包装）
- 数据表格组件

---

### Phase 6: 集成第三方库

#### 6.1 ECharts集成
- 使用 `echarts-for-react`
- 创建通用图表组件

#### 6.2 Three.js集成
- 使用 `@react-three/fiber`
- 封装模型查看器组件

#### 6.3 实时数据
- 可选：WebSocket (Socket.io)
- 或：Server-Sent Events (SSE)
- 或：轮询（简单方案）

---

### Phase 7: 美化UI

#### 7.1 使用Tailwind重构样式
- 渐变背景
- 卡片样式
- 按钮交互
- 响应式布局

#### 7.2 添加动画
- 页面过渡
- 图表加载动画
- 悬浮效果

---

### Phase 8: 部署准备

#### 8.1 创建GitHub仓库
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/你的用户名/wheel-detection-platform.git
git push -u origin main
```

#### 8.2 创建 `.env.example`
```
DATABASE_URL=your_database_url_here
NEXT_PUBLIC_API_URL=
```

#### 8.3 配置 `next.config.js`
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [],
  },
  // 确保大文件（模型）可以加载
  experimental: {
    serverComponentsExternalPackages: ['three', '@react-three/fiber'],
  },
}

module.exports = nextConfig
```

---

### Phase 9: Vercel部署

#### 步骤9.1: 连接GitHub
1. 登录 https://vercel.com
2. 点击 "New Project"
3. 选择你的 GitHub 仓库
4. Vercel 自动检测 Next.js

#### 步骤9.2: 配置环境变量
在 Vercel 项目设置中：
- `DATABASE_URL`: 填入数据库连接串
- 其他需要的环境变量

#### 步骤9.3: 部署
- 点击 "Deploy"
- 等待构建完成（3-5分钟）
- 获得预览URL: `https://your-project.vercel.app`

#### 步骤9.4: 绑定域名
1. 在 Vercel → Domains
2. 输入你的域名
3. 按提示在域名DNS中添加CNAME记录
4. 等待SSL证书自动配置（通常几分钟）

---

## 🔐 安全注意事项

1. **环境变量**: 永远不要提交 `.env` 到Git
2. **API验证**: 添加API密钥或JWT认证（如需要）
3. **SQL注入**: Prisma已处理，但自定义查询需注意
4. **CORS**: Next.js自动处理，但部署时检查
5. **速率限制**: 考虑添加API限流（Vercel Edge Config）

---

## 📊 性能优化清单

- [ ] 图片使用 `next/image`
- [ ] 3D模型懒加载
- [ ] 图表数据虚拟滚动（如列表很长）
- [ ] API响应缓存（Next.js内置）
- [ ] 静态页面生成（ISR）
- [ ] CDN加速（Vercel自动）

---

## 🧪 测试建议

### 基础测试
- [ ] 所有页面可访问
- [ ] 数据展示正确
- [ ] 表单提交成功
- [ ] 移动端布局正常
- [ ] 图表渲染正确
- [ ] 3D模型加载正常

### 性能测试
- [ ] Lighthouse评分 > 80
- [ ] 首屏加载 < 3秒
- [ ] API响应 < 500ms

---

## 📝 后续扩展（可选）

1. **用户认证**: NextAuth.js（如需要登录）
2. **实时通知**: WebSocket + 推送通知
3. **数据导出**: Excel/PDF导出功能
4. **历史记录**: 数据归档和查询
5. **多语言**: i18n支持
6. **暗色模式**: 主题切换

---

## 🆘 常见问题

### Q: 数据库连接失败？
A: 检查 `.env` 中的 `DATABASE_URL` 是否正确，是否启用了SSL。

### Q: 3D模型加载失败？
A: 确保模型文件在 `public/models/`，路径正确，Draco解码器配置正确。

### Q: 部署后图片不显示？
A: 检查图片路径（Next.js需要 `/images/xxx.png`），使用 `next/image` 组件。

### Q: API返回404？
A: 确认API路由文件路径正确，Next.js App Router要求 `route.ts` 在 `api/` 目录下。

---

## 📞 需要帮助？

如果在实施过程中遇到问题，随时告诉我：
1. 错误信息
2. 你执行的步骤
3. 预期结果 vs 实际结果

我会帮你一步步解决。

---

## ✅ 实施检查清单

### 本地开发
- [ ] Node.js安装完成
- [ ] Next.js项目创建成功
- [ ] 静态资源迁移完成
- [ ] 数据库连接成功
- [ ] API路由测试通过
- [ ] 前端页面展示正常
- [ ] 图表和3D模型正常工作

### 部署上线
- [ ] 代码推送到GitHub
- [ ] Vercel项目创建
- [ ] 环境变量配置
- [ ] 构建成功
- [ ] 域名绑定完成
- [ ] HTTPS证书生效
- [ ] 线上功能测试通过

---

**准备好了吗？让我们开始吧！** 🚀

