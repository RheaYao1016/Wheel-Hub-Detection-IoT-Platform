"use client";

import Card from "../components/Layout/Card";

const HERO_COPY = [
  "项目聚焦轮毂尺寸与形状的全流程检测，整合自动上料、精准对中、视觉识别、数据追踪模块。系统采用模块化架构，支持快速切换规格，并通过数字孪生平台展示实时状态、趋势与追溯。",
  "平台采用浅蓝低饱和风格，数据面板与三维模型并列呈现，保证信息密度与可读性，在生产与演示场景中均可稳定运行。"
];

const PURPOSE_COPY =
  "针对轮毂检测流程中效率低、重复判定多、人工依赖等痛点，本项目构建自动化检测与数据驱动的闭环。通过高精度采集、算法判定和边缘协同，将检测结果与产线、仓储、ERP 联动，提升质量保障与安全控制能力。";

const FEATURES = [
  "模块化夹具覆盖多规格轮毂，换型无需停线。",
  "双通道测量单元同步采集径向与孔距，实现秒级判定。",
  "视觉算法融合激光与相机数据，目标误差 ≤ 0.05 mm。",
  "检测结果与仓储、ERP 联动，异常自动流转到责任工位。",
  "边缘推理结合云端分析，支持预测性维护与产能优化。"
];

const FEATURE_IMAGES = [
  { src: "/images/bj-1.png", alt: "夹具模块" },
  { src: "/images/bj-2.png", alt: "通道测量" },
  { src: "/images/bj-3.png", alt: "算法识别" },
  { src: "/images/bj-4.png", alt: "数据联动" }
];

export default function HomeIntro() {
  return (
    <div className="page-shell pt-0 pb-8 space-y-6">
      <Card className="p-6 md:p-8">
        <div className="grid items-center gap-6 md:grid-cols-[minmax(260px,1.1fr)_minmax(320px,0.9fr)]">
          <div className="overflow-hidden rounded-2xl">
            <img
              src="/images/gongchang.png"
              alt="工厂数字化场景"
              className="h-full w-full rounded-2xl object-cover"
            />
          </div>
          <div className="space-y-3 text-[15px] leading-[1.75] text-[rgba(232,243,255,0.9)]">
            <h2 className="text-2xl font-semibold text-white">项目概览</h2>
            {HERO_COPY.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-6 md:p-8">
        <div className="space-y-3 text-[15px] leading-[1.75] text-[rgba(232,243,255,0.9)]">
          <h2 className="text-2xl font-semibold text-white">研究目的</h2>
          <p>{PURPOSE_COPY}</p>
        </div>
      </Card>

      <Card className="p-6 md:p-8">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(320px,1.1fr)_minmax(280px,0.9fr)]">
          <div>
            <h2 className="text-2xl font-semibold text-white">创新特色</h2>
            <ul className="mt-4 space-y-3 text-[15px] leading-[1.75] text-[rgba(232,243,255,0.9)]">
              {FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2 h-2 w-2 rounded-full bg-[#5bbdf7]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            {FEATURE_IMAGES.map((img) => (
              <div key={img.src} className="overflow-hidden rounded-xl border border-[rgba(91,189,247,0.18)] bg-[rgba(91,189,247,0.06)] shadow-[0_16px_28px_rgba(5,31,57,0.45)]">
                <img src={img.src} alt={img.alt} className="h-full w-full rounded-xl object-cover" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
