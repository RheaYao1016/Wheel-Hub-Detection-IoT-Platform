# 更精巧的工业表面缺陷智能检测系统

**More Exquisite Industrial Surface Defect Intelligent Detection System**

面向轮毂制造场景的工业表面缺陷智能检测平台，集机械执行、视觉检测、数据分析、3D 数字孪生、AI 辅助研判、YOLO 模型训练、标注工坊、报表导出与运营驾驶舱于一体，构建从“数据采集 - 智能标注 - 模型训练 - 缺陷检测 - 质量分析 - 报表归档”的完整工业质检闭环。

## 项目亮点

- **检测闭环完整**：覆盖图像采集、数据导入、缺陷标注、YOLO 训练、检测分析、报告导出等关键流程。
- **3D 数字孪生**：基于 Three.js 构建轮毂三维可视化场景，支持模型交互与缺陷信息展示。
- **AI 辅助分析**：可接入 OpenAI / Azure OpenAI / LM Studio / Ollama 等兼容接口，用于质量分析、报告撰写和训练建议。
- **YOLO 训练工作流**：支持从标注数据集生成 YOLO 数据、配置训练任务、管理训练产物与模型版本。
- **企业级三层架构**：前端 Next.js，业务后端 Spring Boot，AI/ML 服务 FastAPI，结构清晰，便于扩展。
- **多角色权限管控**：支持管理员、工程师、操作员、观察者四类角色，适配真实工业平台使用场景。
- **可视化运营驾驶舱**：提供检测量、合格率、缺陷分布、设备状态、告警记录等质量管理指标。

## 系统架构

```mermaid
flowchart TD
    A[工业相机 / 检测设备 / 图像数据] --> B[前端 Web 平台 Next.js]
    B --> C[Spring Boot 企业后端]
    C --> D[JSON / PostgreSQL 数据存储]
    C --> E[FastAPI AI/ML 服务]
    E --> F[AI 助手分析]
    E --> G[YOLO 模型训练]
    E --> H[报表生成]
    C --> I[数据中心 / 运营中心 / 管理后台]
    B --> J[3D 数字孪生可视化]
```

## 核心功能

| 模块 | 功能说明 |
| --- | --- |
| 工作台 Workspace | 展示检测总览、合格率趋势、设备状态、告警列表等核心指标 |
| 数据可视化 Visualize | 展示日度检测量、合格率、型号尺寸分布、Top 缺陷类型排名 |
| 实时监控 Monitor | 展示多路视频流、设备在线状态、工位状态和异常告警 |
| 数字孪生 Digital Twin | 展示轮毂 3D 模型、缺陷空间标注、型号与尺寸数据叠加 |
| AI 助手 AI Assistant | 提供质量运维简报、报告撰写、训练顾问等智能分析能力 |
| 数据中心 Data Hub | 管理数据源、导入 CSV/XLSX、查看导入历史与日志 |
| 标注工坊 Annotation | 创建标注项目、上传图像、绘制边界框、导出 YOLO 数据集 |
| 模型训练 Training | 创建 YOLO 训练任务，配置 epochs、batch size、设备等参数 |
| 报表中心 Reports | 自动生成质量诊断报告，支持 CSV / XLSX / DOCX 导出 |
| 运营中心 Operations | 统计工艺流程、设备效率、检测吞吐量等运营指标 |
| 平台配置 Platform Config | 管理 AI Provider、数据源绑定和平台运行参数 |
| 管理后台 Admin | 管理轮毂记录、检测记录、告警规则、导入历史和存储空间 |

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | Next.js 14、React 18、TypeScript、Tailwind CSS |
| UI 与状态 | Radix UI、Zustand、i18next |
| 可视化 | ECharts、Three.js、React Three Fiber |
| 企业后端 | Spring Boot 3、Java 17、Maven |
| AI/ML 服务 | FastAPI、Python、Uvicorn、Pandas |
| 目标检测 | Ultralytics YOLO / YOLOv10 |
| 数据库 | PostgreSQL、Prisma |
| 存储 | JSON Storage、文件工作区、训练产物目录 |
| 部署 | Vercel、Netlify、自托管、Docker |

## 快速启动

### Windows 一键启动

```bash
cd code
start-platform-lite.bat
```

脚本会自动完成：

