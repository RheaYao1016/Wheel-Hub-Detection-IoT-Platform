# 零基础实施指南 - 手把手步骤

## 🎯 开始之前

你已经有了：
- ✅ 静态HTML网站（当前项目）
- ✅ Node.js v22.21.0 （已安装）
- ✅ 项目代码（已有）

你需要做的：
- 📝 按步骤完成改造

---

## 📦 第一步：创建Next.js项目（5分钟）

### 1.1 打开终端（PowerShell）

在项目根目录 `D:\code\document\HTML` 打开终端。

### 1.2 创建Next.js项目

```bash
# 创建项目（在当前目录的上一级，创建新项目文件夹）
cd ..
npx create-next-app@latest wheel-detection-platform --typescript --tailwind --app --no-src-dir --yes
```

**说明**：
- `wheel-detection-platform` 是新项目文件夹名
- `--typescript` 使用TypeScript（推荐）
- `--tailwind` 使用Tailwind CSS（样式框架）
- `--app` 使用App Router（Next.js新架构）
- `--yes` 自动选择默认配置

### 1.3 等待安装完成

这个过程需要2-5分钟，会下载依赖包。

### 1.4 验证安装

```bash
cd wheel-detection-platform
npm run dev
```

打开浏览器访问 `http://localhost:3000`，应该看到Next.js默认页面。

**如果看到页面 = 成功！** ✅

---

## 📁 第二步：复制静态资源（3分钟）

### 2.1 复制文件

将原项目的以下文件/文件夹复制到新项目：

```
旧项目 → 新项目
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
img/          → public/images/
js/echarts.*  → public/js/ (保留，或通过npm安装)
1.glb         → public/models/1.glb
*.hdr         → public/models/*.hdr
draco/        → public/draco/
```

**手动操作**：
1. 在文件管理器中复制 `img` 文件夹
2. 粘贴到 `wheel-detection-platform/public/images/`
3. 创建 `public/models/` 文件夹，复制 `1.glb` 和 `*.hdr` 文件
4. 复制 `draco/` 文件夹到 `public/draco/`

---

## 💾 第三步：设置数据库（10分钟）

### 3.1 注册Neon账号

1. 访问 https://neon.tech
2. 点击 "Sign up" 注册（可用GitHub账号）
3. 登录后，点击 "Create a project"
4. 输入项目名（如 `wheel-detection`）
5. 选择区域（选离你最近的，如 `Singapore`）
6. 点击 "Create project"

### 3.2 获取数据库连接串

1. 创建完成后，会看到 "Connection string"
2. 点击复制，格式类似：
   ```
   postgresql://user:password@host.neon.tech/dbname?sslmode=require
   ```
3. **保存好这个连接串，下一步要用！**

### 3.3 安装Prisma

在项目目录执行：

```bash
npm install prisma @prisma/client
npx prisma init
```

这会创建 `prisma/schema.prisma` 和 `.env` 文件。

### 3.4 配置数据库

1. 打开 `.env` 文件
2. 找到 `DATABASE_URL=`
3. 替换为你从Neon复制的连接串，例如：
   ```
   DATABASE_URL="postgresql://user:password@host.neon.tech/dbname?sslmode=require"
   ```
   **注意**：连接串要用引号包起来！

### 3.5 定义数据模型

编辑 `prisma/schema.prisma`，我会帮你创建完整的schema（见后续步骤）。

### 3.6 创建数据库表

```bash
npx prisma migrate dev --name init
npx prisma generate
```

**看到 "Migration applied" = 成功！** ✅

---

## 🔧 第四步：安装额外依赖（2分钟）

```bash
npm install echarts echarts-for-react three @react-three/fiber @react-three/drei zustand axios date-fns
npm install -D @types/three
```

---

## 📝 第五步：创建项目结构（我会帮你做）

我会帮你创建：
- ✅ 数据库模型（Prisma schema）
- ✅ API路由
- ✅ React组件
- ✅ 页面文件

---

## 🚀 第六步：测试本地运行（5分钟）

```bash
npm run dev
```

访问 `http://localhost:3000`，应该能看到你的网站。

---

## 📤 第七步：推送到GitHub（5分钟）

### 7.1 创建GitHub仓库

