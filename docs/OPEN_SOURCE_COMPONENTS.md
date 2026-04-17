# 开源代码与组件使用情况说明

## 文档信息

| 项目 | 内容 |
|------|------|
| 项目名称 | 更精巧的工业表面缺陷智能检测系统 |
| 版本号 | v2.2.0 |
| 编制日期 | 2025年4月 |
| 编制单位 | RheaYao |

---

## 一、项目概述

本项目是一套完整的工业表面缺陷智能检测系统，覆盖从机械执行、视觉算法、数字孪生到运营看板的全链路能力。系统采用前后端分离架构，支持多角色权限管理、实时数据监控、AI分析助手等企业级功能。

本项目基于多个开源框架和组件进行开发，本文档详细说明了所使用的开源代码和组件情况。

---

## 二、前端开源组件

### 2.1 核心框架

| 组件名称 | 版本 | 许可证 | 用途说明 | 项目地址 |
|----------|------|--------|----------|----------|
| Next.js | 14.2.0 | MIT | React全栈框架，提供服务端渲染、路由、API等功能 | https://github.com/vercel/next.js |
| React | 18.3.0 | MIT | 用户界面构建库 | https://github.com/facebook/react |
| React DOM | 18.3.0 | MIT | React的DOM渲染器 | https://github.com/facebook/react |
| TypeScript | 5.5.0 | Apache-2.0 | JavaScript的超集，提供类型安全 | https://github.com/microsoft/TypeScript |

### 2.2 UI组件库

| 组件名称 | 版本 | 许可证 | 用途说明 | 项目地址 |
|----------|------|--------|----------|----------|
| Radix UI | 多版本 | MIT | 无障碍UI原语组件库 | https://github.com/radix-ui/primitives |
| └ @radix-ui/react-avatar | 1.1.11 | MIT | 用户头像组件 | https://github.com/radix-ui/primitives |
| └ @radix-ui/react-dialog | 1.1.15 | MIT | 对话框组件 | https://github.com/radix-ui/primitives |
| └ @radix-ui/react-dropdown-menu | 2.1.16 | MIT | 下拉菜单组件 | https://github.com/radix-ui/primitives |
| └ @radix-ui/react-progress | 1.1.8 | MIT | 进度条组件 | https://github.com/radix-ui/primitives |
| └ @radix-ui/react-scroll-area | 1.2.10 | MIT | 滚动区域组件 | https://github.com/radix-ui/primitives |
| └ @radix-ui/react-separator | 1.1.8 | MIT | 分隔线组件 | https://github.com/radix-ui/primitives |
| └ @radix-ui/react-slot | 1.2.4 | MIT | 插槽组件 | https://github.com/radix-ui/primitives |
| └ @radix-ui/react-tabs | 1.1.13 | MIT | 标签页组件 | https://github.com/radix-ui/primitives |
| └ @radix-ui/react-tooltip | 1.2.8 | MIT | 工具提示组件 | https://github.com/radix-ui/primitives |
| Lucide React | 1.7.0 | ISC | 开源图标库 | https://github.com/lucide-icons/lucide |
| Class Variance Authority | 0.7.1 | Apache-2.0 | CSS类变体管理工具 | https://github.com/joe-bell/cva |
| clsx | 2.1.1 | MIT | 条件类名拼接工具 | https://github.com/lukeed/clsx |
| tailwind-merge | 3.5.0 | MIT | Tailwind类名合并工具 | https://github.com/dcastil/tailwind-merge |

### 2.3 样式框架

| 组件名称 | 版本 | 许可证 | 用途说明 | 项目地址 |
|----------|------|--------|----------|----------|
| Tailwind CSS | 3.4.0 | MIT | 原子化CSS框架 | https://github.com/tailwindlabs/tailwindcss |
| PostCSS | 8.4.0 | MIT | CSS转换工具 | https://github.com/postcss/postcss |
| Autoprefixer | 10.4.0 | MIT | CSS自动添加浏览器前缀 | https://github.com/postcss/autoprefixer |

### 2.4 数据可视化