- 端口探测
- 数据目录创建
- 前端依赖检测
- FastAPI AI/ML 服务启动
- Spring Boot 后端启动
- Next.js 前端启动
- 浏览器自动打开系统首页

### 分服务启动

```bash
# 启动前端
start-frontend.bat

# 启动后端
start-backend.bat

# 启动 AI/ML 服务
start-ai-ml.bat
```

### 手动启动

启动 AI/ML 服务：

```bash
cd code/services/ai-ml
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 18100 --reload
```

启动 Spring Boot 后端：

```bash
cd code/backend
mvnw.cmd spring-boot:run
```

启动 Next.js 前端：

```bash
cd code
npm install
npm run dev
```

访问地址：

```text
http://localhost:3000
```

## 环境要求

| 环境 | 版本要求 |
| --- | --- |
| Node.js | >= 20 |
| npm | >= 10 |
| Java JDK | >= 17 |
| Maven | 3.8+ |
| Python | >= 3.10 |
| PostgreSQL | 14+ |
| CUDA | 可选，用于 GPU 训练 |

## 环境变量

| 变量名 | 说明 |
| --- | --- |
| `DATABASE_URL` | PostgreSQL 数据库连接字符串 |
| `NEXT_PUBLIC_API_BASE_URL` | 前端访问 Spring Boot 后端的 API 地址 |
| `APP_AI_ML_BASE_URL` | 后端访问 FastAPI AI/ML 服务的地址 |
| `APP_DATA_HOME` | 上传文件、报表和训练产物存储目录 |
| `APP_SECURITY_SECRET` | AI Provider API Key 加密密钥 |
| `SERVER_PORT` | Spring Boot 服务端口 |
| `APP_CORS_ALLOWED_ORIGINS` | 跨域访问白名单 |
| `APP_AUTH_SESSION_HOURS` | 用户会话有效时间 |

示例：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/wheel_hub_detection"
NEXT_PUBLIC_API_BASE_URL="http://localhost:18081/api"
APP_AI_ML_BASE_URL="http://localhost:18100"
APP_DATA_HOME="./backend/data"
APP_SECURITY_SECRET="replace-with-a-secure-secret"
```

## YOLO 训练流程

1. 进入标注工坊，创建标注项目。
2. 上传轮毂图像，并划分 train / val / test 数据集。
3. 使用边界框工具标注缺陷区域。
4. 导出 YOLO 格式数据集，生成 `dataset.yaml`。
5. 进入模型训练模块，选择数据集与预训练模型。
6. 配置训练参数，如 epochs、batch size、训练设备。
7. 启动训练任务并监控进度。
8. 训练完成后生成 `best.pt`、`results.csv`、`confusion_matrix.png` 等产物。
9. 系统自动注册模型版本，用于后续检测任务。

## 多角色权限

| 角色 | 标识 | 权限范围 |
| --- | --- | --- |
| 管理员 | admin | 全部功能，包括管理后台、平台配置、用户管理、数据导入和系统日志 |
| 工程师 | engineer | 检测流程配置、训练任务管理、数据源管理、平台参数调整 |
| 操作员 | operator | 日常检测、图像标注、报表生成、AI 助手使用 |
| 观察者 | viewer | 只读访问数据可视化、实时监控、数字孪生和报表 |

## 项目价值

本系统面向工业智能制造中的质量检测环节，将传统人工质检升级为数据驱动、模型驱动和平台化管理的智能检测流程。系统既能作为工业 AI 质检平台原型，也能作为机器视觉、物联网、数字孪生和智能制造方向的综合实践项目。

## 适用场景

- 轮毂表面缺陷检测
- 金属零部件质量检测
- 工业相机检测数据管理
- AI 视觉检测平台原型
- 智能制造课程设计
- 计算机设计大赛作品展示
- 工业物联网可视化管理系统

## 项目信息

| 项目 | 内容 |
| --- | --- |
| 中文名称 | 更精巧的工业表面缺陷智能检测系统 |
| 英文名称 | More Exquisite Industrial Surface Defect Intelligent Detection System |
| 项目类型 | 工业 AI 质检平台 / 物联网 Web 管理平台 |
| 版本 | v2.2.0 |
| 开发团队 | RheaYao |
| License | MIT |

## License

MIT
