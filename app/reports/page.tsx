"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  FileSpreadsheet,
  FileText,
  FileType,
  FolderOpen,
  Package,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import EmptyStateCard from "../components/Layout/EmptyStateCard";
import PagedBlockControls, {
  getPagedItems,
} from "../components/Layout/PagedBlockControls";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import TaskSection from "../components/Layout/TaskSection";
import WorkflowHero from "../components/Layout/WorkflowHero";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Checkbox } from "../components/ui/Checkbox";
import { Progress } from "../components/ui/Progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/Select";
import { Textarea } from "../components/ui/Textarea";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
import {
  enterpriseDownload,
  enterpriseErrorMessage,
  enterpriseGet,
  enterprisePost,
} from "@/lib/enterprise-client";
import { buildGovernanceHandoffSearch } from "@/lib/governance-handoff";
import { parseReportHandoffSearch, type ReportHandoffPayload } from "@/lib/report-handoff";
import type {
  AiProviderProfile,
  AnalysisJob,
  DataSourceProfile,
  PromptPreset,
  ReportArtifact,
} from "@/types/enterprise";

const REPORT_TEMPLATES = [
  {
    id: "quality-variance",
    nameZh: "质量差异分析",
    nameEn: "Quality variance",
    icon: <BarChart3 className="h-5 w-5" />,
    descriptionZh: "用来解释质量波动、异常批次和缺陷占比。",
    descriptionEn: "Explain quality fluctuation, abnormal batches, and defect share.",
    prompt:
      "分析质量趋势、异常批次、缺陷分布和主要风险因子，并生成面向管理层的建议。",
  },
  {
    id: "defect-trend",
    nameZh: "缺陷趋势预测",
    nameEn: "Defect forecasting",
    icon: <Sparkles className="h-5 w-5" />,
    descriptionZh: "用来提前识别缺陷上升趋势和预警信号。",
    descriptionEn: "Detect early signals for defect growth and warning pressure.",
    prompt:
      "基于时间序列、批次和设备上下文预测缺陷变化，并给出预警建议。",
  },
  {
    id: "shift-efficiency",
    nameZh: "班次效率对比",
    nameEn: "Shift efficiency",
    icon: <Zap className="h-5 w-5" />,
    descriptionZh: "比较班次、换型和节拍差异。",
    descriptionEn: "Compare shifts, changeovers, and cadence differences.",
    prompt:
      "比较不同班次的产量、质量和停机表现，找出效率差异及改进建议。",
  },
  {
    id: "equipment-health",
    nameZh: "设备健康诊断",
    nameEn: "Equipment health",
    icon: <Target className="h-5 w-5" />,
    descriptionZh: "评估设备状态与维护风险。",
    descriptionEn: "Assess equipment state and maintenance risk.",
    prompt:
      "结合设备运行、温度和质量影响因素，输出维护优先级和建议动作。",
  },
];

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function fileIcon(format: string) {
  if (format === "docx" || format === "pdf") return <FileText className="h-5 w-5" />;
  if (format === "xlsx") return <FileSpreadsheet className="h-5 w-5" />;
  if (format === "csv") return <FileType className="h-5 w-5" />;
  return <Package className="h-5 w-5" />;
}

