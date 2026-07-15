"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  PenTool,
  Settings2,
  Shield,
  Target,
  Users,
  Zap,
} from "lucide-react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import EmptyStateCard from "../components/Layout/EmptyStateCard";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import SectionSkeleton from "../components/Layout/SectionSkeleton";
import TaskSection from "../components/Layout/TaskSection";
import WorkbenchFilterBar from "../components/Layout/WorkbenchFilterBar";
import WorkflowHero from "../components/Layout/WorkflowHero";
import WorkflowSteps, { type WorkflowStep } from "../components/Layout/WorkflowSteps";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
import { readStoredAuthSession } from "@/lib/auth-session";
import { requestPlatformJson } from "@/lib/dashboard-client";
import { enterpriseErrorMessage, enterpriseGet } from "@/lib/enterprise-client";
import type { EnterpriseOverview } from "@/types/enterprise";
import type { UserRole } from "@/types/auth";
import { cn } from "@/lib/utils";

type HealthPayload = {
  backend: { status: string };
  aiMl: { status: string; baseUrl: string };
};

type WorkspaceHealthState = "loading" | "healthy" | "backend-only" | "attention";
type LaunchFilter = "recommended" | "all" | "connect" | "execute" | "close-loop";
type WorkspaceRole = Exclude<UserRole, "user">;
type PriorityLevel = "critical" | "warning" | "info" | "success";

type WorkspaceModule = {
  href: string;
  titleZh: string;
  titleEn: string;
  descriptionZh: string;
  descriptionEn: string;
  reasonZh: string;
  reasonEn: string;
  icon: React.ReactNode;
  metricKey: "providers" | "sources" | "reports" | "training" | "health" | "analysis";
  roles?: WorkspaceRole[];
};

type WorkspaceStage = {
  id: Exclude<LaunchFilter, "recommended" | "all">;
  titleZh: string;
  titleEn: string;
  descriptionZh: string;
  descriptionEn: string;
  modules: WorkspaceModule[];
};

type RoleLane = {
  role: WorkspaceRole;
  titleZh: string;
  titleEn: string;
  missionZh: string;
  missionEn: string;
  successZh: string;
  successEn: string;
  handoffZh: string;
  handoffEn: string;
  primaryHref: string;
  primaryLabelZh: string;
  primaryLabelEn: string;
  secondaryHref: string;
  secondaryLabelZh: string;
  secondaryLabelEn: string;
  icon: React.ReactNode;
};

type PriorityAction = {
  id: string;
  priority: PriorityLevel;
  owner: "shared" | WorkspaceRole;
  titleZh: string;
  titleEn: string;
  detailZh: string;
  detailEn: string;
  signalZh: string;
  signalEn: string;
  href: string;
  actionZh: string;
  actionEn: string;
  secondaryHref?: string;
  secondaryActionZh?: string;
  secondaryActionEn?: string;
};

const WORKSPACE_STAGES: WorkspaceStage[] = [
  {
    id: "connect",
    titleZh: "先校验上下文",
    titleEn: "Verify context first",
    descriptionZh: "先确认服务、数据和标注资产可用，避免把分析和训练跑在错误上下文上。",
    descriptionEn: "Verify services, data, and annotation assets before analysis or training starts.",
    modules: [
      {
        href: "/platform-config",
        titleZh: "平台配置",
        titleEn: "Platform Config",
        descriptionZh: "检查后端、AI 服务和供应商配置是否在线。",
        descriptionEn: "Verify backend, AI service, and provider readiness.",
        reasonZh: "任何 AI 失败都应该先在这里判因，而不是在业务页里盲查。",
        reasonEn: "Start here when AI fails so root cause is identified before business work begins.",
        icon: <Settings2 className="h-5 w-5" />,
        metricKey: "health",
      },
      {
        href: "/data-hub",
        titleZh: "数据中心",
        titleEn: "Data Hub",
        descriptionZh: "确认数据源状态、质量分和可用样本。",
        descriptionEn: "Check source status, quality score, and available samples.",
        reasonZh: "数据是否可用会直接决定 AI 问答、报告和训练是否可信。",
        reasonEn: "Data readiness directly affects whether analysis, reports, and training are trustworthy.",
        icon: <Database className="h-5 w-5" />,
        metricKey: "sources",
      },
      {
        href: "/annotation",
        titleZh: "标注工作台",
        titleEn: "Annotation Studio",
        descriptionZh: "管理未标注资产、复核结果，并控制数据集导出门槛。",
        descriptionEn: "Govern unlabeled assets, review labels, and control dataset export quality.",
        reasonZh: "工程团队需要先知道数据集是否能进训练，而不是训练后再返工。",
        reasonEn: "Engineers need to know whether a dataset is trainable before starting a training run.",
        icon: <PenTool className="h-5 w-5" />,
        metricKey: "sources",
        roles: ["admin", "engineer", "operator"],
      },
    ],
  },
  {
    id: "execute",
    titleZh: "再运行核心任务",
    titleEn: "Then run core work",
    descriptionZh: "按问答分析、训练执行和问题派发的顺序组织高频工作，减少来回切换。",
    descriptionEn: "Organize high-frequency work around analysis, training, and issue handling.",
    modules: [
      {
        href: "/ai-assistant",
        titleZh: "AI 助手",
        titleEn: "AI Assistant",
        descriptionZh: "把问题、策略和证据整合成一次对话式分析。",
        descriptionEn: "Combine the question, strategy, and evidence into a guided analysis workflow.",
        reasonZh: "适合快速拿结论、拆原因、形成处置建议。",
        reasonEn: "Best for reaching conclusions quickly, breaking down causes, and proposing actions.",
        icon: <Bot className="h-5 w-5" />,
        metricKey: "providers",
      },
      {
        href: "/training",
        titleZh: "训练中心",
        titleEn: "Training Center",
        descriptionZh: "将数据集沉淀成可追踪的模型版本与训练记录。",
        descriptionEn: "Turn datasets into trackable model versions and training records.",
        reasonZh: "训练是工程职责，不该让一线用户在错误上下文里进入复杂流程。",
        reasonEn: "Training belongs to engineering and should not leak into frontline workflows.",
        icon: <Target className="h-5 w-5" />,
        metricKey: "training",
        roles: ["admin", "engineer"],
      },
      {
        href: "/reports",
        titleZh: "报告中心",
        titleEn: "Report Center",
        descriptionZh: "把分析结果和检查结论变成可交付的产物。",
        descriptionEn: "Turn analysis and review results into deliverable artifacts.",
        reasonZh: "减少重复回答，让结论以稳定格式进入交接链路。",
        reasonEn: "Reduce repeated answers by packaging conclusions into stable deliverables.",
        icon: <FileText className="h-5 w-5" />,
        metricKey: "reports",
      },
    ],
  },
  {
    id: "close-loop",
    titleZh: "最后完成闭环",
    titleEn: "Close the loop last",
    descriptionZh: "完成治理、审计和策略回写，把一次工作变成可复用的团队资产。",
    descriptionEn: "Finish with governance, audit, and policy updates so work becomes reusable team capital.",
    modules: [
      {
        href: "/admin",
        titleZh: "治理后台",
        titleEn: "Admin Console",
        descriptionZh: "处理告警、导入、库存与复检等治理动作。",
        descriptionEn: "Handle alerts, imports, inventory, and review governance actions.",
        reasonZh: "让治理动作回到治理页，避免现场页面承担系统级决策。",
        reasonEn: "Keep governance actions in the governance console instead of field surfaces.",
        icon: <Shield className="h-5 w-5" />,
        metricKey: "analysis",
        roles: ["admin"],
      },
      {
        href: "/workspace",
        titleZh: "工作台复盘",
        titleEn: "Workspace Review",
        descriptionZh: "回看队列、交接和系统状态，确认今日是否还有阻塞。",
        descriptionEn: "Review queues, handoffs, and system state to confirm no blockers remain.",
        reasonZh: "每天结束前需要用同一入口确认闭环是否完成。",
        reasonEn: "Teams need one stable place to confirm the loop is actually closed.",
        icon: <ClipboardList className="h-5 w-5" />,
        metricKey: "analysis",
      },
    ],
  },
];

