"use client";

import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";

const HERO_PARAGRAPHS = [
  "本项目围绕轮毂尺寸、孔位与外观缺陷检测，构建了一套从机械执行、视觉算法、数字孪生到运营看板的一体化工业平台。",
  "我们保留原有检测逻辑与技术底座，在此基础上强化交付表达、管理视角和前后端联动能力，使它更接近可落地的商业化项目形态。",
];

const VALUE_CARDS = [
  { value: "01", title: "一体化工位设计", detail: "对中、夹紧、旋转、翻转整合为单工位执行闭环，缩短切换链路。" },
  { value: "02", title: "视觉算法链路", detail: "从边缘识别到尺寸测量形成标准化流程，便于后续接入 AI 分割模型。" },
  { value: "03", title: "运营级看板", detail: "不仅展示检测结果，也展示设备状态、告警闭环和数字孪生映射。" },
];

const FEATURE_CARDS = [
  {
    title: "单工位模块化设备",
    body: "对中、夹紧、旋转与翻转动作统一编排，便于形成稳定节拍与标准接口。",
    image: "/images/innovation/center-clamp.png",
    tag: "机械设计",
  },
  {
    title: "侧向夹持与传感协同",
    body: "侧面夹具与检测传感器同步布局，在有限空间里兼顾推力、精度与维护便利性。",
    image: "/images/innovation/side-module.png",
    tag: "执行机构",
  },
  {
    title: "机器视觉检测链路",
    body: "围绕灰度化、阈值、边缘与尺寸测量建立完整的视觉处理路径，为复杂场景升级预留接口。",
    image: "/images/innovation/vision-inspection.png",
    tag: "算法能力",
  },
  {
    title: "PLC 与控制台方案",
    body: "以 PLC、触摸屏与执行单元的协同控制为核心，强调安全互锁、可维护性和远程监控能力。",
    image: "/images/innovation/plc-solution.png",
    tag: "控制系统",
  },
];

const TIMELINE = [
  { title: "机械结构定型", text: "完成 3D 建模、关键参数定义与治具动作关系确认。" },
  { title: "视觉检测流程", text: "建立尺寸测量与缺陷检测的核心算法处理路径。" },
  { title: "数字孪生映射", text: "把 3D 模型、设备工况和工艺步骤映射到可视化界面。" },
  { title: "运营与交付包装", text: "形成适合展示、汇报和落地扩展的商业化平台形态。" },
];

export default function HomeIntro() {
  return (
    <div className="page-shell innovation-shell pt-0 pb-10">
      <BackButton fallbackHref="/visualize" />

      <section className="innovation-hero">
        <div className="innovation-copy">
          <span className="eyebrow">Innovation Showcase / Product Story</span>
          <h1>创新特色</h1>
          {HERO_PARAGRAPHS.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <div className="innovation-stat-grid">
            {VALUE_CARDS.map((item) => (
              <div key={item.title} className="innovation-stat-card">
                <span>{item.value}</span>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="innovation-roadmap-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Solution Roadmap</span>
              <h2>技术方案总览</h2>
            </div>
          </div>
          <div className="innovation-roadmap-media">
            <img src="/images/technical-solution-roadmap.png" alt="技术方案总览" className="media-contain" />
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-7 innovation-purpose-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Research Purpose</span>
              <h2>研究目的与行业价值</h2>
            </div>
          </div>
          <div className="innovation-purpose-layout">
            <div className="innovation-purpose-text">
              <p>随着汽车制造对效率、精度和追溯能力提出更高要求，轮毂检测已不再只是单点测量，而是需要同时具备数据联动、设备可视化与质量管理能力。</p>
              <p>本平台希望解决“设备、算法、数据、管理”之间长期割裂的问题，让检测流程不仅能运行，还能被看见、被度量、被复盘。</p>
            </div>
            <div className="innovation-purpose-media">
              <img src="/images/wheel-manufacturing-trends-overview.png" alt="轮毂制造发展趋势" className="media-contain" />
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-5 innovation-highlights-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Why It Matters</span>
              <h2>平台优势</h2>
            </div>
          </div>
          <div className="innovation-highlight-list">
            <div>
              <strong>卡片化交互</strong>
              <p>大字号、清晰区块和统一卡片风格，适合演示和汇报场景。</p>
            </div>
            <div>
              <strong>前后端互通</strong>
              <p>前端已可直连 Spring Boot 后端，同时保留 Next API 兜底能力。</p>
            </div>
            <div>
              <strong>后续可扩展</strong>
              <p>便于继续接真实数据库、设备接口、用户鉴权和导入流程。</p>
            </div>
          </div>
        </Card>
      </section>

      <section className="innovation-feature-grid">
        {FEATURE_CARDS.map((card) => (
          <Card key={card.title} className="innovation-feature-card">
            <span className="innovation-feature-tag">{card.tag}</span>
            <div className="innovation-feature-image">
              <img src={card.image} alt={card.title} />
            </div>
            <h3>{card.title}</h3>
            <p>{card.body}</p>
          </Card>
        ))}
      </section>

      <Card className="innovation-timeline-card">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Delivery Journey</span>
            <h2>从装备设计到平台落地</h2>
          </div>
        </div>
        <div className="innovation-timeline">
          {TIMELINE.map((item, index) => (
            <div key={item.title} className="innovation-timeline-item">
              <div className="innovation-timeline-index">{String(index + 1).padStart(2, "0")}</div>
              <div>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
