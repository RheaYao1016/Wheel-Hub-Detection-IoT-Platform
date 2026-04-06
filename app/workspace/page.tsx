"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
import { readStoredAuthSession } from "@/lib/auth-session";
import { enterpriseGet } from "@/lib/enterprise-client";
import type { AnnotationProject, ChatSession, EnterpriseOverview } from "@/types/enterprise";

type NormalizedRole = "admin" | "engineer" | "operator" | "viewer" | null;

function normalizeRole(role: string | null | undefined): NormalizedRole {
  if (role === "user") return "operator";
  if (role === "admin" || role === "engineer" || role === "operator" || role === "viewer") {
    return role;
  }
  return null;
}

export default function WorkspacePage() {
  const ready = useSessionGuard(["admin", "engineer", "operator", "viewer"]);
  const { text, locale } = useLocale();
  const [overview, setOverview] = useState<EnterpriseOverview | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [annotationProjects, setAnnotationProjects] = useState<AnnotationProject[]>([]);
  const [role, setRole] = useState<NormalizedRole>(null);
  const [error, setError] = useState("");
  const [loadingState, setLoadingState] = useState(text("正在连接后端服务...", "Connecting to backend services..."));

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const isTransientLoadError = (loadError: unknown) =>
      loadError instanceof Error &&
      (/Unable to reach the backend service/i.test(loadError.message) ||
        /timed out/i.test(loadError.message) ||
        /Failed to fetch/i.test(loadError.message));

    const load = async (attempt = 1) => {
      try {
        if (active) {
          setLoadingState(
            attempt > 1
              ? text(`正在重试连接后端（第 ${attempt} 次）...`, `Retrying backend connection (attempt ${attempt})...`)
              : text("正在连接后端服务...", "Connecting to backend services..."),
          );
        }

        const localRole = normalizeRole(readStoredAuthSession()?.role ?? null);
        if (active) {
          setRole(localRole);
        }

        const [overviewData, sessionData] = await Promise.all([
          enterpriseGet<EnterpriseOverview>("/enterprise/overview"),
          enterpriseGet<ChatSession[]>("/ai/chat/sessions"),
        ]);

        if (!active) return;

        setOverview(overviewData);
        setSessions(sessionData);
        setError("");
        setLoadingState("");

        if (localRole && localRole !== "viewer") {
          try {
            const projectData = await enterpriseGet<AnnotationProject[]>("/annotation/projects");
            if (active) {
              setAnnotationProjects(projectData);
            }
          } catch (annotationError) {
            console.error(annotationError);
          }
        }
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        if (isTransientLoadError(loadError) && attempt < 10) {
          await wait(Math.min(1800, 600 + attempt * 180));
          if (active) {
            load(attempt + 1);
          }
          return;
        }
        if (attempt < 4) {
          await wait(900);
          if (active) {
            load(attempt + 1);
          }
          return;
        }
        setLoadingState("");
        setError(
          text(
            "加载智能工作台失败，请确认后端运行正常且当前会话仍然有效。",
            "Failed to load the Enterprise Workspace. Make sure the backend is running and your session is still valid.",
          ),
        );
      }
    };

    load();

    return () => {
      active = false;
    };
  }, [ready, text]);

  const dataHubSummary = useMemo(() => {
    const items = overview?.dataSources ?? [];
    return {
      total: items.length,
      aGradeCount: items.filter((item) => item.qualityScore === "A").length,
      latest: items[0] ?? null,
    };
  }, [overview]);

  const reportSummary = useMemo(() => {
    const jobs = overview?.analysisJobs ?? [];
    const reports = overview?.reports ?? [];
    return {
      jobsCount: jobs.length,
      reportsCount: reports.length,
      highRiskCount: jobs.filter((job) => job.result?.riskLevel === "high").length,
      latestJob: jobs[0] ?? null,
    };
  }, [overview]);

  const trainingSummary = useMemo(() => {
    const jobs = overview?.trainingJobs ?? [];
    const models = overview?.modelVersions ?? [];
    return {
      jobsCount: jobs.length,
      modelsCount: models.length,
      latestJob: jobs[0] ?? null,
      latestModel: models[0] ?? null,
    };
  }, [overview]);

  const aiSummary = useMemo(() => {
    const providers = overview?.providers ?? [];
    const presets = overview?.promptPresets ?? [];
    const latestProvider = providers[0] ?? null;
    const providerReady = Boolean(
      latestProvider?.baseUrl && latestProvider.baseUrl !== "https://api.openai.com/v1"
        ? latestProvider.baseUrl
        : latestProvider?.apiKeyMasked,
    );
    return {
      providersCount: providers.length,
      promptPresetCount: presets.length,
      sessionsCount: sessions.length,
      latestProvider,
      providerReady,
      latestSession: sessions[0] ?? null,
    };
  }, [overview, sessions]);

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/home"
        title={text("正在加载智能工作台", "Loading Enterprise Workspace")}
        description={text("正在校验会话并准备 AI、数据、报告和训练入口布局...", "Verifying the session and preparing AI, data, report, and training entry layout...")}
      />
    );
  }

  return (
    <div className="enterprise-shell workspace-shell">
      <BackButton fallbackHref="/home" />

      <section className="enterprise-hero">
        <div>
          <span className="eyebrow">{text("智能工作台", "Enterprise Workspace")}</span>
          <h1>{text("AI、数据、报告、训练与标注的一站式入口", "One entrance for AI, data, reports, training, and annotation")}</h1>
          <p>
            {text(
              "这里是工作台总览页，只展示摘要。详细数据和动作都保留在最相关的子页面里，避免同一份数据在多个菜单里重复出现。",
              "This page is the operational summary only. Detailed data and actions stay inside the most relevant sub-pages so the same dataset is not repeated across multiple menus.",
            )}
          </p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>{text("模型服务", "Providers")}</span>
            <strong>{aiSummary.providersCount}</strong>
          </div>
          <div>
            <span>{text("数据源", "Sources")}</span>
            <strong>{dataHubSummary.total}</strong>
          </div>
          <div>
            <span>{text("训练任务", "Training jobs")}</span>
            <strong>{trainingSummary.jobsCount}</strong>
          </div>
        </div>
      </section>

      {loadingState ? (
        <div className="empty-state">
          <span>...</span>
          {loadingState}
        </div>
      ) : null}

      {error ? (
        <div className="empty-state">
          <span>!</span>
          {error}
        </div>
      ) : null}

      <section className="workspace-quick-links">
        <Link href="/ai-assistant" className="enterprise-chip">{text("AI 助手", "AI Assistant")}</Link>
        <Link href="/data-hub" className="enterprise-chip">{text("数据中心", "Data Hub")}</Link>
        <Link href="/reports" className="enterprise-chip">{text("报告中心", "Report Center")}</Link>
        <Link href="/training" className="enterprise-chip">{text("训练中心", "Training Center")}</Link>
        <Link href="/annotation" className="enterprise-chip">{text("标注工作台", "Annotation Studio")}</Link>
      </section>

      <section className="workspace-capability-grid">
        <Card className="workspace-capability-card">
          <div className="workspace-capability-top">
            <div>
              <span className="panel-kicker">{text("AI 助手", "AI Assistant")}</span>
              <h2>{text("对话与正式诊断", "Chat and formal diagnosis")}</h2>
            </div>
            <span className="status-chip status-success">
              {aiSummary.providersCount} {text("个服务", "providers")}
            </span>
          </div>
          <div className="workspace-capability-meta">
            <div>
              <span>{text("会话数", "Sessions")}</span>
              <strong>{aiSummary.sessionsCount}</strong>
            </div>
            <div>
              <span>{text("提示词预设", "Prompt presets")}</span>
              <strong>{aiSummary.promptPresetCount}</strong>
            </div>
            <div>
              <span>{text("服务状态", "Provider status")}</span>
              <strong>{aiSummary.providerReady ? text("已配置", "Configured") : text("需要 API Key", "Needs API key")}</strong>
            </div>
          </div>
          <div className="enterprise-note-card">
            <strong>{aiSummary.latestSession?.title ?? aiSummary.latestProvider?.name ?? text("尚未配置服务", "No provider configured yet")}</strong>
            <span>
              {aiSummary.latestSession?.lastMessagePreview ??
                (aiSummary.providerReady
                  ? text(
                      "模型服务已配置。进入 AI 助手后可以测试连通性、发起提问，或者创建正式诊断。",
                      "The provider is configured. Open the AI Assistant to test connectivity, ask a question, or create a formal diagnosis.",
                    )
                  : text(
                      "请先在 AI 助手中添加真实的 API Key 与模型配置，再运行实时分析。",
                      "Add a real API key and model in the AI Assistant before running live analysis.",
                    ))}
            </span>
          </div>
          <div className="workspace-capability-actions">
            <Link href="/ai-assistant" className="enterprise-primary-button">{text("进入 AI 助手", "Open AI Assistant")}</Link>
          </div>
        </Card>

        <Card className="workspace-capability-card">
          <div className="workspace-capability-top">
            <div>
              <span className="panel-kicker">{text("数据中心", "Data Hub")}</span>
              <h2>{text("已分析的数据接入", "Profiled source intake")}</h2>
            </div>
            <span className="status-chip status-success">{text("统一数据注册", "Single source registry")}</span>
          </div>
          <div className="workspace-capability-meta">
            <div>
              <span>{text("A级数据源", "A-grade sources")}</span>
              <strong>{dataHubSummary.aGradeCount}</strong>
            </div>
            <div>
              <span>{text("最新数据源", "Latest source")}</span>
              <strong>{dataHubSummary.latest?.type?.toUpperCase() ?? "--"}</strong>
            </div>
          </div>
          <div className="enterprise-note-card">
            <strong>{dataHubSummary.latest?.name ?? text("暂无数据源", "No source yet")}</strong>
            <span>
              {dataHubSummary.latest?.connectionMeta.analysisSummary ??
                text("创建或上传一个数据源后，系统会生成真实 profiling 摘要与分析建议。", "Create or upload a source to generate a real profile with analysis hints.")}
            </span>
          </div>
          <div className="workspace-capability-actions">
            <Link href="/data-hub" className="enterprise-primary-button">{text("进入数据中心", "Open Data Hub")}</Link>
          </div>
        </Card>

        <Card className="workspace-capability-card">
          <div className="workspace-capability-top">
            <div>
              <span className="panel-kicker">{text("报告中心", "Report Center")}</span>
              <h2>{text("正式输出与导出", "Formal output and export")}</h2>
            </div>
            <span className={`status-chip ${reportSummary.highRiskCount ? "status-warning" : "status-success"}`}>
              {text("高风险", "High risk")} {reportSummary.highRiskCount}
            </span>
          </div>
          <div className="workspace-capability-meta">
            <div>
              <span>{text("分析任务", "Analysis jobs")}</span>
              <strong>{reportSummary.jobsCount}</strong>
            </div>
            <div>
              <span>{text("报告数", "Reports")}</span>
              <strong>{reportSummary.reportsCount}</strong>
            </div>
          </div>
          <div className="enterprise-note-card">
            <strong>{reportSummary.latestJob?.result.headline ?? text("暂无正式诊断", "No diagnosis yet")}</strong>
            <span>
              {reportSummary.latestJob?.result.summary ??
                text("先创建一次正式分析，再把同一套结论导出为多种格式。", "Create a formal analysis once, then export the same conclusion in multiple formats.")}
            </span>
          </div>
          <div className="workspace-capability-actions">
            <Link href="/reports" className="enterprise-primary-button">{text("进入报告中心", "Open Report Center")}</Link>
          </div>
        </Card>

        <Card className="workspace-capability-card">
          <div className="workspace-capability-top">
            <div>
              <span className="panel-kicker">{text("训练中心", "Training Center")}</span>
              <h2>{text("模型训练与版本管理", "Model execution and versioning")}</h2>
            </div>
            <span className="status-chip status-success">
              {trainingSummary.modelsCount} {text("个版本", "versions")}
            </span>
          </div>
          <div className="workspace-capability-meta">
            <div>
              <span>{text("任务数", "Jobs")}</span>
              <strong>{trainingSummary.jobsCount}</strong>
            </div>
            <div>
              <span>{text("最新模型", "Latest model")}</span>
              <strong>{trainingSummary.latestModel?.name ?? "--"}</strong>
            </div>
          </div>
          <div className="enterprise-note-card">
            <strong>{trainingSummary.latestJob?.baseModel ?? text("暂无训练任务", "No training run yet")}</strong>
            <span>
              {trainingSummary.latestJob
                ? `${trainingSummary.latestJob.deviceMode} / ${trainingSummary.latestJob.epochCount} epochs / ${trainingSummary.latestJob.status}`
                : text("先从标注工作台导出 YOLO 数据集，再在这里发起真实训练。", "Export a YOLO dataset from the Annotation Studio, then launch a real training run here.")}
            </span>
          </div>
          <div className="workspace-capability-actions">
            <Link href="/training" className="enterprise-primary-button">{text("进入训练中心", "Open Training Center")}</Link>
          </div>
        </Card>

        <Card className="workspace-capability-card">
          <div className="workspace-capability-top">
            <div>
              <span className="panel-kicker">{text("标注工作台", "Annotation Studio")}</span>
              <h2>{text("图像标注流程", "Image labeling workflow")}</h2>
            </div>
            <span className="status-chip status-success">
              {annotationProjects.length} {text("个项目", "projects")}
            </span>
          </div>
          <div className="workspace-capability-meta">
            <div>
              <span>{text("当前角色", "Role")}</span>
              <strong>{role ?? "viewer"}</strong>
            </div>
            <div>
              <span>{text("最新项目", "Latest project")}</span>
              <strong>{annotationProjects[0]?.name ?? "--"}</strong>
            </div>
          </div>
          <div className="enterprise-note-card">
            <strong>{annotationProjects[0]?.name ?? text("暂无标注项目", "No annotation project yet")}</strong>
            <span>
              {annotationProjects[0]?.description ??
                text("创建轻量项目，上传 train/val/test 图片，绘制框并导出到训练中心。", "Create a lightweight project, upload images into train/val/test, draw boxes, and export the dataset into training.")}
            </span>
          </div>
          <div className="workspace-capability-actions">
            <Link href="/annotation" className="enterprise-primary-button">{text("进入标注工作台", "Open Annotation Studio")}</Link>
          </div>
        </Card>
      </section>

      <div className="panel-caption" style={{ marginTop: "1rem" }}>
        {locale === "zh-CN"
          ? "AI 助手、数据中心、报告中心、训练中心和标注工作台已统一接入全局中英文切换。"
          : "AI Assistant, Data Hub, Report Center, Training Center, and Annotation Studio now share the same global bilingual switch."}
      </div>
    </div>
  );
}