| 组件名称 | 版本 | 许可证 | 用途说明 | 项目地址 |
|----------|------|--------|----------|----------|
| ECharts | 5.5.0 | Apache-2.0 | 百度开源的数据可视化图表库 | https://github.com/apache/echarts |
| echarts-for-react | 3.0.2 | MIT | ECharts的React封装 | https://github.com/hustcc/echarts-for-react |

### 2.5 3D渲染

| 组件名称 | 版本 | 许可证 | 用途说明 | 项目地址 |
|----------|------|--------|----------|----------|
| Three.js | 0.168.0 | MIT | JavaScript 3D渲染库 | https://github.com/mrdoob/three.js |
| @react-three/fiber | 8.16.0 | MIT | Three.js的React渲染器 | https://github.com/pmndrs/react-three-fiber |
| @react-three/drei | 9.105.0 | MIT | React Three Fiber的实用工具集 | https://github.com/pmndrs/drei |

### 2.6 状态管理与工具

| 组件名称 | 版本 | 许可证 | 用途说明 | 项目地址 |
|----------|------|--------|----------|----------|
| Zustand | 4.5.0 | MIT | 轻量级状态管理库 | https://github.com/pmndrs/zustand |
| Axios | 1.7.0 | MIT | HTTP请求库 | https://github.com/axios/axios |
| date-fns | 3.6.0 | MIT | 日期处理工具库 | https://github.com/date-fns/date-fns |
| Motion | 12.38.0 | MIT | 动画库（原Framer Motion） | https://github.com/motiondivision/motion |

### 2.7 数据库工具

| 组件名称 | 版本 | 许可证 | 用途说明 | 项目地址 |
|----------|------|--------|----------|----------|
| Prisma | 5.16.0 | Apache-2.0 | 现代化数据库ORM工具 | https://github.com/prisma/prisma |
| @prisma/client | 5.16.0 | Apache-2.0 | Prisma客户端 | https://github.com/prisma/prisma |

### 2.8 开发工具

| 组件名称 | 版本 | 许可证 | 用途说明 | 项目地址 |
|----------|------|--------|----------|----------|
| ESLint | 8.57.0 | MIT | JavaScript代码检查工具 | https://github.com/eslint/eslint |
| Prettier | 3.3.0 | MIT | 代码格式化工具 | https://github.com/prettier/prettier |
| @types/node | 20.14.0 | MIT | Node.js类型定义 | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @types/react | 18.3.0 | MIT | React类型定义 | https://github.com/DefinitelyTyped/DefinitelyTyped |
| @types/three | 0.168.0 | MIT | Three.js类型定义 | https://github.com/DefinitelyTyped/DefinitelyTyped |

---

## 三、后端开源组件

### 3.1 核心框架

| 组件名称 | 版本 | 许可证 | 用途说明 | 项目地址 |
|----------|------|--------|----------|----------|
| Spring Boot | 3.4.4 | Apache-2.0 | Java企业级应用框架 | https://github.com/spring-projects/spring-boot |
| Spring Web | 3.4.4 | Apache-2.0 | Spring Web MVC模块 | https://github.com/spring-projects/spring-framework |
| Spring Validation | 3.4.4 | Apache-2.0 | 数据验证框架 | https://github.com/spring-projects/spring-framework |

### 3.2 构建工具

| 组件名称 | 版本 | 许可证 | 用途说明 | 项目地址 |
|----------|------|--------|----------|----------|
| Maven | 3.x | Apache-2.0 | Java项目构建管理工具 | https://github.com/apache/maven |

---

## 四、AI/ML服务开源组件

### 4.1 核心框架

| 组件名称 | 版本 | 许可证 | 用途说明 | 项目地址 |
|----------|------|--------|----------|----------|
| Python | 3.11+ | PSF-2.0 | 编程语言运行环境 | https://github.com/python/cpython |
| FastAPI | 0.116.1 | MIT | 现代高性能Web框架 | https://github.com/tiangolo/fastapi |
| Uvicorn | 0.35.0 | BSD-3-Clause | ASGI服务器 | https://github.com/encode/uvicorn |
| Pydantic | 2.11.7 | MIT | 数据验证库 | https://github.com/pydantic/pydantic |

### 4.2 数据处理

