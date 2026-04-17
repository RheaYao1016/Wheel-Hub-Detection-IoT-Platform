"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import WorkflowSteps, {
  type WorkflowStep,
} from "../components/Layout/WorkflowSteps";
import CoreFlowHeader, {
  type CoreFlowMetric,
  type CoreFlowStage,
} from "../components/Layout/CoreFlowHeader";
import { Badge } from "../components/ui/Badge";
import { useLocale } from "../components/Locale/LocaleProvider";

const HERO_PARAGRAPHS_ZH = [
  "本平台将轮毂检测硬件、AI视觉、数字孪生映射和运营治理整合为一个实用的交付方案。",
  "重新设计的UX专注于清晰的演示路径和可用的操作路径：快速解释价值、快速执行决策、可靠地关闭治理。",
];

const HERO_PARAGRAPHS_EN = [
  "This platform links wheel-hub inspection hardware, AI vision, digital-twin mapping, and operation governance into one practical delivery story.",
  "The redesigned UX focuses on a clear demo path and a usable action path: explain value fast, execute decisions quickly, and close governance reliably.",
];

const VALUE_CARDS_ZH = [
  {
    value: "03",
    title: "核心域",
    detail: "指挥中心、监控和数字孪生对齐为一条连续的处理链。",
  },
  {
    value: "12s",
    title: "决策刷新",
    detail: "操作快照按班次级事件处理节奏刷新。",
  },
  {
    value: "4步",
    title: "故事框架",
    detail: "观察、诊断、行动和闭环，适用于演示和日常操作。",
  },
  {
    value: "1条路径",
    title: "行动连续性",
    detail: "每个域页面保持一个角色，减少上下文切换和重复图表。",
  },
];

const VALUE_CARDS_EN = [
  {
    value: "03",
    title: "Core domains",
    detail:
      "Command, Monitor, and Digital Twin are aligned as one continuous process chain.",
  },
  {
    value: "12s",
    title: "Decision refresh",
    detail:
      "Operational snapshots are refreshed for shift-level incident handling rhythm.",
  },
  {
    value: "4-step",
    title: "Story framework",
    detail:
      "Observe, diagnose, act, and close loop for both demo and daily operation.",
  },
  {
    value: "1 route",
    title: "Action continuity",
    detail:
      "Each domain page keeps one role, reducing context switching and duplicate charts.",
  },
];

const MODULE_CARDS_ZH = [
  {
    title: "指挥中心",
    body: "质量组合、吞吐趋势、队列状态和执行日志的高管概览。",
    href: "/visualize",
    tag: "总览",
    image: "/images/technical-solution-roadmap.png",
  },
  {
    title: "现场中台",
    body: "监控和数字孪生域的统一交接页面。",
    href: "/operations",
    tag: "运营",
    image: "/images/innovation/center-clamp.png",
  },
  {
    title: "监控中心",
    body: "相机墙、警报分类队列和前线设备检查，用于快速响应。",
    href: "/monitor",
    tag: "实时",
    image: "/images/innovation/vision-inspection.png",
  },
  {
    title: "数字孪生",
    body: "3D场景诊断、传感器映射、流程解释和设备网格上下文。",
    href: "/digital-twin",
    tag: "孪生",
    image: "/images/innovation/side-module.png",
  },
  {
    title: "AI工作台",
    body: "AI助手、数据中心、报告中心和训练链集成在一个生产力空间。",
    href: "/workspace",
    tag: "AI工作流",
    image: "/images/innovation/plc-solution.png",
  },
  {
    title: "管理治理",
    body: "系统治理、导入质量控制和企业管理级运营策略。",
    href: "/admin",
    tag: "治理",
    image: "/images/wheel-manufacturing-trends-overview.png",
  },
];

const MODULE_CARDS_EN = [
  {
    title: "Command Center",
    body: "Executive overview of quality mix, throughput trend, queue status, and execution logs.",
    href: "/visualize",
    tag: "Overview",
    image: "/images/technical-solution-roadmap.png",
  },
  {
    title: "Operations Hub",
    body: "Unified handoff page to Monitoring and Digital Twin domains.",
    href: "/operations",
    tag: "Operations",
    image: "/images/innovation/center-clamp.png",
  },
  {
    title: "Monitoring Center",
    body: "Camera wall, alert queue triage, and frontline device checks for rapid response.",
    href: "/monitor",
    tag: "Realtime",
    image: "/images/innovation/vision-inspection.png",
  },
  {
    title: "Digital Twin",
    body: "3D scene diagnostics, sensor mapping, process interpretation, and device lattice context.",
    href: "/digital-twin",
    tag: "Twin",
    image: "/images/innovation/side-module.png",
  },
  {
    title: "AI Workspace",
    body: "AI assistant, data hub, report center, and training chain in one productivity space.",
    href: "/workspace",
    tag: "AI Workflow",
    image: "/images/innovation/plc-solution.png",
  },
  {
    title: "Admin Governance",
    body: "System governance, import quality controls, and enterprise-level operational policy.",
    href: "/admin",
    tag: "Governance",
    image: "/images/wheel-manufacturing-trends-overview.png",
  },
];

