"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import WorkflowSteps, {
  type WorkflowStep,
} from "../components/Layout/WorkflowSteps";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
import { readStoredAuthSession } from "@/lib/auth-session";
import { getBackendApiBase } from "@/lib/dashboard-client";
import { enterpriseErrorMessage, enterpriseGet } from "@/lib/enterprise-client";
import type { EnterpriseOverview } from "@/types/enterprise";
import type { UserRole } from "@/types/auth";

type HealthPayload = {
  backend: { status: string };
  aiMl: { status: string; baseUrl: string };
};

type WorkspaceCard = {
  href: string;
  titleKey: string;
  descriptionKey: string;
  metric: "providers" | "sources" | "reports" | "training" | "health";
  roles?: Array<Exclude<UserRole, "user">>;
};

const WORKSPACE_CARDS_BASE: WorkspaceCard[] = [
  {
    href: "/ai-assistant",
    titleKey: "pages.workspace.card.aiAssistant.title",
    descriptionKey: "pages.workspace.card.aiAssistant.description",
    metric: "providers",
  },
  {
    href: "/data-hub",
    titleKey: "pages.workspace.card.dataHub.title",
    descriptionKey: "pages.workspace.card.dataHub.description",
    metric: "sources",
  },
  {
    href: "/reports",
    titleKey: "pages.workspace.card.reportCenter.title",
    descriptionKey: "pages.workspace.card.reportCenter.description",
    metric: "reports",
  },
  {
    href: "/training",
    titleKey: "pages.workspace.card.trainingCenter.title",
    descriptionKey: "pages.workspace.card.trainingCenter.description",
    metric: "training",
    roles: ["admin", "engineer"],
  },
  {
    href: "/annotation",
    titleKey: "pages.workspace.card.annotationStudio.title",
    descriptionKey: "pages.workspace.card.annotationStudio.description",
    metric: "sources",
    roles: ["admin", "engineer", "operator"],
  },
  {
    href: "/platform-config",
    titleKey: "pages.workspace.card.endpointConfig.title",
    descriptionKey: "pages.workspace.card.endpointConfig.description",
    metric: "health",
  },
];

function localizeHealthStatus(
  status: string | undefined,
  t: (
    key: string,
    values?: Record<string, string | number>,
    fallback?: string,
  ) => string,
): string {
  if (!status) return t("pages.workspace.health.unknown");
  const statusMap: Record<string, string> = {
    up: "pages.workspace.health.healthy",
    down: "pages.workspace.health.down",
    Healthy: "pages.workspace.health.healthy",
    "Backend only": "pages.workspace.health.backendOnly",
    "Probe needed": "pages.workspace.health.probeNeeded",
    "Needs attention": "pages.workspace.health.needsAttention",
  };
  const mapped = statusMap[status];
  return mapped ? t(mapped) : status;
}