| 组件名称 | 版本 | 许可证 | 用途说明 | 项目地址 |
|----------|------|--------|----------|----------|
| Pandas | 2.3.1 | BSD-3-Clause | 数据分析库 | https://github.com/pandas-dev/pandas |
| OpenPyXL | 3.1.5 | MIT | Excel文件处理库 | https://github.com/theorchard/openpyxl |
| python-docx | 1.2.0 | MIT | Word文档处理库 | https://github.com/python-openxml/python-docx |
| httpx | 0.28.1 | BSD-3-Clause | 现代HTTP客户端 | https://github.com/encode/httpx |

### 4.3 机器学习

| 组件名称 | 版本 | 许可证 | 用途说明 | 项目地址 |
|----------|------|--------|----------|----------|
| Ultralytics | 8.3.0+ | AGPL-3.0 | YOLO目标检测框架 | https://github.com/ultralytics/ultralytics |

---

## 五、静态资源

### 5.1 JavaScript库

| 组件名称 | 版本 | 许可证 | 用途说明 | 项目地址 |
|----------|------|--------|----------|----------|
| jQuery | 2.1.1 | MIT | JavaScript工具库 | https://github.com/jquery/jquery |
| ECharts (静态版) | 5.x | Apache-2.0 | 图表库静态资源 | https://github.com/apache/echarts |
| Three.js (静态版) | - | MIT | 3D渲染库静态资源 | https://github.com/mrdoob/three.js |

### 5.2 3D模型格式支持

| 组件名称 | 版本 | 许可证 | 用途说明 | 项目地址 |
|----------|------|--------|----------|----------|
| Draco | - | Apache-2.0 | 3D几何数据压缩库 | https://github.com/google/draco |

---

## 六、开发工具

### 6.1 安装程序

| 组件名称 | 版本 | 许可证 | 用途说明 | 项目地址 |
|----------|------|--------|----------|----------|
| NSIS | 3.x | zlib/libpng | Windows安装程序制作工具 | https://github.com/kichik/nsis |

---

## 七、许可证合规说明

### 7.1 MIT许可证组件

以下组件采用MIT许可证，允许商业使用、修改、分发：
- React、React DOM
- Next.js
- Axios
- Zustand
- clsx、tailwind-merge
- Lucide React
- date-fns
- Motion
- FastAPI
- Pydantic
- jQuery

### 7.2 Apache-2.0许可证组件

以下组件采用Apache-2.0许可证，允许商业使用、修改、分发：
- TypeScript
- Tailwind CSS
- ECharts
- Prisma
- Spring Boot
- Maven
- Draco

### 7.3 AGPL-3.0许可证组件

以下组件采用AGPL-3.0许可证：
- Ultralytics (YOLO)

**重要说明**：AGPL-3.0许可证要求如果通过网络提供服务，必须提供源代码。如需商业闭源使用，请联系Ultralytics获取商业许可。

### 7.4 BSD许可证组件

以下组件采用BSD许可证：
- Uvicorn (BSD-3-Clause)
- Pandas (BSD-3-Clause)
- httpx (BSD-3-Clause)

---

## 八、第三方资源声明

### 8.1 图像资源

项目中使用的图像资源均为原创或合法授权使用：
- 系统Logo：原创设计
- 界面图标：Lucide图标库（ISC许可证）
- 背景图片：原创设计

### 8.2 字体资源

系统默认使用系统字体，未嵌入第三方字体文件。

---

## 九、开源组件使用统计

| 许可证类型 | 组件数量 | 占比 |
|------------|----------|------|
| MIT | 28 | 56% |
| Apache-2.0 | 12 | 24% |
| BSD-3-Clause | 4 | 8% |
| ISC | 2 | 4% |
| AGPL-3.0 | 1 | 2% |
| PSF-2.0 | 1 | 2% |
| zlib/libpng | 1 | 2% |
| 其他 | 1 | 2% |
| **总计** | **50** | **100%** |

---

## 十、联系方式

如有关于开源组件使用的疑问，请联系：

- 项目地址：https://github.com/RheaYao1016/Wheel-Hub-Detection-IoT-Platform
- 问题反馈：https://github.com/RheaYao1016/Wheel-Hub-Detection-IoT-Platform/issues

---

**文档版本**：v1.0  
**最后更新**：2025年4月