1. 访问 https://github.com
2. 点击右上角 "+" → "New repository"
3. 输入仓库名（如 `wheel-detection-platform`）
4. 选择 "Public" 或 "Private"
5. **不要勾选** "Add a README file"（因为已有代码）
6. 点击 "Create repository"

### 7.2 推送代码

```bash
# 初始化Git（如果还没做）
git init

# 创建 .gitignore（如果还没有）
# 确保包含：node_modules, .next, .env

# 添加文件
git add .

# 提交
git commit -m "Initial commit: Wheel detection platform"

# 连接远程仓库（替换成你的仓库地址）
git remote add origin https://github.com/你的用户名/wheel-detection-platform.git

# 推送
git branch -M main
git push -u origin main
```

---

## 🌐 第八步：部署到Vercel（5分钟）

### 8.1 注册Vercel

1. 访问 https://vercel.com
2. 点击 "Sign up"，选择 "Continue with GitHub"
3. 授权GitHub访问

### 8.2 部署项目

1. 登录后，点击 "Add New..." → "Project"
2. 找到你的 `wheel-detection-platform` 仓库
3. 点击 "Import"

### 8.3 配置环境变量

在 "Environment Variables" 部分：
- 名称：`DATABASE_URL`
- 值：你从Neon复制的连接串
- 点击 "Add"

### 8.4 开始部署

1. 点击 "Deploy"
2. 等待3-5分钟（正在构建）
3. 看到 "Congratulations!" 说明部署成功！
4. 点击提供的链接（如 `https://wheel-detection-platform.vercel.app`）查看网站

---

## 🔗 第九步：绑定域名（可选，10分钟）

### 9.1 购买域名

推荐：
- **Namecheap** (https://www.namecheap.com) - 国外，便宜
- **阿里云** (https://wanwang.aliyun.com) - 国内，需实名
- **GoDaddy** (https://www.godaddy.com) - 国外，知名

### 9.2 在Vercel绑定

1. 在Vercel项目页面，点击 "Settings" → "Domains"
2. 输入你的域名（如 `wheeldetection.com`）
3. 点击 "Add"
4. 会显示需要添加的DNS记录

### 9.3 配置DNS

1. 登录你的域名注册商（如Namecheap）
2. 找到DNS设置 / Advanced DNS
3. 添加CNAME记录：
   - **Host**: `@` 或 `www`
   - **Value**: Vercel显示的CNAME值（如 `cname.vercel-dns.com`）
   - **TTL**: `Automatic` 或 `300`
4. 保存，等待几分钟生效

### 9.4 验证

访问你的域名，应该能看到网站。

---

## ✅ 完成检查清单

完成每一步后，在这里打勾：

- [ ] 第一步：Next.js项目创建成功，`npm run dev` 能看到默认页面
- [ ] 第二步：静态资源复制完成，文件在 `public/` 目录
- [ ] 第三步：数据库注册成功，连接串保存，Prisma迁移完成
- [ ] 第四步：依赖安装完成
- [ ] 第五步：项目结构创建完成（我会帮你）
- [ ] 第六步：本地运行测试通过
- [ ] 第七步：代码推送到GitHub
- [ ] 第八步：Vercel部署成功，可以访问
- [ ] 第九步：（可选）域名绑定成功

---

## 🆘 遇到问题？

### 问题1: `npm run dev` 报错

**可能原因**：
- Node.js版本不对（需要v18+）
- 依赖安装失败

**解决**：
```bash
# 删除 node_modules 和 package-lock.json
rm -r node_modules package-lock.json

# 重新安装
npm install

# 再试
npm run dev
```

### 问题2: 数据库连接失败

**检查**：
1. `.env` 文件中的 `DATABASE_URL` 是否正确
2. 连接串是否用引号包起来
3. Neon项目是否还激活（没有暂停）

**解决**：
- 重新从Neon复制连接串
- 确保连接串格式正确

### 问题3: Vercel部署失败

**检查**：
1. 构建日志中的错误信息
2. 环境变量是否配置正确
3. `package.json` 中是否有 `build` 脚本

**解决**：
- 查看Vercel的构建日志，定位错误
- 确保所有依赖都在 `package.json` 中

---

## 📚 下一步

完成基础部署后，你可以：
1. 继续美化UI
2. 添加更多功能
3. 优化性能
4. 添加用户认证（如需要）

**准备好了吗？我们从第一步开始！** 🚀

