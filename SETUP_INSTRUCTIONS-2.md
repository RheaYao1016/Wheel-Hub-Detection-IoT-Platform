# 🚀 前端开发与资源组织指引（2025最新版）

---

## 📁 目录与静态资源组织

你的项目资源与目录建议如下（务必与代码结构保持一致！）:

```
public/
├── images/           # 全站图片资源（logo, 轮毂svg, 背景, 小图标...）
│   ├── logo.svg
│   ├── wheel-bg.svg
│   ├── bj-1.png
│   ├── bj-2.png
│   ├── TianXiaWuShuang.png
│   └── ...
├── models/           # 3D模型、HDR贴图等
│   ├── 1.glb
│   ├── 20.hdr
├── draco/            # Draco解码器静态资源
│   ├── draco_decoder.js
│   ├── draco_decoder.wasm
│   └── ...
```

- **要求1**：前端所有图片引用都用 `/images/xxxx.xx` 绝对路径，无论页面组件内还是 CSS 背景！
- **要求2**：如有“找不到图片”一定是文件未复制到 `/public/images`
- **建议**：如有常用SVG、LOGO等，用svg格式，页面可自由scale和变色

---

## 💻 页面分布建议（App Router 结构示例）

```
app/
├── page.tsx           # 仪表盘展示页（所有访客可浏览）
├── login/
│   └── page.tsx       # 管理员登录页（玻璃拟态+科技轮毂SVG背景）
├── admin/
│   └── page.tsx       # 管理后台主页（未来保障权限访问）
├── components/
│   ├── Layout/
│   │   ├── Header.tsx
│   │   └── ...
│   ├── Cards/
│   ├── Stats/
│   ├── Charts/
│   └── ...
├── globals.css
```

- 推荐用 Tailwind CSS 进行全站样式开发和主题管理
- 响应式优先（flex/grid + Tailwind breakpoints）

---

## 📊 Mock数据&空接口

- 所有数据先用 mock 数据 json/ts-array 或本地数据结构演示展示/流程
- 可用 `/app/api/xxx/route.ts` 保留API接口mock模拟数据结构，留足后续换DB或REST API的空间
- 静态页面/仪表盘/大屏优先做“UI&交互体验”

---

## ✨ 页面内容及脚手架说明

1. **登录页**：桥接管理员后台和展示页；背景科技轮毂svg，内容居中、玻璃拟态表单。
2. **数字大屏页**：多区块仪表盘、统一蓝黑大气风格、ECharts图表、卡片、总览数字、运行趋势、分区饼图/柱状图等
3. **Header通栏**Logo+主标题+（右上角）管理员入口，响应式收缩，美观易点
4. **优化代码建议**：
   - 全站所有样式优先走 tailwindcss
   - 卡片 all: `rounded-2xl bg-white/12 px-4 py-5 shadow-lg backdrop-blur-lg border border-cyan-100/20`
   - 标题 all: `text-2xl font-extrabold bg-gradient-to-r ...`
5. **ECharts及所有图表**推荐主色系示例：
   ```js
   color: ['#32b6f6', '#67e8f9', '#a5b4fc', '#4fd1c5', '#fcd34d', '#16a34a'],
   ```

---

## 🚦后续：数据库/部署（实施建议）

> 如需与真实数据库（PostgreSQL/Neon等）对接：
> - 保留 API 路由文件及 schema 文件
> - 按需添加表结构和 Prisma 迁移脚本
> - 环境变量数据库地址、部署相关配置

> 部署：
> - 建议Vercel/Netlify一键上线
> - 只需根目录代码+public资源配置合理即可上线

---

## 📝 FAQ/问题自查

- 图片不显示？—— 检查 `public/images/xxx` 是否存在，引用路径 `/images/xxx` 是否一致。
- 3D模型不加载？—— 请将glb/hdr文件复制到 `/public/models/`，路径引用 `/models/xxx`。
- 页面空白或UI错乱？—— 检查 Tailwind 配置或 CSS 类名拼写、有无全局样式遗漏。
- 想后续升级成数据驱动？—— 保留页面/区块数据抽象，API模块接口结构先mock打通即可。

---

## 🚀 结论

只要：
- 目录结构规范（见上）
- 图片和资源借助 `public/images/` 绝对路径引用
- 页面先mock数据、重视觉体验、API接口后续完善
- 代码结构合理即可立刻无障碍继续后端/部署

如需再次规范/美化资源、增加新页面组件、或对接真实RESTful API，随时执行增强！

