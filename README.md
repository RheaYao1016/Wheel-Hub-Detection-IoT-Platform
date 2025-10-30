# 轮毂检测物联网平台

基于 Next.js 的全栈物联网监控平台，用于轮毂检测数据可视化和管理。

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置数据库

1. 注册 [Neon](https://neon.tech) 或 [Supabase](https://supabase.com)
2. 创建数据库项目，获取连接串
3. 创建 `.env` 文件：

```env
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
```

### 3. 初始化数据库

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. 复制静态资源

- 将 `img/` 文件夹复制到 `public/images/`
- 将 `1.glb` 和 `*.hdr` 文件复制到 `public/models/`
- 将 `draco/` 文件夹复制到 `public/draco/`

### 5. 启动开发服务器

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看应用。

## 📁 项目结构

```
├── app/                    # Next.js App Router
│   ├── api/               # API路由
│   ├── components/        # React组件
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 主页
├── lib/                   # 工具库
├── prisma/                # 数据库模型
├── public/                # 静态资源
└── ...配置文件
```

## 🛠️ 技术栈

- **框架**: Next.js 14 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **数据库**: PostgreSQL (via Prisma)
- **图表**: ECharts
- **3D**: Three.js + React Three Fiber

## 📝 可用脚本

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器
- `npm run lint` - 运行ESLint
- `npm run db:push` - 推送Prisma schema到数据库
- `npm run db:migrate` - 执行数据库迁移
- `npm run db:studio` - 打开Prisma Studio（数据库GUI）

## 🌐 部署

### Vercel（推荐）

1. 推送代码到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量 `DATABASE_URL`
4. 点击部署

### 其他平台

也可以部署到：
- Railway
- Render
- 自有服务器（Docker + Nginx）

## 📚 更多信息

详见 `IMPLEMENTATION_PLAN.md` 和 `STEP_BY_STEP_GUIDE.md`

## 📄 License

MIT

