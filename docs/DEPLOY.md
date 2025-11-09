# 部署与数据库配置指南

本指南面向需要将“轮毂检测物联网平台”上线至 Vercel / 其他平台的开发者，涵盖数据库准备、环境变量设置、部署步骤与常见问题。

## 1. 前置要求
- Node.js ≥ 20，npm ≥ 10。
- 可访问的 PostgreSQL（推荐 [Neon](https://neon.tech) 或 [Supabase](https://supabase.com)）。
- GitHub/GitLab 仓库：用于托管源码及触发 Vercel 自动部署。

## 2. 创建数据库（Neon 示例）
1. 注册并登录 Neon → `Create Project`。
2. 选择最近的区域，完成向导后复制 `Connection string`。
3. 在项目根目录创建 `.env`，写入：
   ```env
   DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
   ```
4. 运行 Prisma 迁移：
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```
5. （可选）执行 `npm run db:studio` 打开 Prisma Studio 验证表结构。

> 如使用自托管 PostgreSQL，请确保开启 SSL 或在连接串尾部显式关闭（`?sslmode=disable`）。

## 3. 本地校验
1. 复制静态资源：`img/ → public/images/`、`draco/ → public/draco/`、`*.glb/*.hdr → public/models/`。
2. 执行 `npm run dev`，访问 `http://localhost:3000`。
3. 走一遍数据导入流程，确认历史记录列表可刷新、新日志可下载。

## 4. 推送与 Vercel 部署
1. 将本地代码提交并推送到 GitHub。
2. 登录 [Vercel](https://vercel.com) → `Add New...` → `Project` → 选择仓库。
3. Build 设置保持默认（Framework: **Next.js**）。
4. 在 `Environment Variables` 中添加 `DATABASE_URL`（Production + Preview）。
5. 点击 `Deploy`，等待构建完成。
6. 首次部署后，访问生成的域名验证页面：
   - `/visualize`：检查合格率环形图摘要与滚动是否正常；
   - `/admin/data-import`：执行一次导入，确认历史记录刷新。

## 5. 其他平台（Railway / Render / 自托管）
- 使用 `npm run build && npm run start` 作为启动命令。
- 提前在平台侧配置 `DATABASE_URL` 与 `NODE_ENV=production`。
- 若通过 Docker，自行添加多阶段构建（依赖 `node:20-alpine` + `pnpm`/`npm`）。

## 6. 常见问题排查
| 现象 | 可能原因 | 解决方案 |
| --- | --- | --- |
| Vercel 构建失败，提示无法连接数据库 | 未在项目设置中配置 `DATABASE_URL` | 在 Vercel → Settings → Environment Variables 中新增该变量并重新部署。 |
| Prisma 迁移报错 `certificate verify failed` | 自托管数据库未启用 SSL | 在连接串末尾添加 `?sslmode=disable` 或配置正确证书。 |
| 页面加载慢、滚动闪动 | 静态资源未复制或被 CDN 缓存旧文件 | 确保 `public/images/*` 完整，必要时触发 Vercel `Redeploy`。 |
| 数据导入后历史表为空 | 仍在使用旧 mock API | 确保部署的是当前分支（包含 `/api/imports` 新逻辑），或清理浏览器缓存。 |

## 7. 部署完成后的建议
- 打开 `/login`，以管理员身份进入 `/admin`，再访问 `/admin/data-import` 进行一次真实导入验证。
- 在数据库中创建最少一条轮毂数据，保证 `/monitor`、`/digital-twin` 的统计不会为空。
- 如需正式鉴权，可在部署完成后接入 NextAuth / 自有 SSO，然后再触发一次迁移。

> 文档若需扩展（例如多环境部署策略、CI/CD 集成），可直接在本文件追加章节，README 将保持精炼。