const ROLE_LANES: RoleLane[] = [
  {
    role: "operator",
    titleZh: "现场执行",
    titleEn: "Operator lane",
    missionZh: "先拿到判断，再决定是否需要升级处理或补充证据。",
    missionEn: "Get a decision first, then decide whether the issue needs escalation or more evidence.",
    successZh: "你应该在一个班次内给出问题摘要、影响范围和建议动作。",
    successEn: "A successful shift produces a summary, impact range, and recommended action.",
    handoffZh: "交给工程或治理时，最好附上报告而不是口头说明。",
    handoffEn: "Hand off with a report instead of verbal context whenever possible.",
    primaryHref: "/ai-assistant",
    primaryLabelZh: "去做分析",
    primaryLabelEn: "Run analysis",
    secondaryHref: "/reports",
    secondaryLabelZh: "整理交付物",
    secondaryLabelEn: "Package output",
    icon: <Bot className="h-5 w-5" />,
  },
  {
    role: "engineer",
    titleZh: "模型工程",
    titleEn: "Engineer lane",
    missionZh: "确认数据集成熟度，再推进训练、版本和指标复核。",
    missionEn: "Validate dataset maturity, then move training, versions, and metrics forward.",
    successZh: "你应该留下可追踪的训练记录和可复盘的模型版本。",
    successEn: "Success means leaving a traceable training record and a reviewable model version.",
    handoffZh: "训练结果应交回报告中心或治理后台，而不是停留在训练页。",
    handoffEn: "Training outcomes should be handed back through reports or governance, not left in Training alone.",
    primaryHref: "/training",
    primaryLabelZh: "推进训练",
    primaryLabelEn: "Advance training",
    secondaryHref: "/annotation",
    secondaryLabelZh: "复核数据集",
    secondaryLabelEn: "Review dataset",
    icon: <Target className="h-5 w-5" />,
  },
  {
    role: "viewer",
    titleZh: "监督复盘",
    titleEn: "Viewer lane",
    missionZh: "聚焦结果、证据和交接状态，不在错误页面里做配置变更。",
    missionEn: "Focus on outcomes, evidence, and handoff status instead of making config changes.",
    successZh: "你应该快速看懂当前结论、风险等级和待决事项。",
    successEn: "Success means understanding the conclusion, risk level, and pending decisions quickly.",
    handoffZh: "需要更深入动作时，交给运营、工程或管理员对应页面。",
    handoffEn: "When deeper action is needed, hand off to the right operator, engineer, or admin surface.",
    primaryHref: "/reports",
    primaryLabelZh: "查看报告",
    primaryLabelEn: "Open reports",
    secondaryHref: "/workspace",
    secondaryLabelZh: "检查队列",
    secondaryLabelEn: "Review queue",
    icon: <FileText className="h-5 w-5" />,
  },
  {
    role: "admin",
    titleZh: "治理稳态",
    titleEn: "Admin lane",
    missionZh: "把告警、导入、权限和策略保持在可控状态，让其他角色不被基础问题拖住。",
    missionEn: "Keep alerts, imports, permissions, and policies controlled so other roles are not blocked.",
    successZh: "你应该让服务健康、数据治理和系统规则可解释、可审计。",
    successEn: "Success means service health, governance, and system rules remain explainable and auditable.",
    handoffZh: "治理动作完成后，要把执行入口还给运营和工程角色。",
    handoffEn: "Once governance work is done, hand the execution lanes back to operators and engineers.",
    primaryHref: "/admin",
    primaryLabelZh: "进入治理后台",
    primaryLabelEn: "Open admin console",
    secondaryHref: "/platform-config",
    secondaryLabelZh: "校验平台",
    secondaryLabelEn: "Verify platform",
    icon: <Shield className="h-5 w-5" />,
  },
];

