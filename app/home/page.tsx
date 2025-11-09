"use client";

import Card from "../components/Layout/Card";
import BackButton from "../components/Layout/BackButton";

const HERO_PARAGRAPHS = [
  "本项目面向轮毂尺寸与形状的在线自动化检测，设计一套多功能一体化装置与配套的视觉算法与可视化平台。我们先明确生产线上轮毂检测的标准流程，再为各功能模块设计对应的机构与动作；在多套可行方案中进行对比分析，择优确定最终机构方案。",
  "在机械侧，使用 SolidWorks 完成三维建模与关键参数确定，并选型驱动与执行单元；在算法侧，围绕尺寸识别开发处理流程，形成与不同检测模块相匹配的程序方案；在平台侧，构建 Web 可视化把检测过程与结果直观呈现，形成一套从机械到算法、从数据到可视化的完整闭环。"
];

const PURPOSE_PARAGRAPHS = [
  "随着国内汽车保有量快速增长，制造端对效率与精度的要求持续提升。为满足国家安全标准，轮毅等关键部件需进行严格的尺寸与性能质量控制。轮毅直接影响车辆的转向、驱动与制动安全，也与轮胎寿命密切相关，因此几何尺寸精度成为检测重点。",
  "当前行业普遍存在以人工或单一参数检测为主的问题，效率、稳定性与一致性难兼顾。我们提出基于机器视觉的轮毅尺寸与形状一体化检测方案，以模块化机械与视觉算法协同，统一多尺寸、多姿态的检测流程，补齐工业场景的一体化空缺。",
  "同时，国内外诸多学者与企业持续通过改进检测流程与采用更先进的检测原理以提升轮毅检测的准确性与可靠性。在结构与工艺方面，国内与国外先进技术仍存在差距。国外汽车配件企业已广泛采用激光传感器并配合全自动控制完成轮毅检测；而国内设备多以半自动为主，人工参与度高，检测往往聚焦单一参量，精度与效率受限。因此，研发单工位式轮毅集成化 AI 视觉同步检测设备具有重要意义，可同时识别轮毅关键尺寸并发现表面缺陷，进一步提升轮毅生产的精确性与一致性。"
];

const INNOVATION_POINTS = [
  {
    title: "单工位模块化",
    body: "对中、夹紧、旋转、翻转集成于单工位，节拍稳定、切换便捷；检测结果直达后台判定并联动流转。"
  },
  {
    title: "中心夹具模块",
    body: "升降 + 中心夹紧 + 旋转三机构协同，保证同轴度与圆跳动检测的稳定性与精度。"
  },
  {
    title: "侧面夹具模块",
    body: "伸出 / 夹紧 / 抬升 / 放回流程一体，采用滚珠丝杠与近似直线机构布局，节省空间并兼顾推力与成本。"
  },
  {
    title: "视觉尺寸检测",
    body: "灰度化 → 滤波 → 阈值 → 边缘与尺寸测量的处理链路，预留引入深度学习分割以提升复杂场景鲁棒性。"
  },
  {
    title: "可视化平台",
    body: "前端 HTML/CSS/JS 联动后端服务与 ECharts，在线呈现运行状态、检测数量、合格率与预警。"
  },
  {
    title: "PLC 控制方案",
    body: "S7-1200 协同触摸屏与传感执行单元，提供安全互锁与远程监控能力，确保装置运行的实时性与可重复性。"
  }
];

const FEATURE_IMAGES = [
  { src: "/images/innovation/center-clamp.png", alt: "中心夹具模块" },
  { src: "/images/innovation/side-module.png", alt: "侧面夹具与传感器" },
  { src: "/images/innovation/vision-inspection.png", alt: "视觉检测工作站" },
  { src: "/images/innovation/plc-solution.png", alt: "PLC 控制与触控台" }
];

export default function HomeIntro() {
  return (
    <div className="page-shell pt-0 pb-10 space-y-6">
      <BackButton fallbackHref="/visualize" />
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-secondary)]">项目概览 / 创新特色</span>
          <h1 className="text-2xl font-semibold text-white md:text-3xl">创新特色</h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">一体化检测装备 + 数字孪生平台的设计过程与亮点拆解：机械、视觉、平台三线协同，展示六大创新要点。</p>
      </div>

      <Card className="hero-grid">
        <div className="hero-media media-panel">
          <img
            src="/images/technical-solution-roadmap.png"
            alt="Technical Solution Roadmap"
            title="Technical Solution Roadmap"
            className="media-contain"
          />
        </div>
        <div className="hero-text">
          <h2>项目概览</h2>
          {HERO_PARAGRAPHS.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </Card>

      <Card className="purpose two-col">
        <div className="purpose-text">
          <h3>研究目的</h3>
          {PURPOSE_PARAGRAPHS.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="purpose-media media-panel">
          <img
            src="/images/wheel-manufacturing-trends-overview.png"
            alt="Wheel Manufacturing Development Trends Overview"
            title="Wheel Manufacturing Development Trends Overview"
            className="media-contain"
          />
        </div>
      </Card>

      <Card className="features">
        <div className="col-text">
          <h3>创新特色</h3>
          <ul className="bullets">
            {INNOVATION_POINTS.map((point) => (
              <li key={point.title}>
                <b>{point.title}：</b>
                <span>{point.body}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="col-imggrid">
          {FEATURE_IMAGES.map((img) => (
            <img key={img.src} src={img.src} alt={img.alt} />
          ))}
        </div>
      </Card>
    </div>
  );
}
