"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
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

// ---------------------------------------------------------------------------
// Static data: value cards
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Static data: module cards (navigation to domain pages)
// ---------------------------------------------------------------------------
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
    image: "/images/digital-twin-overview.png",
  },
  {
    title: "AI工作台",
    body: "AI助手、数据中心、报告中心和训练链集成在一个生产力空间。",
    href: "/workspace",
    tag: "AI工作流",
    image: "/images/ai-workspace-overview.png",
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
    image: "/images/digital-twin-overview.png",
  },
  {
    title: "AI Workspace",
    body: "AI assistant, data hub, report center, and training chain in one productivity space.",
    href: "/workspace",
    tag: "AI Workflow",
    image: "/images/ai-workspace-overview.png",
  },
  {
    title: "Admin Governance",
    body: "System governance, import quality controls, and enterprise-level operational policy.",
    href: "/admin",
    tag: "Governance",
    image: "/images/wheel-manufacturing-trends-overview.png",
  },
];

// ---------------------------------------------------------------------------
// Static data: roadmap
// ---------------------------------------------------------------------------
const ROADMAP_ZH = [
  {
    title: "机械与夹具基础",
    text: "完成夹具策略、关键动作定义和执行基线。",
    status: "completed" as const,
  },
  {
    title: "视觉检测链",
    text: "建立标准化的预处理和测量管道用于检测任务。",
    status: "completed" as const,
  },
  {
    title: "数字孪生与运营UX",
    text: "将设备、传感器和流程阶段映射到面向角色的交互流程。",
    status: "in_progress" as const,
  },
  {
    title: "企业交付包",
    text: "最终确定部署叙述、治理控制和跨团队报告资产。",
    status: "pending" as const,
  },
];

const ROADMAP_EN = [
  {
    title: "Mechanical and Fixture Foundation",
    text: "Complete fixture strategy, key movement definitions, and execution baseline.",
    status: "completed" as const,
  },
  {
    title: "Vision Detection Chain",
    text: "Establish standardized pre-processing and measurement pipeline for inspection tasks.",
    status: "completed" as const,
  },
  {
    title: "Digital Twin and Operations UX",
    text: "Map devices, sensors, and process stages into role-oriented interaction flows.",
    status: "in_progress" as const,
  },
  {
    title: "Enterprise Delivery Package",
    text: "Finalize deployment narrative, governance controls, and cross-team reporting assets.",
    status: "pending" as const,
  },
];

// ---------------------------------------------------------------------------
// Scroll-triggered animation hook using IntersectionObserver
// ---------------------------------------------------------------------------
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

