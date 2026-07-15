"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Factory,
  Radar,
  ShieldCheck,
  Sparkles,
  Target,
  Video,
} from "lucide-react";
import WorkflowHero from "../components/Layout/WorkflowHero";
import TaskSection from "../components/Layout/TaskSection";
import Card from "../components/Layout/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useLocale } from "../components/Locale/LocaleProvider";

type JourneyCard = {
  titleZh: string;
  titleEn: string;
  descriptionZh: string;
  descriptionEn: string;
  href: string;
  ctaZh: string;
  ctaEn: string;
  icon: React.ReactNode;
  tagZh: string;
  tagEn: string;
};

const JOURNEYS: JourneyCard[] = [
  {
    titleZh: "先看全局态势",
    titleEn: "Start With Posture",
    descriptionZh: "先在指挥中心确认质量趋势、告警压力和产线节奏，再决定今天优先处理什么。",
    descriptionEn: "Review quality trend, alert pressure, and throughput before choosing the day’s priority.",
    href: "/visualize",
    ctaZh: "打开指挥中心",
    ctaEn: "Open Command Center",
    icon: <BarChart3 className="h-5 w-5" />,
    tagZh: "观察",
    tagEn: "Observe",
  },
  {
    titleZh: "处理现场问题",
    titleEn: "Handle Field Work",
    descriptionZh: "从运营中台进入监控和数字孪生，减少在多个页面之间来回跳转。",
    descriptionEn: "Use Operations Hub to hand off cleanly between monitoring and digital-twin tasks.",
    href: "/operations",
    ctaZh: "进入运营中台",
    ctaEn: "Enter Operations Hub",
    icon: <Radar className="h-5 w-5" />,
    tagZh: "执行",
    tagEn: "Operate",
  },
  {
    titleZh: "沉淀 AI 产能",
    titleEn: "Run AI Workflows",
    descriptionZh: "把 AI 助手、数据源、训练和报告放到一个工作台，避免工具分散带来的低效率。",
    descriptionEn: "Keep AI assistant, data, training, and reporting in one controlled workspace.",
    href: "/workspace",
    ctaZh: "打开智能工作台",
    ctaEn: "Open Workspace",
    icon: <Bot className="h-5 w-5" />,
    tagZh: "分析",
    tagEn: "Analyze",
  },
  {
    titleZh: "完成治理闭环",
    titleEn: "Close Governance Loop",
    descriptionZh: "管理员在治理后台处理告警、导入和系统策略，避免日常操作和治理职责混在一起。",
    descriptionEn: "Use the admin console for alerts, imports, and policy controls instead of mixing them into daily operations.",
    href: "/admin",
    ctaZh: "前往治理后台",
    ctaEn: "Go To Admin Console",
    icon: <ShieldCheck className="h-5 w-5" />,
    tagZh: "治理",
    tagEn: "Govern",
  },
];

const PAGE_SPLITS = [
  {
    titleZh: "指挥中心负责判断，不负责处置",
    titleEn: "Command decides, not executes",
    bodyZh: "它应该回答哪里有问题、影响有多大、值不值得升级处理。",
    bodyEn: "It should answer where issues are, how severe they are, and whether they need escalation.",
  },
  {
    titleZh: "运营中台负责分流，不堆重复图表",
    titleEn: "Operations routes work, not duplicate charts",
    bodyZh: "它应该把人送到监控或数字孪生，并明确下一步该在哪个页面完成。",
    bodyEn: "It should route teams to Monitoring or Digital Twin and clarify where the next action belongs.",
  },
  {
    titleZh: "智能工作台负责生产力，不负责现场态势",
    titleEn: "Workspace drives productivity, not field posture",
    bodyZh: "它应该围绕数据、AI、训练、报告和配置组织任务，而不是重复监控页面内容。",
    bodyEn: "It should organize work around data, AI, training, reporting, and config instead of re-showing field dashboards.",
  },
];