export default function ReportsPage() {
  const ready = useSessionGuard(["admin", "engineer", "operator", "viewer"]);
  const { text } = useLocale();
  const [providers, setProviders] = useState<AiProviderProfile[]>([]);
  const [promptPresets, setPromptPresets] = useState<PromptPreset[]>([]);
  const [sources, setSources] = useState<DataSourceProfile[]>([]);
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [reports, setReports] = useState<ReportArtifact[]>([]);
  const [providerId, setProviderId] = useState("");
  const [promptPresetId, setPromptPresetId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(REPORT_TEMPLATES[0].id);
  const [persona, setPersona] = useState("manager");
  const [verbosity, setVerbosity] = useState("standard");
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState("");
  const [message, setMessage] = useState("");
  const [handoff, setHandoff] = useState<ReportHandoffPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [jobPage, setJobPage] = useState(0);
  const [reportPage, setReportPage] = useState(0);
  const [jobsExpanded, setJobsExpanded] = useState(true);
  const [reportsExpanded, setReportsExpanded] = useState(true);

  const selectedTemplate =
    REPORT_TEMPLATES.find((template) => template.id === selectedTemplateId) ??
    REPORT_TEMPLATES[0];
  const selectedPromptPreset =
    promptPresets.find((preset) => preset.id === promptPresetId) ??
    promptPresets[0] ??
    null;

  const pagedJobs = useMemo(() => getPagedItems(jobs, jobPage, 4), [jobs, jobPage]);
  const pagedReports = useMemo(() => getPagedItems(reports, reportPage, 8), [reports, reportPage]);

  const load = async () => {
    const [providerData, presetData, sourceData, jobData, reportData] =
      await Promise.all([
        enterpriseGet<AiProviderProfile[]>("/ai/providers"),
        enterpriseGet<PromptPreset[]>("/ai/prompt-presets"),
        enterpriseGet<DataSourceProfile[]>("/data-sources"),
        enterpriseGet<AnalysisJob[]>("/analysis/jobs"),
        enterpriseGet<ReportArtifact[]>("/reports"),
      ]);
    setProviders(providerData);
    setPromptPresets(presetData);
    setSources(sourceData);
    setJobs(jobData);
    setReports(reportData);
    setProviderId((current) => current || providerData[0]?.id || "");
    setPromptPresetId(
      (current) =>
        current ||
        presetData.find((item) => item.id === "report-author")?.id ||
        presetData[0]?.id ||
        "",
    );
    setSelectedSourceIds((current) =>
      current.length ? current : sourceData.slice(0, 2).map((item) => item.id),
    );
  };

  useEffect(() => {
    if (!ready) return;

    load().catch((error) => {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, text("加载失败", "Failed to load reports workspace.")));
    });
  }, [ready, text]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const handoffPayload = parseReportHandoffSearch(params);
    const sourceId = params.get("sourceId");
    const template = params.get("template");
    const prompt = params.get("prompt");

    if (handoffPayload) {
      setHandoff(handoffPayload);
      if (handoffPayload.sourceIds?.length) {
        setSelectedSourceIds(handoffPayload.sourceIds);
      }
      if (handoffPayload.providerId) {
        setProviderId(handoffPayload.providerId);
      }
      if (handoffPayload.promptPresetId) {
        setPromptPresetId(handoffPayload.promptPresetId);
      }
      if (handoffPayload.persona) {
        setPersona(handoffPayload.persona);
      }
      if (handoffPayload.verbosity) {
        setVerbosity(handoffPayload.verbosity);
      }
    }

    if (sourceId) {
      setSelectedSourceIds([sourceId]);
    }
    if (template && REPORT_TEMPLATES.some((item) => item.id === template)) {
      setSelectedTemplateId(template);
    }
    if (prompt) {
      setCustomPrompt(prompt);
    }
  }, []);

  useEffect(() => {
    if (!handoff || !promptPresets.length) return;
    if (!handoff.promptPresetId) return;
    const recommendedTemplate = promptPresets.find(
      (preset) => preset.id === handoff.promptPresetId,
    )?.recommendedTemplate;
    if (
      recommendedTemplate &&
      REPORT_TEMPLATES.some((item) => item.id === recommendedTemplate)
    ) {
      setSelectedTemplateId(recommendedTemplate);
    }
  }, [handoff, promptPresets]);

  const toggleSource = (sourceId: string) => {
    setSelectedSourceIds((current) =>
      current.includes(sourceId)
        ? current.filter((item) => item !== sourceId)
        : [...current, sourceId],
    );
  };

  const simulateAnalysisProgress = async () => {
    setAnalyzing(true);
    setAnalysisProgress(0);

    const stages = [12, 28, 46, 68, 84, 100];
    for (const progress of stages) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      setAnalysisProgress(progress);
    }
  };

  const handleCreateAnalysis = async () => {
    if (!providerId || !selectedSourceIds.length) {
      setMessage(text("请至少选择一个数据源和模型服务。", "Select at least one source and one provider."));
      return;
    }

    setLoading(true);
    try {
      await simulateAnalysisProgress();

      const created = await enterprisePost<AnalysisJob>("/analysis/jobs", {
        prompt: customPrompt.trim() || selectedTemplate.prompt,
        template: selectedTemplate.id,
        verbosity,
        providerId,
        persona,
        locale: "zh-CN",
        promptPresetId: promptPresetId || promptPresets[0]?.id || "report-author",
        sourceIds: selectedSourceIds,
      });
      setJobs((current) => [created, ...current]);
      setMessage(
        text(
          `已创建 ${selectedTemplate.nameZh} 分析任务。`,
          `${selectedTemplate.nameEn} analysis job created.`,
        ),
      );
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, text("创建分析任务失败", "Failed to create analysis job.")));
    } finally {
      setLoading(false);
      setAnalyzing(false);
      setAnalysisProgress(0);
    }
  };

  const handleCreateReport = async (jobId: string, format: string) => {
    setLoading(true);
    try {
      const created = await enterprisePost<ReportArtifact>(
        `/analysis/jobs/${jobId}/reports`,
        { format },
      );
      setReports((current) => [created, ...current]);
      setMessage(
        text(
          `${format.toUpperCase()} 报告已生成。`,
          `${format.toUpperCase()} report generated.`,
        ),
      );
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, text("生成报告失败", "Failed to generate report.")));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (report: ReportArtifact) => {
    try {
      setMessage(text(`正在下载 ${report.filename}...`, `Downloading ${report.filename}...`));
      const blob = await enterpriseDownload(`/reports/${report.id}/download`);
      saveBlob(blob, report.filename);
      setMessage(text(`${report.filename} 已下载完成`, `${report.filename} downloaded.`));
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, text("下载失败", "Download failed.")));
    }
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/workspace"
        title={text("智能报告中心", "AI report center")}
        description={text(
          "正在准备分析模板、数据源与报告资产…",
          "Preparing analysis templates, data sources, and report assets...",
        )}
      />
    );
  }

  return (
    <div className="relative mx-auto max-w-[1920px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary/10 blur-[110px]" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-accent/10 blur-[110px]" />
      </div>

      <BackButton fallbackHref="/workspace" />

      <WorkflowHero
        eyebrow={text("报告中心", "Report center")}
        title={text(
          "把分析、报告生成和交付文件放到一条明确链路里",
          "Put analysis, report generation, and delivery files into one clear workflow",
        )}
        description={text(
          "报告中心不只是“生成文件”。它负责从数据源和模板出发，沉淀正式结论、可下载报告和复用分析资产。",
          "Report Center is more than file generation. It turns sources and prompts into formal conclusions, downloadable artifacts, and reusable analysis assets.",
        )}
        stats={[
          {
            label: text("分析任务", "Analysis jobs"),
            value: `${jobs.length}`,
            detail: text("已创建的正式分析", "Formal analyses created"),
            icon: <BarChart3 className="h-5 w-5" />,
          },
          {
            label: text("报告文件", "Report files"),
            value: `${reports.length}`,
            detail: text("已生成交付物", "Generated deliverables"),
            icon: <FolderOpen className="h-5 w-5" />,
            tone: "info",
          },
          {
            label: text("高风险任务", "High-risk jobs"),
            value: `${jobs.filter((item) => item.result?.riskLevel === "high").length}`,
            detail: text("优先生成正式报告", "Prioritize formal reporting"),
            icon: <AlertTriangle className="h-5 w-5" />,
            tone: jobs.some((item) => item.result?.riskLevel === "high") ? "warning" : "success",
          },
          {
            label: text("数据源", "Sources"),
            value: `${sources.length}`,
            detail: text("当前可参与报告分析", "Available for reporting"),
            icon: <Target className="h-5 w-5" />,
          },
        ]}
        actions={
          <>
            <Button onClick={handleCreateAnalysis} disabled={loading || analyzing || !providerId || !selectedSourceIds.length}>
              {text("开始正式分析", "Start Analysis")}
            </Button>
            <Button asChild variant="outline">
              <a href="#reports-history">{text("查看历史任务", "View History")}</a>
            </Button>
          </>
        }
        aside={
          <Card variant="glass" className="h-full border-border/60">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                {text("报告链路", "Reporting workflow")}
              </Badge>
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>{text("1. 先选分析模板和数据源。", "1. Pick the template and sources first.")}</p>
                <p>{text("2. 再运行正式分析任务。", "2. Run the formal analysis job.")}</p>
                <p>{text("3. 最后把结果导出成可交付文档。", "3. Export the result into a deliverable format.")}</p>
              </div>
            </div>
          </Card>
        }
      />

      {handoff ? (
        <Card variant="glass" className="mb-8 border-primary/25 bg-primary/5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="glow">
                  {handoff.from === "assistant"
                    ? text("来自 AI 助手的交接", "Handoff from AI Assistant")
                    : text("已加载交接包", "Handoff packet loaded")}
                </Badge>
                {handoff.sessionId ? <Badge variant="outline">{handoff.sessionId.slice(0, 8)}</Badge> : null}
                {handoff.persona ? <Badge variant="secondary">{handoff.persona}</Badge> : null}
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">
                  {handoff.title || text("这份正式分析已经继承了上一页上下文", "This formal analysis already inherited the previous context")}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {handoff.summary
                    ? handoff.summary
                    : text(
                        "当前表单已经自动带入会话里的来源范围、提示词预设和问题方向。你现在只需要确认正式分析口径，然后启动正式任务。",
                        "The current form already carries the session's source scope, preset, and problem framing. Confirm the formal analysis framing and start the job.",
                      )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {handoff.sourceIds?.length ? (
                  <Badge variant="info">
                    {text(
                      `已继承 ${handoff.sourceIds.length} 个数据源`,
                      `${handoff.sourceIds.length} sources inherited`,
                    )}
                  </Badge>
                ) : null}
                {handoff.verbosity ? <Badge variant="outline">{handoff.verbosity}</Badge> : null}
                {handoff.promptPresetId ? <Badge variant="outline">{handoff.promptPresetId}</Badge> : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleCreateAnalysis}
                disabled={loading || analyzing || !providerId || !selectedSourceIds.length}
              >
                {text("按交接包启动分析", "Start Analysis From Handoff")}
              </Button>
              <Button asChild variant="outline">
                <Link href="/ai-assistant">{text("回到 AI 助手", "Back To AI Assistant")}</Link>
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      {message ? (
        <div className="mb-8 rounded-2xl border border-border/60 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
          {message}
          {analyzing ? <div className="mt-3"><Progress value={analysisProgress} /></div> : null}
        </div>
      ) : null}

      <TaskSection
        eyebrow={text("分析配置", "Analysis setup")}
        title={text("先定义本次正式分析的模板、模型和数据源", "Define the template, model, and sources for this analysis")}
        description={text(
          "这里不是简单点一个导出按钮，而是决定报告口径和结论质量的地方。",
          "This is where the report’s analytical quality and framing are decided.",
        )}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <Card variant="glass" className="border-border/60">
            <div className="mb-5 flex items-center gap-3">
              <Bot className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">{text("分析模板", "Analysis templates")}</h3>
            </div>
            <div className="space-y-3">
              {REPORT_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(template.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selectedTemplateId === template.id
                      ? "border-primary/40 bg-primary/10"
                      : "border-border/60 bg-background/40 hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl border border-border/60 bg-background/60 p-2 text-primary">
                      {template.icon}
                    </div>
                    <div>
                      <div className="font-bold">{text(template.nameZh, template.nameEn)}</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {text(template.descriptionZh, template.descriptionEn)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card variant="gradient" className="border-border/60">
            <div className="mb-5 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-accent" />
              <h3 className="text-lg font-bold">{text("本次分析", "Current analysis")}</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium">{text("模型服务", "Provider")}</span>
                <Select value={providerId} onValueChange={setProviderId}>
                  <SelectTrigger>
                    <SelectValue placeholder={text("选择模型服务", "Select provider")} />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name} / {provider.chatModel}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">{text("分析深度", "Verbosity")}</span>
                <Select value={verbosity} onValueChange={setVerbosity}>
                  <SelectTrigger>
                    <SelectValue placeholder={text("选择分析深度", "Select verbosity")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brief">{text("简要", "Brief")}</SelectItem>
                    <SelectItem value="standard">{text("标准", "Standard")}</SelectItem>
                    <SelectItem value="deep">{text("深度", "Deep")}</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">{text("提示词预设", "Prompt preset")}</span>
                <Select value={promptPresetId} onValueChange={setPromptPresetId}>
                  <SelectTrigger>
                    <SelectValue placeholder={text("选择预设", "Select preset")} />
                  </SelectTrigger>
                  <SelectContent>
                    {promptPresets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">{text("报告视角", "Persona")}</span>
                <Select value={persona} onValueChange={setPersona}>
                  <SelectTrigger>
                    <SelectValue placeholder={text("选择视角", "Select persona")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">{text("管理复盘", "Manager")}</SelectItem>
                    <SelectItem value="engineer">{text("工程复核", "Engineer")}</SelectItem>
                    <SelectItem value="operator">{text("现场执行", "Operator")}</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <div className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium">
                  {text("数据源选择", "Selected sources")} · {selectedSourceIds.length}
                </span>
                <div className="grid gap-3 md:grid-cols-2">
                  {sources.slice(0, 8).map((source) => {
                    const active = selectedSourceIds.includes(source.id);
                    return (
                      <label
                        key={source.id}
                        className={`flex items-start gap-3 rounded-2xl border p-3 transition ${
                          active
                            ? "border-primary/40 bg-primary/10"
                            : "border-border/60 bg-background/40"
                        }`}
                      >
                        <Checkbox
                          checked={active}
                          onCheckedChange={() => toggleSource(source.id)}
                          className="mt-1"
                        />
                        <div>
                          <div className="font-semibold">{source.name}</div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {source.type.toUpperCase()} / {text("质量", "Quality")} {source.qualityScore}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium">{text("自定义提示词", "Custom prompt")}</span>
                <Textarea
                  className="min-h-[140px]"
                  value={customPrompt}
                  onChange={(event) => setCustomPrompt(event.target.value)}
                  placeholder={text("留空则使用模板默认提示词；如果从 AI 助手交接而来，这里已经预填方向。", "Leave empty to use the default template prompt; AI handoff usually pre-fills this field.")}
                />
              </label>
            </div>

            <div className="mt-5 rounded-2xl border border-border/60 bg-background/40 p-4">
              <div className="text-sm font-semibold">{text("提示词预览", "Prompt preview")}</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {(customPrompt.trim() || selectedTemplate.prompt).slice(0, 240)}
              </p>
            </div>

            {selectedPromptPreset ? (
              <div className="mt-4 rounded-2xl border border-border/60 bg-background/40 p-4">
                <div className="text-sm font-semibold">{text("预设目标", "Preset objective")}</div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {selectedPromptPreset.objective}
                </p>
              </div>
            ) : null}
          </Card>
        </div>
      </TaskSection>

      <TaskSection
        id="reports-history"
        className="mt-10"
        eyebrow={text("分析历史", "Analysis history")}
        title={text("把正式结论和导出动作放在同一个历史视图", "Keep formal conclusions and export actions in one history view")}
        description={text(
          "任务创建后，最重要的是快速复看结论并生成交付文档。",
          "Once a job exists, the next job is to review the conclusion and turn it into a deliverable.",
        )}
        action={
          <PagedBlockControls
            count={jobs.length}
            page={pagedJobs.safePage}
            pageCount={pagedJobs.pageCount}
            expanded={jobsExpanded}
            showToggle={false}
            onPrev={() => setJobPage((current) => Math.max(0, current - 1))}
            onNext={() =>
              setJobPage((current) =>
                Math.min(pagedJobs.pageCount - 1, current + 1),
              )
            }
            onToggle={() => setJobsExpanded((current) => !current)}
            labels={{
              total: text("共", "Total"),
              items: text("条任务", "jobs"),
              expand: text("展开", "Expand"),
              collapse: text("收起", "Collapse"),
              prev: text("上一页", "Prev"),
              next: text("下一页", "Next"),
            }}
          />
        }
      >
        {jobsExpanded && pagedJobs.items.length ? (
          <div className="space-y-4">
            {pagedJobs.items.map((job) => {
              const chartOption = {
                tooltip: { trigger: "axis" },
                grid: { left: 28, right: 18, top: 20, bottom: 28 },
                xAxis: {
                  type: "category",
                  data: (job.result.chartSeries ?? []).map((item) => item.name),
                },
                yAxis: { type: "value" },
                series: [
                  {
                    type: "bar",
                    data: (job.result.chartSeries ?? []).map((item) => item.value),
                    itemStyle: {
                      borderRadius: [6, 6, 0, 0],
                    },
                  },
                ],
              };

              return (
                <Card key={job.id} variant="glass" className="border-border/60">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">
                        {job.result.headline || `${selectedTemplate.nameZh} #${job.id.slice(-6)}`}
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {job.template} / {job.verbosity} / {new Date(job.createdAt).toLocaleDateString("zh-CN")}
                      </p>
                    </div>
                    <Badge
                      variant={
                        job.result.riskLevel === "high"
                          ? "destructive"
                          : job.result.riskLevel === "medium"
                            ? "warning"
                            : "success"
                      }
                    >
                      {job.result.riskLevel}
                    </Badge>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-muted-foreground">
                    {job.result.summary || text("分析摘要稍后显示。", "Summary will appear here.")}
                  </p>

                  {job.result.chartSeries?.length ? (
                    <div className="mt-4 rounded-2xl border border-border/60 bg-background/40 p-3">
                      <ReactECharts option={chartOption} style={{ height: 220 }} />
                    </div>
                  ) : null}

                  <details className="mt-4 rounded-2xl border border-border/60 bg-background/30 p-4">
                    <summary className="cursor-pointer text-sm font-semibold">
                      {text("查看详细发现", "View detailed findings")}
                    </summary>
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                        <div className="text-sm font-semibold">{text("发现", "Findings")}</div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {(job.result.findings?.length ? job.result.findings : [text("暂无发现", "No findings")]).join("；")}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                        <div className="text-sm font-semibold">{text("建议", "Recommendations")}</div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {(job.result.recommendations?.length ? job.result.recommendations : [text("暂无建议", "No recommendations")]).join("；")}
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                        <div className="text-sm font-semibold">{text("证据", "Evidence")}</div>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {(job.result.evidence?.length
                            ? job.result.evidence.map((item) => `${item.label}: ${item.detail}`)
                            : [text("暂无证据", "No evidence")]).join(" | ")}
                        </p>
                      </div>
                    </div>
                  </details>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {["docx", "xlsx", "csv", "pdf", "chart"].map((format) => (
                      <Button
                        key={format}
                        size="sm"
                        variant={format === "pdf" ? "default" : "outline"}
                        onClick={() => handleCreateReport(job.id, format)}
                      >
                        {format.toUpperCase()}
                      </Button>
                    ))}
                    {job.result.riskLevel === "high" || job.result.riskLevel === "medium" ? (
                      <Button asChild size="sm" variant="outline">
                        <Link
                          href={`/admin/alerts${buildGovernanceHandoffSearch({
                            from: "reports",
                            jobId: job.id,
                            riskLevel: job.result.riskLevel,
                            headline: job.result.headline,
                            summary: job.result.summary,
                          })}`}
                        >
                          {text("交给治理队列", "Hand Off To Admin")}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyStateCard
            icon={<BarChart3 className="h-6 w-6" />}
            title={text("还没有分析任务", "No analysis jobs yet")}
            description={text(
              "先选模板、数据源和模型服务，再开始正式分析。",
              "Choose a template, sources, and provider to create the first analysis job.",
            )}
          />
        )}
      </TaskSection>

      <TaskSection
        className="mt-10"
        eyebrow={text("交付文件", "Artifacts")}
        title={text("生成的报告文件应该能直接下载", "Generated report files should be directly downloadable")}
        description={text(
          "这里保留的不是任务细节，而是已经生成的交付物。",
          "This section keeps only the generated deliverables rather than analysis detail.",
        )}
        action={
          <PagedBlockControls
            count={reports.length}
            page={pagedReports.safePage}
            pageCount={pagedReports.pageCount}
            expanded={reportsExpanded}
            showToggle={false}
            onPrev={() => setReportPage((current) => Math.max(0, current - 1))}
            onNext={() =>
              setReportPage((current) =>
                Math.min(pagedReports.pageCount - 1, current + 1),
              )
            }
            onToggle={() => setReportsExpanded((current) => !current)}
            labels={{
              total: text("共", "Total"),
              items: text("个文件", "files"),
              expand: text("展开", "Expand"),
              collapse: text("收起", "Collapse"),
              prev: text("上一页", "Prev"),
              next: text("下一页", "Next"),
            }}
          />
        }
      >
        {reportsExpanded && pagedReports.items.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pagedReports.items.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => handleDownload(report)}
                className="rounded-2xl border border-border/60 bg-card/50 p-4 text-left transition hover:border-primary/30 hover:bg-accent/10"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-xl border border-border/60 bg-background/60 p-2 text-primary">
                    {fileIcon(report.format)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{report.filename}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {report.format.toUpperCase()} / {new Date(report.createdAt).toLocaleDateString("zh-CN")}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                      {report.summary}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyStateCard
            icon={<FolderOpen className="h-6 w-6" />}
            title={text("还没有生成文件", "No artifacts generated yet")}
            description={text(
              "先运行分析任务，再把结果导出为正式文件。",
              "Run an analysis job first, then export it into a formal artifact.",
            )}
          />
        )}
      </TaskSection>
    </div>
  );
}