const ROADMAP_ZH = [
  {
    title: "机械与夹具基础",
    text: "完成夹具策略、关键动作定义和执行基线。",
    status: "completed",
  },
  {
    title: "视觉检测链",
    text: "建立标准化的预处理和测量管道用于检测任务。",
    status: "completed",
  },
  {
    title: "数字孪生与运营UX",
    text: "将设备、传感器和流程阶段映射到面向角色的交互流程。",
    status: "in_progress",
  },
  {
    title: "企业交付包",
    text: "最终确定部署叙述、治理控制和跨团队报告资产。",
    status: "pending",
  },
];

const ROADMAP_EN = [
  {
    title: "Mechanical and Fixture Foundation",
    text: "Complete fixture strategy, key movement definitions, and execution baseline.",
    status: "completed",
  },
  {
    title: "Vision Detection Chain",
    text: "Establish standardized pre-processing and measurement pipeline for inspection tasks.",
    status: "completed",
  },
  {
    title: "Digital Twin and Operations UX",
    text: "Map devices, sensors, and process stages into role-oriented interaction flows.",
    status: "in_progress",
  },
  {
    title: "Enterprise Delivery Package",
    text: "Finalize deployment narrative, governance controls, and cross-team reporting assets.",
    status: "pending",
  },
];