export default function HomePage() {
  const { text } = useLocale();

  return (
    <div className="relative mx-auto max-w-[1920px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 right-0 h-80 w-80 rounded-full bg-primary/12 blur-[110px]" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-accent/12 blur-[110px]" />
      </div>

      <WorkflowHero
        eyebrow={text("平台入口", "Platform Entry")}
        title={text(
          "把总览、执行、AI 与治理重新组织成真正可用的工程工作台",
          "Reorganize overview, execution, AI, and governance into a usable engineering workbench",
        )}
        description={text(
          "首页现在不再承担宣传页角色，而是作为平台分工说明和高频入口控制台。先判断，再执行，再沉淀，再治理，避免在错误页面做错误事情。",
          "Home no longer acts like a marketing screen. It is now the map of platform responsibilities and the fastest way into the right workflow.",
        )}
        badgeVariant="glow"
        stats={[
          {
            label: text("核心工作域", "Core domains"),
            value: "4",
            detail: text("观察、执行、分析、治理", "Observe, operate, analyze, govern"),
            icon: <Factory className="h-5 w-5" />,
          },
          {
            label: text("主要入口", "Primary entries"),
            value: "6",
            detail: text("减少找页面成本", "Lower route-finding overhead"),
            icon: <Target className="h-5 w-5" />,
            tone: "success",
          },
          {
            label: text("页面职责", "Page ownership"),
            value: text("清晰", "Clear"),
            detail: text("避免重复图表和错位操作", "Avoid duplicate charts and misplaced actions"),
            icon: <Sparkles className="h-5 w-5" />,
            tone: "info",
          },
        ]}
        actions={
          <>
            <Button asChild>
              <Link href="/visualize">{text("先看指挥中心", "Start In Command Center")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/operations">{text("进入现场执行", "Go To Operations")}</Link>
            </Button>
          </>
        }
        aside={
          <Card variant="glass" className="h-full border-border/60">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                {text("今日推荐路径", "Recommended flow")}
              </Badge>
              <ol className="space-y-4">
                {[
                  text("在指挥中心确认异常强度和产线节奏", "Confirm severity and throughput in Command Center"),
                  text("在运营中台分流到监控或数字孪生", "Route work to Monitoring or Digital Twin from Operations Hub"),
                  text("在智能工作台处理 AI、数据和报告", "Use Workspace for AI, data, and reporting"),
                  text("在治理后台关闭告警和导入风险", "Close alerts and import risk in Admin Console"),
                ].map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-bold text-primary">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{step}</p>
                  </li>
                ))}
              </ol>
            </div>
          </Card>
        }
      />

      <TaskSection
        id="home-journeys"
        eyebrow={text("快速开始", "Quick start")}
        title={text("按工作目标进入正确页面", "Choose the right page by job to be done")}
        description={text(
          "借鉴企业后台里常见的任务分流做法，把页面当作能力边界，而不是随机堆功能的地方。",
          "Borrowing from enterprise workbench patterns, each page now acts as a responsibility boundary instead of a random feature pile.",
        )}
      >
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {JOURNEYS.map((journey) => (
            <Card key={journey.href} variant="glass" className="h-full border-border/60">
              <div className="flex h-full flex-col">
                <div className="mb-4 flex items-center justify-between">
                  <Badge variant="secondary">{text(journey.tagZh, journey.tagEn)}</Badge>
                  <div className="rounded-2xl border border-border/60 bg-background/70 p-2.5 text-primary">
                    {journey.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold">
                  {text(journey.titleZh, journey.titleEn)}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
                  {text(journey.descriptionZh, journey.descriptionEn)}
                </p>
                <Button asChild className="mt-5 w-fit">
                  <Link href={journey.href}>
                    {text(journey.ctaZh, journey.ctaEn)}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </TaskSection>

      <TaskSection
        className="mt-10"
        eyebrow={text("页面分工", "Page ownership")}
        title={text("明确每个页面应该解决什么问题", "Make each page solve one class of problem well")}
        description={text(
          "这是这轮改版最重要的原则之一。页面职责越明确，团队越不容易在错误上下文里浪费时间。",
          "This is the main principle behind the redesign. The clearer the page ownership, the less time teams waste in the wrong context.",
        )}
      >
        <div className="grid gap-4 xl:grid-cols-3">
          {PAGE_SPLITS.map((item) => (
            <Card key={item.titleZh} variant="gradient" className="border-border/60">
              <h3 className="text-lg font-bold">{text(item.titleZh, item.titleEn)}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {text(item.bodyZh, item.bodyEn)}
              </p>
            </Card>
          ))}
        </div>
      </TaskSection>

      <TaskSection
        className="mt-10"
        eyebrow={text("高频入口", "High-frequency entries")}
        title={text("保留专用页面，但减少找路成本", "Keep specialist pages without making people hunt for them")}
        description={text(
          "如果你已经知道自己要做什么，可以直接进入这些专用页面。",
          "If you already know the task, go directly to the specialist surface.",
        )}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { href: "/monitor", icon: <Video className="h-4 w-4" />, zh: "监控中心", en: "Monitoring" },
            { href: "/digital-twin", icon: <Radar className="h-4 w-4" />, zh: "数字孪生", en: "Digital Twin" },
            { href: "/reports", icon: <Bot className="h-4 w-4" />, zh: "报告中心", en: "Report Center" },
            { href: "/data-hub", icon: <BarChart3 className="h-4 w-4" />, zh: "数据中心", en: "Data Hub" },
          ].map((entry) => (
            <Link
              key={entry.href}
              href={entry.href}
              className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/60 px-4 py-4 transition hover:border-primary/40 hover:bg-accent/10"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-border/60 bg-background/70 p-2 text-primary">
                  {entry.icon}
                </div>
                <span className="font-semibold">{text(entry.zh, entry.en)}</span>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </TaskSection>
    </div>
  );
}