// ---------------------------------------------------------------------------
// Animated section wrapper (fade-in-up on scroll)
// ---------------------------------------------------------------------------
function AnimatedSection({
  children,
  className = "",
  staggerDelay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  const { ref, inView } = useInView(0.08);

  return (
    <div
      ref={ref}
      className={`
        ${inView ? "animate-fade-in-up" : "opacity-0"}
        ${staggerDelay > 0 ? `stagger-${Math.min(Math.ceil(staggerDelay / 100), 5)}` : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Optimized module card with Next.js Image + keyboard accessibility
// ---------------------------------------------------------------------------
function ModuleCard({
  card,
  index,
  locale,
  enterLabel,
}: {
  card: {
    title: string;
    body: string;
    href: string;
    tag: string;
    image: string;
  };
  index: number;
  locale: string;
  enterLabel: string;
}) {
  return (
    <AnimatedSection staggerDelay={index * 80}>
      <Card
        className="innovation-feature-card hover-lift group/card"
        role="article"
        aria-label={card.title}
      >
        <span className="innovation-feature-tag">{card.tag}</span>
        <div className="innovation-feature-image relative aspect-video overflow-hidden rounded-[var(--radius-md)]">
          <Image
            src={card.image}
            alt={card.title}
            width={400}
            height={225}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
            loading={index < 2 ? "eager" : "lazy"}
          />
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--card-bg)]/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" />
        </div>
        <h3 className="text-gradient mt-4">{card.title}</h3>
        <p className="mt-2 text-[var(--text-secondary)] text-sm leading-relaxed">
          {card.body}
        </p>
        <div className="workspace-capability-actions mt-4">
          <Link
            href={card.href}
            className="enterprise-secondary-button inline-flex items-center gap-2"
            aria-label={`${enterLabel}: ${card.title}`}
          >
            {enterLabel}
            <span
              className="transition-transform group-hover/card:translate-x-1"
              aria-hidden
            >
              {"->"}
            </span>
          </Link>
        </div>
      </Card>
    </AnimatedSection>
  );
}

// ---------------------------------------------------------------------------
// Lane card component
// ---------------------------------------------------------------------------
function LaneCard({
  kicker,
  title,
  body,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  index,
}: {
  kicker: string;
  title: string;
  body: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  index: number;
}) {
  return (
    <AnimatedSection staggerDelay={index * 120}>
      <Card
        className="core-flow-lane-card group/lane"
        role="article"
        aria-label={title}
      >
        <span className="core-flow-lane-kicker">{kicker}</span>
        <h3 className="text-gradient">{title}</h3>
        <p className="mt-2 text-[var(--text-secondary)] text-sm leading-relaxed">
          {body}
        </p>
        <div className="core-flow-lane-actions mt-4 flex flex-wrap gap-3">
          <Link href={primaryHref} className="enterprise-primary-button">
            {primaryLabel}
          </Link>
          {secondaryHref && secondaryLabel ? (
            <Link href={secondaryHref} className="enterprise-secondary-button">
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </Card>
    </AnimatedSection>
  );
}

// ---------------------------------------------------------------------------
// Roadmap status badge label resolver
// ---------------------------------------------------------------------------
function roadmapStatusLabel(
  status: "completed" | "in_progress" | "pending",
  t: (key: string, values?: Record<string, string | number>, fallback?: string) => string,
): string {
  return status === "completed"
    ? t("pages.home.copy050", undefined, "已完成")
    : status === "in_progress"
      ? t("pages.home.copy051", undefined, "进行中")
      : t("pages.home.copy052", undefined, "待启动");
}

function roadmapBadgeVariant(
  status: "completed" | "in_progress" | "pending",
): "success" | "warning" | "secondary" {
  return status === "completed"
    ? "success"
    : status === "in_progress"
      ? "warning"
      : "secondary";
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------
export default function HomeIntro() {
  const router = useRouter();
  const { text, locale, t } = useLocale();
  const [jumpActive, setJumpActive] = useState<string | null>(null);

  // Workflow steps memoized with proper deps
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
    [t, router],
  );

  // Core metrics
  const coreMetrics = useMemo<CoreFlowMetric[]>(
    () =>
      (locale === "zh-CN" ? VALUE_CARDS_ZH : VALUE_CARDS_EN).map((item) => ({
        label: item.title,
        value: item.value,
        note: item.detail,
      })),
    [locale],
  );

  // Core stages
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
    [t],
  );

  // Smooth scroll with visual feedback
  const scrollToSection = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (!target) return;

    // Flash the button briefly for tactile feedback
    setJumpActive(id);
    setTimeout(() => setJumpActive(null), 400);

    const top = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top, behavior: "smooth" });
  }, []);

  // Current year for copyright
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  return (
    <div className="page-shell innovation-shell pt-0 pb-10" role="main">
      {/* Back button */}
      <AnimatedSection>
        <BackButton fallbackHref="/visualize" />
      </AnimatedSection>

      {/* Workflow steps */}
      <WorkflowSteps
        title={t("pages.home.copy017", undefined, "平台导览")}
        subtitle={t("pages.home.copy018", undefined, "快速了解平台核心能力")}
        steps={workflowSteps}
      />

      {/* Quick jump strip */}
      <AnimatedSection>
        <nav
          className="quick-jump-strip"
          aria-label={t("pages.home.copy019", undefined, "Quick Jump")}
        >
          <button
            type="button"
            className={`enterprise-secondary-button transition-transform duration-200 ${
              jumpActive === "home-core" ? "scale-95" : ""
            }`}
            onClick={() => scrollToSection("home-core")}
            aria-label={t("pages.digital_twin.copy037", undefined, "核心流程")}
          >
            {t("pages.digital_twin.copy037", undefined, "核心流程")}
          </button>
          <button
            type="button"
            className={`enterprise-secondary-button transition-transform duration-200 ${
              jumpActive === "home-lanes" ? "scale-95" : ""
            }`}
            onClick={() => scrollToSection("home-lanes")}
            aria-label={t("pages.digital_twin.copy038", undefined, "行动通道")}
          >
            {t("pages.digital_twin.copy038", undefined, "行动通道")}
          </button>
          <button
            type="button"
            className={`enterprise-secondary-button transition-transform duration-200 ${
              jumpActive === "home-modules" ? "scale-95" : ""
            }`}
            onClick={() => scrollToSection("home-modules")}
            aria-label={t("pages.home.copy019", undefined, "模块")}
          >
            {t("pages.home.copy019", undefined, "模块")}
          </button>
          <button
            type="button"
            className={`enterprise-secondary-button transition-transform duration-200 ${
              jumpActive === "home-roadmap" ? "scale-95" : ""
            }`}
            onClick={() => scrollToSection("home-roadmap")}
            aria-label={t("pages.home.copy020", undefined, "路线")}
          >
            {t("pages.home.copy020", undefined, "路线")}
          </button>
        </nav>
      </AnimatedSection>

      {/* Core flow header */}
      <CoreFlowHeader
        id="home-core"
        eyebrow={t("pages.home.copy021", undefined, "核心流程")}
        title={t("pages.home.copy022", undefined, "统一的工业表面缺陷智能检测平台")}
        description={
          (locale === "zh-CN"
            ? [
                "本平台将工业表面缺陷智能检测硬件、AI视觉、数字孪生映射和运营治理整合为一个实用的交付方案。",
                "重新设计的UX专注于清晰的演示路径和可用的操作路径：快速解释价值、快速执行决策、可靠地关闭治理。",
              ]
            : [
                "This platform links wheel-hub inspection hardware, AI vision, digital-twin mapping, and operation governance into one practical delivery story.",
                "The redesigned UX focuses on a clear demo path and a usable action path: explain value fast, execute decisions quickly, and close governance reliably.",
              ]
          ).join(" ")
        }
        metrics={coreMetrics}
        stages={coreStages}
        actions={
          <div className="flex flex-wrap gap-3">
            <Link href="/visualize" className="enterprise-primary-button">
              {t("pages.home.copy023", undefined, "进入指挥中心")}
            </Link>
            <Link href="/operations" className="enterprise-secondary-button">
              {t("pages.home.copy024", undefined, "运营交接")}
            </Link>
            <Link href="/monitor" className="enterprise-secondary-button">
              {t("pages.home.copy025", undefined, "实时监控")}
            </Link>
            <Link href="/digital-twin" className="enterprise-secondary-button">
              {t("pages.home.copy026", undefined, "数字孪生")}
            </Link>
          </div>
        }
        sideNote={
          <div className="innovation-highlight-list space-y-3">
            <div>
              <strong>{t("pages.home.copy027", undefined, "硬件集成")}</strong>
              <p className="text-[var(--text-secondary)] text-sm">
                {t("pages.home.copy028", undefined, "标准化夹具与传感器部署方案")}
              </p>
            </div>
            <div>
              <strong>{t("pages.home.copy029", undefined, "AI 视觉")}</strong>
              <p className="text-[var(--text-secondary)] text-sm">
                {t("pages.home.copy030", undefined, "端到端的缺陷检测与分类管道")}
              </p>
            </div>
            <div>
              <strong>{t("pages.home.copy031", undefined, "运营治理")}</strong>
              <p className="text-[var(--text-secondary)] text-sm">
                {t("pages.home.copy032", undefined, "跨团队报告和部署治理控制")}
              </p>
            </div>
          </div>
        }
      />

      {/* Lanes section */}
      <section
        id="home-lanes"
        className="core-flow-lane-grid"
        aria-label={t("pages.home.copy033", undefined, "执行与治理")}
      >
        <LaneCard
          kicker={t("pages.digital_twin.copy053", undefined, "观察")}
          title={t("pages.home.copy033", undefined, "执行与治理")}
          body={t(
            "pages.home.copy034",
            undefined,
            "质量组合、吞吐趋势、队列状态和日志的综合视图，驱动持续改进。",
          )}
          primaryHref="/visualize"
          primaryLabel={t("pages.home.copy035", undefined, "查看仪表板")}
          secondaryHref="/"
          secondaryLabel={t("pages.home.copy036", undefined, "返回概览")}
          index={0}
        />
        <LaneCard
          kicker={t("pages.home.copy037", undefined, "感知层")}
          title={t("pages.home.copy038", undefined, "实时监控与孪生")}
          body={t(
            "pages.home.copy039",
            undefined,
            "相机墙、警报分类队列和前线设备检查，快速响应异常。",
          )}
          primaryHref="/monitor"
          primaryLabel={t("pages.home.copy040", undefined, "监控中心")}
          secondaryHref="/digital-twin"
          secondaryLabel={t("pages.home.copy041", undefined, "数字孪生")}
          index={1}
        />
        <LaneCard
          kicker={t("pages.home.copy042", undefined, "AI 生产力")}
          title={t("pages.home.copy043", undefined, "AI 工作台")}
          body={t(
            "pages.home.copy044",
            undefined,
            "AI 助手、数据中心、报告中心和训练链集成在一个空间。",
          )}
          primaryHref="/workspace"
          primaryLabel={t("pages.home.copy045", undefined, "工作台")}
          secondaryHref="/admin"
          secondaryLabel={t("pages.home.copy046", undefined, "管理治理")}
          index={2}
        />
      </section>

      {/* Module cards section */}
      <section
        id="home-modules"
        className="innovation-feature-grid"
        aria-label={t("pages.home.copy019", undefined, "模块")}
      >
        {(locale === "zh-CN" ? MODULE_CARDS_ZH : MODULE_CARDS_EN).map(
          (card, index) => (
            <ModuleCard
              key={card.href}
              card={card}
              index={index}
              locale={locale}
              enterLabel={t("pages.home.copy047", undefined, "进入")}
            />
          ),
        )}
      </section>

      {/* Roadmap section */}
      <AnimatedSection>
        <Card
          id="home-roadmap"
          className="innovation-timeline-card glow-border"
          role="region"
          aria-label={t("pages.home.copy049", undefined, "项目演进路线")}
        >
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {t("pages.home.copy048", undefined, "路线图")}
              </span>
              <h2>{t("pages.home.copy049", undefined, "项目演进路线")}</h2>
            </div>
          </div>
          <div className="innovation-timeline">
            {(locale === "zh-CN" ? ROADMAP_ZH : ROADMAP_EN).map(
              (item, index) => (
                <div
                  key={item.title}
                  className="innovation-timeline-item"
                  style={{
                    animationDelay: `${(index + 1) * 0.12}s`,
                  }}
                >
                  <div className="innovation-timeline-index">
                    <span
                      className={`status-indicator ${item.status}`}
                      aria-hidden
                    />
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <strong>{item.title}</strong>
                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed mt-1">
                      {item.text}
                    </p>
                    <Badge
                      variant={roadmapBadgeVariant(item.status)}
                      className="mt-2"
                      role="status"
                    >
                      {roadmapStatusLabel(item.status, t)}
                    </Badge>
                  </div>
                </div>
              ),
            )}
          </div>
        </Card>
      </AnimatedSection>

      {/* Footer hint */}
      <footer className="mt-8 text-center text-[var(--text-muted)] text-xs">
        <p>
          &copy; {currentYear}{" "}
          {t("pages.home.heroTitle", undefined, "工业表面缺陷智能检测系统")}
        </p>
      </footer>
    </div>
  );
}
