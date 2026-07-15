# 部署与数据库配置指南

本指南面向需要将"更精巧的工业表面缺陷智能检测系统"上线至 Vercel / 其他平台的开发者，涵盖数据库准备、环境变量设置、部署步骤与常见问题。

## 1. 前置要求
- Node.js ≥ 20，npm ≥ 10。
- Java JDK 17+（后端 Spring Boot）。
- Python 3.11+ 与 `services/ai-ml` 中的依赖（AI/ML 服务）。
- 默认使用内置 SQLite，无需额外数据库；生产环境可切换到 PostgreSQL。

## 2. 默认数据库（SQLite）

当前 `prisma/schema.prisma` 默认使用 SQLite：

```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

对应的本地环境变量：

```env
DATABASE_URL="file:./backend/data/platform.db"
```

SQLite 适合本地开发、演示和轻量部署。首次启动前执行：

```bash
npx prisma generate
npx prisma db push
```

## 3. 生产数据库（PostgreSQL，可选）

如需 PostgreSQL（推荐 Neon 或 Supabase）：

1. 修改 `prisma/schema.prisma`：
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. 在项目根目录创建 `.env`，写入：
   ```env
   DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
   ```
3. 运行 Prisma 迁移：
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```
4. （可选）执行 `npm run db:studio` 打开 Prisma Studio 验证表结构。

> 如使用自托管 PostgreSQL，请确保开启 SSL 或在连接串尾部显式关闭（`?sslmode=disable`）。

## 4. 本地校验

1. 复制静态资源：`img/ → public/images/`、`draco/ → public/draco/`、`*.glb/*.hdr → public/models/`。
2. 启动三个服务：
   - AI/ML：`cd services/ai-ml && uvicorn main:app --host 0.0.0.0 --port 18100`
   - 后端：`cd backend && ./mvnw spring-boot:run`
   - 前端：`npm run build && npm run start -- --port 3001`
3. 访问 `http://localhost:3001`，走一遍数据导入流程，确认历史记录列表可刷新、新日志可下载。

## 5. 推送与 Vercel 部署

1. 将本地代码提交并推送到 GitHub。
2. 登录 [Vercel](https://vercel.com) → `Add New...` → `Project` → 选择仓库。
3. Build 设置保持默认（Framework: **Next.js**）。
4. 在 `Environment Variables` 中添加：
   - `DATABASE_URL`
   - `NEXT_PUBLIC_API_BASE_URL`
   - `APP_AI_ML_BASE_URL`
   - `APP_DATA_HOME`
   - `APP_SECURITY_SECRET`
   - `APP_DEMO_ENABLED`
5. 点击 `Deploy`，等待构建完成。
6. 首次部署后，访问生成的域名验证页面：
   - `/visualize`：检查合格率环形图摘要与滚动是否正常；
   - `/admin/data-import`：执行一次导入，确认历史记录刷新。

## 6. 其他平台（Railway / Render / 自托管）

- 使用 `npm run build && npm run start -- --port 3001` 作为启动命令。
- 提前在平台侧配置环境变量与 `NODE_ENV=production`。
- 若通过 Docker，自行添加多阶段构建（依赖 `node:20-alpine` + `pnpm`/`npm`）。

## 7. 常见问题排查

| 现象 | 可能原因 | 解决方案 |
| --- | --- | --- |
| Vercel 构建失败，提示无法连接数据库 | 未在项目设置中配置 `DATABASE_URL` | 在 Vercel → Settings → Environment Variables 中新增该变量并重新部署。 |
| Prisma 迁移报错 `certificate verify failed` | 自托管数据库未启用 SSL | 在连接串末尾添加 `?sslmode=disable` 或配置正确证书。 |
| 页面加载慢、滚动闪动 | 静态资源未复制或被 CDN 缓存旧文件 | 确保 `public/images/*` 完整，必要时触发 Vercel `Redeploy`。 |
| 数据导入后历史表为空 | 仍在使用旧 mock API | 确保部署的是当前分支（包含 `/api/imports` 新逻辑），或清理浏览器缓存。 |
| 后端连接 AI/ML 失败 | `localhost` 被解析为 IPv6 | 使用 `127.0.0.1:18100` 作为 `APP_AI_ML_BASE_URL`。 |

## 8. 部署完成后的建议

- 打开 `/login`，以管理员身份进入 `/admin`，再访问 `/admin/data-import` 进行一次真实导入验证。
- 在数据库中创建最少一条轮毂数据，保证 `/monitor`、`/digital-twin` 的统计不会为空。
- 生产环境请将 `APP_SECURITY_SECRET` 设置为强随机字符串，并将 `APP_DEMO_ENABLED` 设为 `false`。

> 文档若需扩展（例如多环境部署策略、CI/CD 集成），可直接在本文件追加章节，README 将保持精炼。