export default function WorkspacePage() {
  const ready = useSessionGuard(["admin", "engineer", "operator", "viewer"]);
  const router = useRouter();
  const { locale, text, t } = useLocale();
  const [overview, setOverview] = useState<EnterpriseOverview | null>(null);
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [message, setMessage] = useState("");
  const [sessionRole, setSessionRole] = useState<UserRole | null>(null);

  const normalizedRole: Exclude<UserRole, "user"> =
    sessionRole === "user" || !sessionRole ? "operator" : sessionRole;

  useEffect(() => {
    setSessionRole(readStoredAuthSession()?.role ?? null);
  }, []);

  useEffect(() => {
    if (!ready) return;

    const load = async () => {
      try {
        const [overviewData, healthResponse] = await Promise.all([
          enterpriseGet<EnterpriseOverview>("/enterprise/overview"),
          fetch(`${getBackendApiBase()}/health`, { cache: "no-store" }),
        ]);

        let healthData: HealthPayload | null = null;
        if (healthResponse.ok) {
          const payload = (await healthResponse.json()) as {
            data?: HealthPayload;
          };
          healthData = payload.data ?? null;
        }

        setOverview(overviewData);
        setHealth(healthData);
        setMessage("");
      } catch (error) {
        setMessage(enterpriseErrorMessage(error, t("pages.workspace.copy002")));
      }
    };

    load().catch(console.error);
  }, [ready, t]);

  const cards = useMemo(() => {
    const metrics = {
      providers: overview?.providers.length ?? 0,
      sources: overview?.dataSources.length ?? 0,
      reports: overview?.reports.length ?? 0,
      training: overview?.trainingJobs.length ?? 0,
      health:
        health?.backend.status === "up" && health?.aiMl.status === "up"
          ? localizeHealthStatus("Healthy", t)
          : health?.backend.status === "up"
            ? localizeHealthStatus("Backend only", t)
            : localizeHealthStatus("Probe needed", t),
    };

    return WORKSPACE_CARDS_BASE.filter(
      (item) => !item.roles || item.roles.includes(normalizedRole),
    ).map((item) => ({
      ...item,
      title: t(item.titleKey),
      description: t(item.descriptionKey),
      metricValue:
        item.metric === "health"
          ? String(metrics.health)
          : String(
              metrics[
                item.metric as "providers" | "sources" | "reports" | "training"
              ],
            ),
    }));
  }, [
    health?.aiMl.status,
    health?.backend.status,
    locale,
    normalizedRole,
    overview,
    t,
  ]);

  const workflowSteps = useMemo<WorkflowStep[]>(() => {
    const healthReady =
      health?.backend.status === "up" && health?.aiMl.status === "up";
    const moduleCount = cards.length;

    return [
      {
        id: "workspace-health-step",
        title: text("检查系统状态", "Check health"),
        detail: healthReady
          ? text("后端与 AI/ML 服务均在线", "Backend and AI/ML online")
          : text("请先校验服务链路", "Validate service links"),
        state: healthReady ? "done" : "active",
      },
      {
        id: "workspace-module-step",
        title: text("选择模块", "Choose module"),
        detail: text(
          `当前角色可用 ${moduleCount} 个模块`,
          `${moduleCount} modules available for your role`,
        ),
        state: moduleCount > 0 ? "active" : "upcoming",
      },
      {
        id: "workspace-execute-step",
        title: text("执行任务", "Execute task"),
        detail: text(
          "进入 AI、数据、报告或训练路径继续处理。",
          "Open AI, Data, Reports, or Training path",
        ),
        state: moduleCount > 0 ? "active" : "upcoming",
      },
      {
        id: "workspace-config-step",
        title: text("调整端点", "Tune endpoint"),
        detail: text(
          "当服务商或接口地址变化时，在此更新配置。",
          "Use config when providers or APIs change",
        ),
        state: healthReady ? "upcoming" : "active",
        onClick: () => router.push("/platform-config"),
      },
    ];
  }, [cards.length, health?.aiMl.status, health?.backend.status, router, text]);

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/login"
        title={text("正在加载智能工作台", "Loading Workspace")}
        description={text(
          "正在校验会话并准备工作流界面...",
          "Verifying session and preparing workflow workspace...",
        )}
      />
    );
  }

  return (
    <div className="enterprise-shell">
      <BackButton
        fallbackHref={normalizedRole === "admin" ? "/admin" : "/home"}
      />

      <section className="enterprise-hero workspace-hero">
        <div>
          <span className="eyebrow">
            {text("智能工作台", "Intelligence Workspace")}
          </span>
          <h1>{text("统一 AI 工作流入口", "Unified AI Workflow Hub")}</h1>
          <p>
            {text(
              "从检测输入到分析结论与报告导出，统一在这里完成。",
              "One entry from inspection input to analysis and report exports.",
            )}
          </p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>{t("pages.ai_assistant.copy071")}</span>
            <strong>{overview?.providers.length ?? "--"}</strong>
          </div>
          <div>
            <span>{t("pages.ai_assistant.copy078")}</span>
            <strong>{overview?.dataSources.length ?? "--"}</strong>
          </div>
          <div>
            <span>{t("pages.ai_assistant.copy076")}</span>
            <strong>{overview?.analysisJobs.length ?? "--"}</strong>
          </div>
          <div>
            <span>{text("工作流健康度", "Workflow health")}</span>
            <strong>
              {health?.backend.status === "up" && health?.aiMl.status === "up"
                ? localizeHealthStatus("Healthy", t)
                : localizeHealthStatus("Needs attention", t)}
            </strong>
          </div>
        </div>
      </section>

      <WorkflowSteps
        title={text("工作台流程", "Workspace Flow")}
        subtitle={text(
          "按此顺序操作，可让分析与汇报结果更稳定。",
          "Use this sequence for more stable analysis and reporting outcomes.",
        )}
        steps={workflowSteps}
      />

      {message ? <div className="auth-message">{message}</div> : null}

      <Card className="enterprise-main-card workspace-health-panel">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">
              {text("系统状态", "System Health")}
            </span>
            <h2>{text("后端与 AI/ML 连通状态", "Backend and AI/ML Link Status")}</h2>
          </div>
          <button
            type="button"
            className="enterprise-secondary-button"
            onClick={() => router.push("/platform-config")}
          >
            {text("打开配置", "Open Config")}
          </button>
        </div>

        <div className="workspace-health-grid">
          <div className="workspace-health-item">
            <span>{text("后端", "Backend")}</span>
            <strong
              className={`status-chip ${
                health?.backend.status === "up"
                  ? "status-success"
                  : "status-danger"
              }`}
            >
              {localizeHealthStatus(health?.backend.status, t)}
            </strong>
          </div>
          <div className="workspace-health-item">
            <span>{text("AI/ML", "AI/ML")}</span>
            <strong
              className={`status-chip ${
                health?.aiMl.status === "up"
                  ? "status-success"
                  : "status-danger"
              }`}
            >
              {localizeHealthStatus(health?.aiMl.status, t)}
            </strong>
          </div>
          <div className="workspace-health-item workspace-health-endpoint">
            <span>{text("当前 AI/ML 端点", "Current AI/ML endpoint")}</span>
            <strong>
              {health?.aiMl.baseUrl ??
                text("请到配置页探测端点可用性", "Probe endpoint availability from config page")}
            </strong>
          </div>
        </div>
      </Card>

      <section className="enterprise-grid workspace-module-grid">
        {cards.map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="enterprise-source-card workspace-module-card"
          >
            <div className="workspace-module-copy">
              <strong>{card.title}</strong>
              <span>{card.description}</span>
            </div>
            <div className="workspace-module-footer">
              <em className="workspace-module-metric">{card.metricValue}</em>
              <span className="workspace-module-action">
                {text("进入模块", "Open module")}
              </span>
            </div>
          </a>
        ))}
      </section>
    </div>
  );
}