export default function HomeIntro() {
  const router = useRouter();
  const { text, locale, t } = useLocale();

  const workflowSteps = useMemo<WorkflowStep[]>(
    () => [
      {
        id: "home-step-brief",
        title: t("pages.home.copy001"),
        detail: t("pages.home.copy002"),
        state: "active",
      },
      {
        id: "home-step-command",
        title: t("pages.home.copy003"),
        detail: t("pages.home.copy004"),
        state: "upcoming",
        onClick: () => router.push("/visualize"),
      },
      {
        id: "home-step-operations",
        title: t("pages.home.copy005"),
        detail: t("pages.home.copy006"),
        state: "upcoming",
        onClick: () => router.push("/operations"),
      },
      {
        id: "home-step-workspace",
        title: t("pages.home.copy007"),
        detail: t("pages.home.copy008"),
        state: "upcoming",
        onClick: () => router.push("/workspace"),
      },
    ],
    [router],
  );

  const coreMetrics = useMemo<CoreFlowMetric[]>(
    () =>
      (locale === "zh-CN" ? VALUE_CARDS_ZH : VALUE_CARDS_EN).map((item) => ({
        label: item.title,
        value: item.value,
        note: item.detail,
      })),
    [locale],
  );

  const coreStages = useMemo<CoreFlowStage[]>(
    () => [
      {
        id: "home-core-observe",
        title: t("pages.home.copy009"),
        detail: t("pages.home.copy010"),
        state: "done",
      },
      {
        id: "home-core-diagnose",
        title: t("pages.home.copy011"),
        detail: t("pages.home.copy012"),
        state: "active",
      },
      {
        id: "home-core-act",
        title: t("pages.home.copy013"),
        detail: t("pages.home.copy014"),
        state: "upcoming",
      },
      {
        id: "home-core-close",
        title: t("pages.home.copy015"),
        detail: t("pages.home.copy016"),
        state: "upcoming",
      },
    ],
    [text],
  );

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="page-shell innovation-shell pt-0 pb-10">
      <BackButton fallbackHref="/visualize" />

      <WorkflowSteps
        title={t("pages.home.copy017")}
        subtitle={t("pages.home.copy018")}
        steps={workflowSteps}
      />

      <div className="quick-jump-strip">
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("home-core")}
        >
          {t("pages.digital_twin.copy037")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("home-lanes")}
        >
          {t("pages.digital_twin.copy038")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("home-modules")}
        >
          {t("pages.home.copy019")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("home-roadmap")}
        >
          {t("pages.home.copy020")}
        </button>
      </div>

      <CoreFlowHeader
        id="home-core"
        eyebrow={t("pages.home.copy021")}
        title={t("pages.home.copy022")}
        description={(locale === "zh-CN"
          ? HERO_PARAGRAPHS_ZH
          : HERO_PARAGRAPHS_EN
        ).join(" ")}
        metrics={coreMetrics}
        stages={coreStages}
        actions={
          <>
            <Link href="/visualize" className="enterprise-primary-button">
              {t("pages.home.copy023")}
            </Link>
            <Link href="/operations" className="enterprise-secondary-button">
              {t("pages.home.copy024")}
            </Link>
            <Link href="/monitor" className="enterprise-secondary-button">
              {t("pages.home.copy025")}
            </Link>
            <Link href="/digital-twin" className="enterprise-secondary-button">
              {t("pages.home.copy026")}
            </Link>
          </>
        }
        sideNote={
          <div className="innovation-highlight-list">
            <div>
              <strong>{t("pages.home.copy027")}</strong>
              <p>{t("pages.home.copy028")}</p>
            </div>
            <div>
              <strong>{t("pages.home.copy029")}</strong>
              <p>{t("pages.home.copy030")}</p>
            </div>
            <div>
              <strong>{t("pages.home.copy031")}</strong>
              <p>{t("pages.home.copy032")}</p>
            </div>
          </div>
        }
      />

      <section id="home-lanes" className="core-flow-lane-grid">
        <Card className="core-flow-lane-card">
          <span className="core-flow-lane-kicker">
            {t("pages.digital_twin.copy053")}
          </span>
          <h3>{t("pages.home.copy033")}</h3>
          <p>{t("pages.home.copy034")}</p>
          <div className="core-flow-lane-actions">
            <Link href="/visualize" className="enterprise-primary-button">
              {t("pages.home.copy035")}
            </Link>
            <Link href="/home" className="enterprise-secondary-button">
              {t("pages.home.copy036")}
            </Link>
          </div>
        </Card>

        <Card className="core-flow-lane-card">
          <span className="core-flow-lane-kicker">
            {t("pages.home.copy037")}
          </span>
          <h3>{t("pages.home.copy038")}</h3>
          <p>{t("pages.home.copy039")}</p>
          <div className="core-flow-lane-actions">
            <Link href="/monitor" className="enterprise-primary-button">
              {t("pages.home.copy040")}
            </Link>
            <Link href="/digital-twin" className="enterprise-secondary-button">
              {t("pages.home.copy041")}
            </Link>
          </div>
        </Card>

        <Card className="core-flow-lane-card">
          <span className="core-flow-lane-kicker">
            {t("pages.home.copy042")}
          </span>
          <h3>{t("pages.home.copy043")}</h3>
          <p>{t("pages.home.copy044")}</p>
          <div className="core-flow-lane-actions">
            <Link href="/workspace" className="enterprise-primary-button">
              {t("pages.home.copy045")}
            </Link>
            <Link href="/admin" className="enterprise-secondary-button">
              {t("pages.home.copy046")}
            </Link>
          </div>
        </Card>
      </section>

      <section id="home-modules" className="innovation-feature-grid">
        {(locale === "zh-CN" ? MODULE_CARDS_ZH : MODULE_CARDS_EN).map(
          (card, index) => (
            <Card
              key={card.title}
              className={`innovation-feature-card hover-lift animate-fade-in-up stagger-${
                (index % 5) + 1
              }`}
            >
              <span className="innovation-feature-tag">{card.tag}</span>
              <div className="innovation-feature-image">
                <img src={card.image} alt={card.title} loading="lazy" />
              </div>
              <h3 className="text-gradient">{card.title}</h3>
              <p>{card.body}</p>
              <div className="workspace-capability-actions mt-3">
                <Link href={card.href} className="enterprise-secondary-button">
                  {t("pages.home.copy047")}
                </Link>
              </div>
            </Card>
          ),
        )}
      </section>

      <Card
        id="home-roadmap"
        className="innovation-timeline-card glow-border animate-scale-in"
      >
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">{t("pages.home.copy048")}</span>
            <h2>{t("pages.home.copy049")}</h2>
          </div>
        </div>
        <div className="innovation-timeline">
          {(locale === "zh-CN" ? ROADMAP_ZH : ROADMAP_EN).map((item, index) => (
            <div
              key={item.title}
              className={`innovation-timeline-item animate-slide-in-right stagger-${
                (index % 5) + 1
              }`}
            >
              <div className="innovation-timeline-index">
                <span className={`status-indicator ${item.status}`} />
                {String(index + 1).padStart(2, "0")}
              </div>
              <div>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
                <Badge
                  variant={
                    item.status === "completed"
                      ? "success"
                      : item.status === "in_progress"
                        ? "warning"
                        : "secondary"
                  }
                  className="mt-2"
                >
                  {item.status === "completed"
                    ? t("pages.home.copy050")
                    : item.status === "in_progress"
                      ? t("pages.home.copy051")
                      : t("pages.home.copy052")}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