function localizeHealth(status: WorkspaceHealthState, text: (zh: string, en: string) => string) {
  if (status === "loading") return text("载入中", "Loading");
  if (status === "healthy") return text("健康", "Healthy");
  if (status === "backend-only") return text("仅后端在线", "Backend only");
  return text("需要关注", "Needs attention");
}

function roleLabel(role: PriorityAction["owner"], text: (zh: string, en: string) => string) {
  if (role === "shared") return text("共享职责", "Shared ownership");
  if (role === "admin") return text("管理员", "Admin");
  if (role === "engineer") return text("工程师", "Engineer");
  if (role === "viewer") return text("查看者", "Viewer");
  return text("操作员", "Operator");
}

function priorityBadgeVariant(priority: PriorityLevel) {
  if (priority === "critical") return "destructive" as const;
  if (priority === "warning") return "warning" as const;
  if (priority === "success") return "success" as const;
  return "info" as const;
}

function priorityLabel(priority: PriorityLevel, text: (zh: string, en: string) => string) {
  if (priority === "critical") return text("立即处理", "Act now");
  if (priority === "warning") return text("今日优先", "Today priority");
  if (priority === "success") return text("状态稳定", "Stable");
  return text("建议推进", "Suggested");
}

export default function WorkspacePage() {
  const ready = useSessionGuard(["admin", "engineer", "operator", "viewer"]);
  const { text, t } = useLocale();
  const router = useRouter();
  const [overview, setOverview] = useState<EnterpriseOverview | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [sessionRole, setSessionRole] = useState<UserRole | null>(null);
  const [launchSearch, setLaunchSearch] = useState("");
  const [launchFilter, setLaunchFilter] = useState<LaunchFilter>("recommended");

  const normalizedRole: WorkspaceRole =
    sessionRole === "user" || !sessionRole ? "operator" : sessionRole;

  useEffect(() => {
    setSessionRole(readStoredAuthSession()?.role ?? null);
  }, []);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const load = async () => {
      setIsLoading(true);
      setMessage("");
      setNotice("");

      const [overviewResult, healthResult] = await Promise.allSettled([
        enterpriseGet<EnterpriseOverview>("/enterprise/overview"),
        requestPlatformJson<{ data?: HealthPayload }>("/health", "/api/health"),
      ]);

      if (!active) return;

      let nextOverview: EnterpriseOverview | null = null;
      let nextHealth: HealthPayload | null = null;
      const warnings: string[] = [];

      if (overviewResult.status === "fulfilled") {
        nextOverview = overviewResult.value;
      } else {
        warnings.push(
          enterpriseErrorMessage(
            overviewResult.reason,
            t("pages.workspace.copy002", undefined, "Workspace overview is temporarily unavailable."),
          ),
        );
      }

      if (healthResult.status === "fulfilled") {
        nextHealth = healthResult.value.data ?? null;
      } else {
        warnings.push(
          enterpriseErrorMessage(
            healthResult.reason,
            t("pages.workspace.copy003", undefined, "Health status is temporarily unavailable."),
          ),
        );
      }

      setOverview(nextOverview);
      setHealth(nextHealth);

      if (!nextOverview && !nextHealth) {
        setMessage(
          t(
            "pages.workspace.copy004",
            undefined,
            "Workspace data is temporarily unavailable. Check platform connectivity and reload.",
          ),
        );
      } else if (warnings.length) {
        setNotice(warnings.join(" "));
      }

      setIsLoading(false);
    };

    load().catch((error) => {
      if (!active) return;
      setMessage(
        enterpriseErrorMessage(
          error,
          t("pages.workspace.copy005", undefined, "Workspace data is temporarily unavailable."),
        ),
      );
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [ready, t]);

  const healthState = useMemo<WorkspaceHealthState>(() => {
    if (!health && isLoading) return "loading";
    if (health?.backend.status === "up" && health?.aiMl.status === "up") {
      return "healthy";
    }
    if (health?.backend.status === "up") {
      return "backend-only";
    }
    return "attention";
  }, [health, isLoading]);

  const activitySummary = useMemo(() => {
    return {
      providers: overview?.providers.length ?? 0,
      sources: overview?.dataSources.length ?? 0,
      analysisJobs: overview?.analysisJobs.length ?? 0,
      reports: overview?.reports.length ?? 0,
      trainingJobs: overview?.trainingJobs.length ?? 0,
      modelVersions: overview?.modelVersions.length ?? 0,
      recentAuditLogs: overview?.recentAuditLogs.slice(0, 3) ?? [],
    };
  }, [overview]);

  const metricValue = useMemo(() => {
    return {
      providers: overview ? String(activitySummary.providers) : text("载入中", "Loading"),
      sources: overview ? String(activitySummary.sources) : text("载入中", "Loading"),
      reports: overview ? String(activitySummary.reports) : text("载入中", "Loading"),
      training: overview ? String(activitySummary.trainingJobs) : text("载入中", "Loading"),
      analysis: overview ? String(activitySummary.analysisJobs) : text("载入中", "Loading"),
      health: localizeHealth(healthState, text),
    };
  }, [activitySummary, healthState, overview, text]);

  const stageCards = useMemo(() => {
    return WORKSPACE_STAGES.map((stage) => ({
      ...stage,
      modules: stage.modules
        .filter((module) => !module.roles || module.roles.includes(normalizedRole))
        .map((module) => ({
          ...module,
          metricValue: metricValue[module.metricKey],
          isRecommended: !module.roles || module.roles.includes(normalizedRole),
        })),
    })).filter((stage) => stage.modules.length > 0);
  }, [metricValue, normalizedRole]);

  const startupSteps = useMemo<WorkflowStep[]>(() => {
    const stackReady = healthState === "healthy";
    const contextReady = Boolean(overview) && activitySummary.providers > 0 && activitySummary.sources > 0;
    const outputsReady = Boolean(overview) && activitySummary.reports > 0;

    return [
      {
        id: "verify-stack",
        title: text("校验服务健康", "Verify service health"),
        detail: text("先确认后端与 AI 依赖是否在线。", "Confirm backend and AI dependencies before using the workspace."),
        state: stackReady ? "done" : "active",
        onClick: () => router.push("/platform-config"),
      },
      {
        id: "verify-context",
        title: text("确认上下文资产", "Confirm context assets"),
        detail: text("检查供应商、数据源和标注资产是否已准备好。", "Check providers, data sources, and annotation assets."),
        state: stackReady ? (contextReady ? "done" : "active") : "upcoming",
        onClick: () => router.push("/data-hub"),
      },
      {
        id: "run-work",
        title: text("进入你的工作流", "Enter your role workflow"),
        detail: text("按职责进入 AI、训练或报告页面，不在错误页面执行任务。", "Use the right surface for AI, training, or reporting based on your role."),
        state: stackReady && contextReady ? "active" : "upcoming",
        onClick: () =>
          router.push(
            normalizedRole === "engineer"
              ? "/training"
              : normalizedRole === "viewer"
                ? "/reports"
                : normalizedRole === "admin"
                  ? "/admin"
                  : "/ai-assistant",
          ),
      },
      {
        id: "close-loop",
        title: text("沉淀并交接", "Package and hand off"),
        detail: text("用报告、审计和治理动作关闭一次工作循环。", "Close the work loop with reports, auditability, and governance actions."),
        state: outputsReady ? "done" : "upcoming",
        onClick: () => router.push("/reports"),
      },
    ];
  }, [activitySummary.providers, activitySummary.reports, activitySummary.sources, healthState, normalizedRole, overview, router, text]);

  const launchpadItems = useMemo(() => {
    return stageCards.flatMap((stage) =>
      stage.modules.map((module) => ({
        id: `${stage.id}-${module.href}`,
        stageId: stage.id,
        stageTitleZh: stage.titleZh,
        stageTitleEn: stage.titleEn,
        href: module.href,
        titleZh: module.titleZh,
        titleEn: module.titleEn,
        descriptionZh: module.descriptionZh,
        descriptionEn: module.descriptionEn,
        reasonZh: module.reasonZh,
        reasonEn: module.reasonEn,
        metricValue: module.metricValue,
        isRecommended: module.isRecommended,
        icon: module.icon,
        audienceZh: module.roles?.length ? text("专属分工", "Role-owned") : text("共享入口", "Shared surface"),
        audienceEn: module.roles?.length ? "Role-owned" : "Shared surface",
      })),
    );
  }, [stageCards, text]);

  const filteredLaunchItems = useMemo(() => {
    const query = launchSearch.trim().toLowerCase();

    return launchpadItems.filter((item) => {
      const matchesFilter =
        launchFilter === "all"
          ? true
          : launchFilter === "recommended"
            ? item.isRecommended
            : item.stageId === launchFilter;

      if (!matchesFilter) return false;
      if (!query) return true;

      const haystack = [
        item.stageTitleZh,
        item.stageTitleEn,
        item.titleZh,
        item.titleEn,
        item.descriptionZh,
        item.descriptionEn,
        item.reasonZh,
        item.reasonEn,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [launchFilter, launchSearch, launchpadItems]);

  const launchFilters = useMemo(() => {
    const countFor = (filter: LaunchFilter) =>
      launchpadItems.filter((item) => {
        if (filter === "all") return true;
        if (filter === "recommended") return item.isRecommended;
        return item.stageId === filter;
      }).length;

    return [
      {
        id: "recommended",
        label: text("推荐动作", "Recommended"),
        count: countFor("recommended"),
        active: launchFilter === "recommended",
        onClick: () => setLaunchFilter("recommended"),
      },
      {
        id: "all",
        label: text("全部入口", "All"),
        count: countFor("all"),
        active: launchFilter === "all",
        onClick: () => setLaunchFilter("all"),
      },
      {
        id: "connect",
        label: text("校验上下文", "Verify"),
        count: countFor("connect"),
        active: launchFilter === "connect",
        onClick: () => setLaunchFilter("connect"),
      },
      {
        id: "execute",
        label: text("执行任务", "Execute"),
        count: countFor("execute"),
        active: launchFilter === "execute",
        onClick: () => setLaunchFilter("execute"),
      },
      {
        id: "close-loop",
        label: text("完成闭环", "Close loop"),
        count: countFor("close-loop"),
        active: launchFilter === "close-loop",
        onClick: () => setLaunchFilter("close-loop"),
      },
    ];
  }, [launchFilter, launchpadItems, text]);

  const roleLanes = useMemo(() => {
    return ROLE_LANES.map((lane) => {
      const signal =
        lane.role === "admin"
          ? text(
              `当前有 ${activitySummary.recentAuditLogs.length} 条最近审计活动可复盘。`,
              `${activitySummary.recentAuditLogs.length} recent audit events are ready for review.`,
            )
          : lane.role === "engineer"
            ? text(
                `训练任务 ${activitySummary.trainingJobs} 条，模型版本 ${activitySummary.modelVersions} 个。`,
                `${activitySummary.trainingJobs} training jobs and ${activitySummary.modelVersions} model versions are in play.`,
              )
            : lane.role === "viewer"
              ? text(
                  `报告产物 ${activitySummary.reports} 个，适合做快速监督和交接判断。`,
                  `${activitySummary.reports} report artifacts are available for quick supervision and handoff checks.`,
                )
              : text(
                  `分析任务 ${activitySummary.analysisJobs} 条，数据源 ${activitySummary.sources} 个可直接使用。`,
                  `${activitySummary.analysisJobs} analysis jobs and ${activitySummary.sources} data sources are available for frontline work.`,
                );

      return {
        ...lane,
        signal,
        isActive: lane.role === normalizedRole,
      };
    });
  }, [activitySummary.analysisJobs, activitySummary.modelVersions, activitySummary.recentAuditLogs.length, activitySummary.reports, activitySummary.sources, activitySummary.trainingJobs, normalizedRole, text]);

  const priorityActions = useMemo<PriorityAction[]>(() => {
    const items: PriorityAction[] = [];
    const activeTrainingJobs =
      overview?.trainingJobs.filter((job) => job.status.toLowerCase() !== "completed") ?? [];

    if (healthState === "attention") {
      items.push({
        id: "health-attention",
        priority: "critical",
        owner: "admin",
        titleZh: "先恢复平台可用性",
        titleEn: "Restore platform readiness first",
        detailZh: "服务依赖还不稳定，继续在业务页面操作只会放大排查成本。",
        detailEn: "Dependencies are unstable, so continuing in business pages will only increase debugging cost.",
        signalZh: "当前后端或 AI 依赖未完全在线。",
        signalEn: "Backend or AI dependencies are not fully available.",
        href: "/platform-config",
        actionZh: "去排查平台",
        actionEn: "Inspect platform",
        secondaryHref: "/workspace",
        secondaryActionZh: "保留当前队列",
        secondaryActionEn: "Keep current queue",
      });
    } else if (healthState === "backend-only") {
      items.push({
        id: "health-backend-only",
        priority: "warning",
        owner: "admin",
        titleZh: "补齐 AI 依赖后再启动分析",
        titleEn: "Restore AI dependency before analysis starts",
        detailZh: "后端已在线，但 AI 供应链尚未准备好，分析与报告会出现误判或失败。",
        detailEn: "Backend is ready but AI supply is not, so analysis and reporting may fail or mislead.",
        signalZh: "当前仅后端在线。",
        signalEn: "Only the backend is currently healthy.",
        href: "/platform-config",
        actionZh: "恢复 AI 服务",
        actionEn: "Restore AI service",
      });
    }

    if (overview && activitySummary.providers === 0) {
      items.push({
        id: "providers-missing",
        priority: "warning",
        owner: "admin",
        titleZh: "建立可用供应商策略",
        titleEn: "Create a usable provider strategy",
        detailZh: "没有可用供应商配置时，AI 助手和训练相关路径都不可靠。",
        detailEn: "Without provider profiles, AI assistant and training-adjacent paths are unreliable.",
        signalZh: "当前可用模型供应配置为 0。",
        signalEn: "There are currently 0 active provider profiles.",
        href: "/platform-config",
        actionZh: "配置供应商",
        actionEn: "Configure providers",
      });
    }

    if (overview && activitySummary.sources === 0) {
      items.push({
        id: "sources-missing",
        priority: "warning",
        owner: "operator",
        titleZh: "先补齐可用数据源",
        titleEn: "Connect usable data sources first",
        detailZh: "没有数据源时，问答和报告只能停留在模板层面，无法成为可靠生产工具。",
        detailEn: "Without data sources, analysis and reports remain generic and cannot serve production reliably.",
        signalZh: "当前未检测到可用数据源。",
        signalEn: "No active data sources are currently available.",
        href: "/data-hub",
        actionZh: "检查数据中心",
        actionEn: "Inspect Data Hub",
      });
    }

    if (overview && activeTrainingJobs.length > 0) {
      items.push({
        id: "training-followup",
        priority: "info",
        owner: "engineer",
        titleZh: "跟进在跑训练任务",
        titleEn: "Follow up active training jobs",
        detailZh: "训练不应该只停在进度条上，还需要确认版本沉淀和指标是否足以交接。",
        detailEn: "Training should not stop at a progress bar; confirm version output and whether metrics are handoff-ready.",
        signalZh: `当前有 ${activeTrainingJobs.length} 条训练任务未完成。`,
        signalEn: `${activeTrainingJobs.length} training jobs are still in progress.`,
        href: "/training",
        actionZh: "检查训练中心",
        actionEn: "Review training",
        secondaryHref: "/reports",
        secondaryActionZh: "准备复盘产物",
        secondaryActionEn: "Prepare review output",
      });
    }

    if (overview && activitySummary.analysisJobs > activitySummary.reports) {
      items.push({
        id: "report-backlog",
        priority: "info",
        owner: "viewer",
        titleZh: "把分析沉淀成稳定交付物",
        titleEn: "Convert analysis into stable deliverables",
        detailZh: "分析次数已经超过报告产物，说明团队可能还在重复口头传达结果。",
        detailEn: "Analysis count is ahead of report output, which suggests results may still be shared verbally instead of through artifacts.",
        signalZh: `已有 ${activitySummary.analysisJobs} 条分析任务，但只有 ${activitySummary.reports} 个报告产物。`,
        signalEn: `${activitySummary.analysisJobs} analysis jobs exist, but only ${activitySummary.reports} report artifacts are available.`,
        href: "/reports",
        actionZh: "整理报告中心",
        actionEn: "Open Report Center",
        secondaryHref: "/ai-assistant",
        secondaryActionZh: "回到分析对话",
        secondaryActionEn: "Return to AI analysis",
      });
    }

    if (!items.length && !isLoading) {
      items.push({
        id: "stable-system",
        priority: "success",
        owner: "shared",
        titleZh: "当前工作台处于可推进状态",
        titleEn: "Workspace is ready to advance work",
        detailZh: "基础链路没有明显阻塞，团队可以按职责继续推进分析、训练和交付。",
        detailEn: "No major blockers are visible, so the team can continue analysis, training, and delivery by role.",
        signalZh: "服务、上下文和产出链路目前整体稳定。",
        signalEn: "Service, context, and delivery chains look stable right now.",
        href: normalizedRole === "engineer" ? "/training" : normalizedRole === "viewer" ? "/reports" : "/ai-assistant",
        actionZh: "进入当前职责入口",
        actionEn: "Open current role lane",
      });
    }

    const priorityRank: Record<PriorityLevel, number> = {
      critical: 0,
      warning: 1,
      info: 2,
      success: 3,
    };

    return items.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]).slice(0, 4);
  }, [activitySummary.analysisJobs, activitySummary.providers, activitySummary.reports, activitySummary.sources, healthState, isLoading, normalizedRole, overview]);

  const isWorkspaceSkeletonVisible = isLoading && !overview && !health && !message;

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/home"
        title={text("加载智能工作台", "Loading Workspace")}
        description={text(
          "正在校验工作台权限并准备 AI、数据与报告模块…",
          "Validating workspace access and preparing AI, data, and reporting modules...",
        )}
      />
    );
  }

  return (
    <div className="relative mx-auto max-w-[1920px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 right-10 h-72 w-72 rounded-full bg-primary/10 blur-[110px]" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-accent/10 blur-[110px]" />
      </div>

      <BackButton fallbackHref="/home" />

      <WorkflowHero
        eyebrow={text("生产力工作台", "Productivity workbench")}
        title={text(
          "把角色分工、任务派发和工作闭环都收进同一个工程入口",
          "Put role ownership, task routing, and work closure into one engineering entry point",
        )}
        description={text(
          "这页现在不只是模块平铺，而是一个按顺序做事的任务工作台。它吸收了成熟企业工作台常见的启动清单、角色分工和行动队列模式，让人一进来就知道今天先做什么、在哪做、做完交给谁。",
          "This page is now a real task workbench instead of a flat module list. It borrows startup checklists, role lanes, and action queues from mature enterprise workbenches so teams know what to do, where to do it, and who owns the next handoff.",
        )}
        stats={[
          {
            label: text("服务状态", "Service health"),
            value: localizeHealth(healthState, text),
            detail: text("后端与 AI 服务联动状态", "Backend and AI service readiness"),
            icon: <Activity className="h-5 w-5" />,
            tone: healthState === "healthy" ? "success" : healthState === "loading" ? "info" : "warning",
          },
          {
            label: text("数据源", "Data sources"),
            value: metricValue.sources,
            detail: text("当前可用上下文资产", "Available context assets"),
            icon: <Database className="h-5 w-5" />,
            tone: "info",
          },
          {
            label: text("训练任务", "Training jobs"),
            value: metricValue.training,
            detail: text("工程侧正在推进的模型任务", "Model work being advanced by engineering"),
            icon: <Target className="h-5 w-5" />,
          },
          {
            label: text("报告产物", "Report artifacts"),
            value: metricValue.reports,
            detail: text("适合交接与归档的结论产物", "Artifacts ready for handoff and archive"),
            icon: <FileText className="h-5 w-5" />,
          },
        ]}
        actions={
          <>
            <Button asChild>
              <Link href={normalizedRole === "engineer" ? "/training" : normalizedRole === "viewer" ? "/reports" : "/ai-assistant"}>
                {text("进入当前职责", "Open My Lane")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/platform-config">{text("先做环境校验", "Verify Platform First")}</Link>
            </Button>
          </>
        }
        aside={
          <Card variant="glass" className="h-full border-border/60">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                {text("当前角色", "Current role")}
              </Badge>
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight">
                  {roleLabel(normalizedRole, text)}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {roleLanes.find((lane) => lane.role === normalizedRole)
                    ? text(
                        roleLanes.find((lane) => lane.role === normalizedRole)!.missionZh,
                        roleLanes.find((lane) => lane.role === normalizedRole)!.missionEn,
                      )
                    : text("按职责进入正确页面，再把结果回收到报告或治理链路。", "Enter the right page by role and route results back into reporting or governance.")}
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-sm leading-6 text-muted-foreground">
                {text(
                  "首要原则：先校验，再执行，再沉淀。不要在错误页面里做不属于它的工作。",
                  "Primary rule: verify first, execute next, then package. Do not do the wrong job in the wrong page.",
                )}
              </div>
            </div>
          </Card>
        }
      />

      {notice ? (
        <Card variant="glass" className="mb-6 border-warning/35 bg-warning/5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl border border-warning/30 bg-warning/10 p-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-bold">
                {text("部分工作台数据暂时缺失", "Some workspace data is temporarily unavailable")}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">{notice}</p>
            </div>
          </div>
        </Card>
      ) : null}

      <WorkflowSteps
        title={text("首小时启动清单", "First-hour startup checklist")}
        subtitle={text(
          "借鉴成熟企业工作台的分段启动方式，把“先检查什么、再进入哪里”固定下来，降低新老用户的判断成本。",
          "Borrowing from enterprise workbench startup patterns, this keeps the first checks and next surfaces predictable for every user.",
        )}
        steps={startupSteps}
      />

      {isWorkspaceSkeletonVisible ? (
        <div className="space-y-10">
          <SectionSkeleton title="Loading launchpad" blocks={4} />
          <SectionSkeleton title="Loading role lanes" blocks={4} />
          <SectionSkeleton title="Loading priorities" blocks={3} />
        </div>
      ) : message ? (
        <EmptyStateCard
          icon={<Shield className="h-6 w-6" />}
          title={text("工作台数据暂时不可用", "Workspace data is unavailable")}
          description={message}
          action={<Button onClick={() => window.location.reload()}>{text("重新加载", "Reload")}</Button>}
        />
      ) : (
        <>
          <TaskSection
            eyebrow={text("任务派发", "Task routing")}
            title={text("把常用入口改成可搜索、可分段、可直接派工的启动面板", "Turn common destinations into a searchable, stage-based launchpad")}
            description={text(
              "先通过阶段和搜索收束范围，再进入真正该做事的页面，避免所有人都从同一张模块墙开始找路。",
              "Narrow by stage and search before opening the working surface, instead of making everyone scan the same wall of modules.",
            )}
          >
            <div className="space-y-5">
              <WorkbenchFilterBar
                eyebrow={text("推荐入口", "Recommended launch")}
                title={text("今天先从这些入口开始", "Start with these surfaces today")}
                description={text(
                  "搜索支持标题、职责说明和使用时机，推荐入口会优先保留当前角色更常用的工作面。",
                  "Search covers titles, role notes, and best-use descriptions. Recommended mode keeps the most relevant surfaces for the current role.",
                )}
                searchValue={launchSearch}
                onSearchChange={setLaunchSearch}
                searchPlaceholder={text("搜索模块、分工说明或使用时机", "Search modules, ownership notes, or usage cues")}
                filters={launchFilters}
                summary={text(
                  `已显示 ${filteredLaunchItems.length} 个入口，当前角色为 ${roleLabel(normalizedRole, text)}。`,
                  `${filteredLaunchItems.length} launch items shown for the ${roleLabel(normalizedRole, text)} role.`,
                )}
                action={
                  <Button asChild>
                    <Link href={normalizedRole === "admin" ? "/admin" : normalizedRole === "engineer" ? "/training" : normalizedRole === "viewer" ? "/reports" : "/ai-assistant"}>
                      {text("进入当前主入口", "Open Primary Surface")}
                    </Link>
                  </Button>
                }
                secondaryAction={
                  <Button asChild variant="outline">
                    <Link href="/reports">{text("查看现有交付物", "Review Deliverables")}</Link>
                  </Button>
                }
              />

              {filteredLaunchItems.length ? (
                <div className="grid gap-4 xl:grid-cols-3">
                  {filteredLaunchItems.map((item) => (
                    <Card key={item.id} variant="gradient" className="h-full border-border/60">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div className="rounded-2xl border border-border/60 bg-background/70 p-2.5 text-primary">
                          {item.icon}
                        </div>
                        <Badge variant="secondary">{item.metricValue}</Badge>
                      </div>
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{text(item.stageTitleZh, item.stageTitleEn)}</Badge>
                          <Badge variant={item.isRecommended ? "glow" : "secondary"}>
                            {text(item.audienceZh, item.audienceEn)}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-bold">{text(item.titleZh, item.titleEn)}</h3>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {text(item.descriptionZh, item.descriptionEn)}
                        </p>
                        <div className="rounded-2xl border border-border/60 bg-background/55 p-3 text-sm leading-6 text-muted-foreground">
                          {text(item.reasonZh, item.reasonEn)}
                        </div>
                      </div>
                      <Button asChild className="mt-5 w-fit">
                        <Link href={item.href}>
                          {text("进入模块", "Open Module")}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyStateCard
                  icon={<Database className="h-6 w-6" />}
                  title={text("没有匹配的入口", "No matching surfaces")}
                  description={text(
                    "可以切换阶段筛选，或者直接搜索职责、场景和模块名称。",
                    "Try another stage filter or search using the role, scenario, or module name.",
                  )}
                  action={<Button onClick={() => setLaunchSearch("")}>{text("清空搜索", "Clear Search")}</Button>}
                />
              )}
            </div>
          </TaskSection>

          <TaskSection
            className="mt-10"
            eyebrow={text("角色分工", "Role ownership")}
            title={text("让不同角色看到自己的主责任，同时保留交接边界", "Show each role its primary lane without hiding handoff boundaries")}
            description={text(
              "每张卡都明确了谁来做、在哪做、做完交给谁，避免所有人都盯着同一套页面却不知道谁该收尾。",
              "Each lane clarifies who owns the work, where it happens, and who receives the handoff next.",
            )}
          >
            <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
              {roleLanes.map((lane) => (
                <Card
                  key={lane.role}
                  variant={lane.isActive ? "elevated" : "glass"}
                  className={cn(
                    "h-full border-border/60",
                    lane.isActive && "border-primary/35 shadow-glow-sm",
                  )}
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-2.5 text-primary">
                      {lane.icon}
                    </div>
                    <Badge variant={lane.isActive ? "glow" : "outline"}>
                      {lane.isActive ? text("当前职责", "Current lane") : roleLabel(lane.role, text)}
                    </Badge>
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-xl font-bold">{text(lane.titleZh, lane.titleEn)}</h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {text(lane.missionZh, lane.missionEn)}
                    </p>
                    <div className="rounded-2xl border border-border/60 bg-background/55 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                        {text("成功标准", "Success looks like")}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {text(lane.successZh, lane.successEn)}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                        {text("交接提示", "Handoff note")}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {text(lane.handoffZh, lane.handoffEn)}
                      </p>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{lane.signal}</p>
                  </div>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Button asChild>
                      <Link href={lane.primaryHref}>{text(lane.primaryLabelZh, lane.primaryLabelEn)}</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href={lane.secondaryHref}>{text(lane.secondaryLabelZh, lane.secondaryLabelEn)}</Link>
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TaskSection>

          <TaskSection
            className="mt-10"
            eyebrow={text("今日优先级", "Today priorities")}
            title={text("把真正会拖慢团队的事项排到最前面", "Pull the real team blockers to the top")}
            description={text(
              "这里不是展示所有状态，而是只展示会改变今天决策顺序的事项。",
              "This section does not show everything. It only shows the items that should change today’s decision order.",
            )}
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
              <div className="space-y-4">
                {priorityActions.map((item) => (
                  <Card key={item.id} variant="glass" className="border-border/60">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={priorityBadgeVariant(item.priority)}>
                            {priorityLabel(item.priority, text)}
                          </Badge>
                          <Badge variant="outline">{roleLabel(item.owner, text)}</Badge>
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-bold">{text(item.titleZh, item.titleEn)}</h3>
                          <p className="text-sm leading-6 text-muted-foreground">
                            {text(item.detailZh, item.detailEn)}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-background/55 p-3 text-sm leading-6 text-muted-foreground">
                          {text(item.signalZh, item.signalEn)}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-3">
                        <Button asChild>
                          <Link href={item.href}>{text(item.actionZh, item.actionEn)}</Link>
                        </Button>
                        {item.secondaryHref ? (
                          <Button asChild variant="outline">
                            <Link href={item.secondaryHref}>
                              {text(item.secondaryActionZh ?? "", item.secondaryActionEn ?? "")}
                            </Link>
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              <Card variant="glass" className="border-border/60">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-bold">{text("交接准备度", "Handoff readiness")}</h3>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                    <div className="rounded-2xl border border-border/60 bg-background/55 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                        {text("分析与报告", "Analysis vs reports")}
                      </p>
                      <p className="mt-2 text-2xl font-black tracking-tight">
                        {overview ? `${activitySummary.analysisJobs}/${activitySummary.reports}` : text("载入中", "Loading")}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {text("前者代表讨论量，后者代表可交接成果。两者越接近，复用效率越高。", "The closer analysis volume is to report output, the easier results are to reuse and hand off.")}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/55 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                        {text("训练与版本", "Training vs versions")}
                      </p>
                      <p className="mt-2 text-2xl font-black tracking-tight">
                        {overview ? `${activitySummary.trainingJobs}/${activitySummary.modelVersions}` : text("载入中", "Loading")}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {text("训练任务如果没有沉淀成版本，就很难形成工程资产。", "Training jobs that do not become versions rarely turn into reusable engineering assets.")}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      {text("最近审计活动", "Recent audit activity")}
                    </p>
                    <div className="mt-3 space-y-3">
                      {activitySummary.recentAuditLogs.length ? (
                        activitySummary.recentAuditLogs.map((log) => (
                          <div key={log.id} className="rounded-2xl border border-border/60 bg-background/55 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-semibold">{log.action}</span>
                              <Badge variant="outline">{log.role}</Badge>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">{log.detail}</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {text("暂时没有最近审计活动。", "No recent audit activity is available yet.")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </TaskSection>

          <TaskSection
            className="mt-10"
            eyebrow={text("系统姿态", "System posture")}
            title={text("只留下会影响今天判断的信息", "Keep only the posture signals that affect today’s choices")}
            description={text(
              "这一层不再重复页面内容，而是告诉团队今天是否可以放心推进、要不要优先治理、是否该把结论尽快沉淀成产物。",
              "This layer avoids re-listing page content. It tells the team whether work can safely advance, whether governance comes first, and whether conclusions should be packaged quickly.",
            )}
          >
            <div className="grid gap-4 xl:grid-cols-3">
              <Card variant="gradient" className="border-border/60">
                <div className="flex items-center gap-3">
                  <Bot className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold">{text("AI 供给", "AI supply")}</h3>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {overview
                    ? text(
                        `当前共有 ${activitySummary.providers} 个模型供应配置可用，适合先用 AI 助手收束问题，再决定是否进入训练或治理。`,
                        `${activitySummary.providers} provider profiles are available, so the team can use AI Assistant to narrow the issue before escalating to training or governance.`,
                      )
                    : text("正在载入供应商与策略状态。", "Loading provider and strategy posture.")}
                </p>
              </Card>

              <Card variant="gradient" className="border-border/60">
                <div className="flex items-center gap-3">
                  <BrainCircuit className="h-5 w-5 text-warning" />
                  <h3 className="text-lg font-bold">{text("执行压力", "Execution pressure")}</h3>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {overview
                    ? text(
                        `目前已有 ${activitySummary.analysisJobs} 条分析任务与 ${activitySummary.trainingJobs} 条训练任务，优先把高频结论收束成报告与版本，避免重复劳动。`,
                        `${activitySummary.analysisJobs} analysis jobs and ${activitySummary.trainingJobs} training jobs are in play. Package repeated conclusions into reports and versions first.`,
                      )
                    : text("正在载入分析与训练压力。", "Loading analysis and training pressure.")}
                </p>
              </Card>

              <Card variant="gradient" className="border-border/60">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <h3 className="text-lg font-bold">{text("交付准备度", "Delivery readiness")}</h3>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {overview
                    ? text(
                        `当前已有 ${activitySummary.reports} 个报告产物和 ${activitySummary.modelVersions} 个模型版本，适合把工作结果沉淀进交接链路。`,
                        `${activitySummary.reports} report artifacts and ${activitySummary.modelVersions} model versions are available for formal handoff.`,
                      )
                    : text("正在载入交付与版本沉淀状态。", "Loading delivery and version posture.")}
                </p>
              </Card>
            </div>
          </TaskSection>
        </>
      )}
    </div>
  );
}
