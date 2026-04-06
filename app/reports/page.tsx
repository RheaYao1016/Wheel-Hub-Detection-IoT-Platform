"use client";

import { useEffect, useMemo, useState } from "react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import PagedBlockControls, { getPagedItems } from "../components/Layout/PagedBlockControls";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
import { enterpriseDownload, enterpriseErrorMessage, enterpriseGet, enterprisePost } from "@/lib/enterprise-client";
import { localizePromptPreset } from "@/lib/enterprise-localization";
import type { AiProviderProfile, AnalysisJob, DataSourceProfile, PromptPreset, ReportArtifact } from "@/types/enterprise";

const TEMPLATE_OPTIONS = [
  {
    value: "quality-variance",
    labelZh: "质量波动诊断",
    labelEn: "Quality variance diagnosis",
  },
  {
    value: "defect-trend",
    labelZh: "缺陷趋势复盘",
    labelEn: "Defect trend review",
  },
  {
    value: "shift-efficiency",
    labelZh: "班次效率分析",
    labelEn: "Shift efficiency analysis",
  },
  {
    value: "equipment-troubleshooting",
    labelZh: "设备故障排查",
    labelEn: "Equipment troubleshooting",
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

export default function ReportsPage() {
  return <ReportsContent />;
}

function ReportsContent() {
  const ready = useSessionGuard(["admin", "engineer", "operator", "viewer"]);
  const { locale, text } = useLocale();
  const [providers, setProviders] = useState<AiProviderProfile[]>([]);
  const [promptPresets, setPromptPresets] = useState<PromptPreset[]>([]);
  const [sources, setSources] = useState<DataSourceProfile[]>([]);
  const [jobs, setJobs] = useState<AnalysisJob[]>([]);
  const [reports, setReports] = useState<ReportArtifact[]>([]);
  const [providerId, setProviderId] = useState("");
  const [promptPresetId, setPromptPresetId] = useState("report-author");
  const [template, setTemplate] = useState("quality-variance");
  const [verbosity, setVerbosity] = useState("standard");
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("Create a clear diagnosis report for operators and line managers based on the selected sources.");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobPage, setJobPage] = useState(0);
  const [reportPage, setReportPage] = useState(0);
  const [jobsExpanded, setJobsExpanded] = useState(true);
  const [reportsExpanded, setReportsExpanded] = useState(true);
  const localizedPromptPresets = useMemo(() => promptPresets.map((item) => localizePromptPreset(item, locale)), [promptPresets, locale]);
  const templateOptions = useMemo(
    () => TEMPLATE_OPTIONS.map((item) => ({ ...item, label: text(item.labelZh, item.labelEn) })),
    [text],
  );
  const pagedJobs = useMemo(() => getPagedItems(jobs, jobPage, 4), [jobs, jobPage]);
  const pagedReports = useMemo(() => getPagedItems(reports, reportPage, 6), [reports, reportPage]);

  const load = async () => {
    const [providerData, presetData, sourceData, jobData, reportData] = await Promise.all([
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
    setPromptPresetId((current) => current || presetData.find((item) => item.id === "report-author")?.id || presetData[0]?.id || "report-author");
    setSelectedSourceIds((current) => (current.length ? current : sourceData.slice(0, 2).map((item) => item.id)));
  };

  useEffect(() => {
    if (!ready) return;
    load().catch((error) => {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, text("加载报告中心失败，请确认后端和 AI 服务已经启动。", "Failed to load the Report Center. Make sure the backend and AI service are running.")));
    });
  }, [ready, text]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const sourceId = params.get("sourceId");
    const presetId = params.get("preset");
    const nextTemplate = params.get("template");
    const nextPrompt = params.get("prompt");

    if (sourceId) {
      setSelectedSourceIds([sourceId]);
    }
    if (presetId) {
      setPromptPresetId(presetId);
    }
    if (nextTemplate) {
      setTemplate(nextTemplate);
    }
    if (nextPrompt) {
      setPrompt(nextPrompt);
    }
  }, []);

  const toggleSource = (sourceId: string) => {
    setSelectedSourceIds((current) =>
      current.includes(sourceId) ? current.filter((item) => item !== sourceId) : [...current, sourceId],
    );
  };

  const handleCreateAnalysis = async () => {
    setLoading(true);
    try {
      const created = await enterprisePost<AnalysisJob>("/analysis/jobs", {
        prompt,
        template,
        verbosity,
        providerId,
        persona: "manager",
        locale,
        promptPresetId,
        sourceIds: selectedSourceIds,
      });
      setJobs((current) => [created, ...current]);
      setMessage(text("正式分析已创建，现在可以从同一条诊断记录导出 Word、Excel 或 CSV。", "Formal analysis created. Export it as Word, Excel, or CSV from the same diagnosis record."));
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, text("创建正式分析失败。", "Failed to create the formal analysis.")));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReport = async (jobId: string, format: string) => {
    setLoading(true);
    try {
      const created = await enterprisePost<ReportArtifact>(`/analysis/jobs/${jobId}/reports`, { format });
      setReports((current) => [created, ...current]);
      setMessage(text(`${format.toUpperCase()} 报告生成成功。`, `${format.toUpperCase()} report generated successfully.`));
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, text("生成报告文件失败。", "Failed to generate the report file.")));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (report: ReportArtifact) => {
    try {
      const blob = await enterpriseDownload(`/reports/${report.id}/download`);
      saveBlob(blob, report.filename);
      setMessage(text(`已下载 ${report.filename}。`, `Downloaded ${report.filename}.`));
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, text("下载报告失败。", "Failed to download the report artifact.")));
    }
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/workspace"
        title={text("正在加载报告中心", "Loading Report Center")}
        description={text("正在校验会话并准备报告、导出与分析布局...", "Verifying the session and preparing report, export, and analysis layout...")}
      />
    );
  }

  return (
    <div className="enterprise-shell">
      <BackButton fallbackHref="/workspace" />

      <section className="enterprise-hero">
        <div>
          <span className="eyebrow">{text("报告中心", "Report Center")}</span>
          <h1>{text("一次诊断，多种交付格式", "One diagnosis, many delivery formats")}</h1>
          <p>
            {text(
              "分析只做一次，然后把同一套结论导出成 Word、Excel 或 CSV。这样能保证报告口径一致，避免同一份数据在多个页面被不同方式重复解释。",
              "Create the analysis once, then export the exact same conclusion set as Word, Excel, or CSV. This keeps the report chain consistent and prevents the same data from being explained differently across multiple pages.",
            )}
          </p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>{text("分析任务", "Analysis jobs")}</span>
            <strong>{jobs.length}</strong>
          </div>
          <div>
            <span>{text("已生成报告", "Generated reports")}</span>
            <strong>{reports.length}</strong>
          </div>
          <div>
            <span>{text("高风险分析", "High-risk analyses")}</span>
            <strong>{jobs.filter((item) => item.result?.riskLevel === "high").length}</strong>
          </div>
        </div>
      </section>

      {message ? <div className="auth-message">{message}</div> : null}

      <div className="enterprise-grid">
        <Card className="enterprise-side-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">{text("分析构建", "Analysis Builder")}</span>
              <h2>{text("创建正式诊断", "Create a formal diagnosis")}</h2>
            </div>
          </div>

          <div className="enterprise-form-grid">
            <label>
              <span>{text("模型服务", "Provider")}</span>
              <select value={providerId} onChange={(event) => setProviderId(event.target.value)}>
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} / {provider.chatModel}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{text("模板", "Template")}</span>
              <select value={template} onChange={(event) => setTemplate(event.target.value)}>
                {templateOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{text("提示词预设", "Prompt preset")}</span>
              <select value={promptPresetId} onChange={(event) => setPromptPresetId(event.target.value)}>
                {localizedPromptPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{text("说明深度", "Verbosity")}</span>
              <select value={verbosity} onChange={(event) => setVerbosity(event.target.value)}>
                <option value="brief">{text("简要", "Brief")}</option>
                <option value="standard">{text("标准", "Standard")}</option>
                <option value="deep">{text("深入", "Deep")}</option>
              </select>
            </label>
          </div>

          <div className="enterprise-source-picker">
            {sources.map((source) => {
              const active = selectedSourceIds.includes(source.id);
              return (
                <button
                  key={source.id}
                  type="button"
                  className={`enterprise-source-card ${active ? "enterprise-source-card-active" : ""}`}
                  onClick={() => toggleSource(source.id)}
                >
                  <strong>{source.name}</strong>
                  <span>
                    {source.type.toUpperCase()} / {text("评级", "grade")} {source.qualityScore}
                  </span>
                  <em>{source.connectionMeta.analysisSummary ?? text("可以直接进入正式分析。", "Ready for formal analysis.")}</em>
                </button>
              );
            })}
          </div>

          <textarea className="enterprise-textarea" value={prompt} onChange={(event) => setPrompt(event.target.value)} />

          <button type="button" className="enterprise-primary-button" onClick={handleCreateAnalysis} disabled={loading || !providerId || !selectedSourceIds.length}>
            {loading ? text("处理中...", "Processing...") : text("创建正式分析", "Create formal analysis")}
          </button>
        </Card>

        <div className="enterprise-card-stack enterprise-panel-scroll">
          <PagedBlockControls
            count={jobs.length}
            page={pagedJobs.safePage}
            pageCount={pagedJobs.pageCount}
            expanded={jobsExpanded}
            onPrev={() => setJobPage((current) => Math.max(0, current - 1))}
            onNext={() => setJobPage((current) => Math.min(pagedJobs.pageCount - 1, current + 1))}
            onToggle={() => setJobsExpanded((current) => !current)}
            labels={{
              total: text("共", "Total"),
              items: text("项", "items"),
              expand: text("展开", "Expand"),
              collapse: text("收起", "Collapse"),
              prev: text("上一页", "Prev"),
              next: text("下一页", "Next"),
            }}
          />
          {jobsExpanded ? pagedJobs.items.map((job) => (
            <Card key={job.id} className="enterprise-report-job">
              <div className="enterprise-data-card-top">
                <div>
                  <strong>{job.result.headline}</strong>
                  <span>
                    {job.template} / {job.verbosity}
                  </span>
                </div>
                <div className={`status-chip ${job.result.riskLevel === "high" ? "status-danger" : job.result.riskLevel === "medium" ? "status-warning" : "status-success"}`}>
                  {job.result.riskLevel}
                </div>
              </div>

              <p className="enterprise-report-summary">{job.result.summary}</p>

              <details className="enterprise-card-details">
                <summary>{text("查看关键发现、建议动作与证据链", "View findings, actions, and evidence")}</summary>
                <div className="enterprise-note-card">
                  <strong>{text("关键发现", "Key findings")}</strong>
                  <span>{job.result.findings.join(" ")}</span>
                </div>

                <div className="enterprise-note-card">
                  <strong>{text("建议动作", "Recommended actions")}</strong>
                  <span>{job.result.recommendations.join(" ")}</span>
                </div>

                <div className="enterprise-note-card">
                  <strong>{text("证据链", "Evidence")}</strong>
                  <span>{job.result.evidence.map((item) => `${item.label}: ${item.detail}`).join(" | ")}</span>
                </div>
              </details>

              <div className="enterprise-action-row">
                <button type="button" className="enterprise-secondary-button" onClick={() => handleCreateReport(job.id, "docx")}>
                  {text("生成 Word", "Generate Word")}
                </button>
                <button type="button" className="enterprise-secondary-button" onClick={() => handleCreateReport(job.id, "xlsx")}>
                  {text("生成 Excel", "Generate Excel")}
                </button>
                <button type="button" className="enterprise-secondary-button" onClick={() => handleCreateReport(job.id, "csv")}>
                  {text("生成 CSV", "Generate CSV")}
                </button>
              </div>
            </Card>
          )) : <div className="enterprise-collapsed-note">{text("分析列表已折叠", "Analysis list collapsed")}</div>}
        </div>

        <Card className="enterprise-side-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">{text("报告产物", "Artifacts")}</span>
              <h2>{text("下载中心", "Download center")}</h2>
            </div>
          </div>
          <PagedBlockControls
            count={reports.length}
            page={pagedReports.safePage}
            pageCount={pagedReports.pageCount}
            expanded={reportsExpanded}
            onPrev={() => setReportPage((current) => Math.max(0, current - 1))}
            onNext={() => setReportPage((current) => Math.min(pagedReports.pageCount - 1, current + 1))}
            onToggle={() => setReportsExpanded((current) => !current)}
            labels={{
              total: text("共", "Total"),
              items: text("项", "items"),
              expand: text("展开", "Expand"),
              collapse: text("收起", "Collapse"),
              prev: text("上一页", "Prev"),
              next: text("下一页", "Next"),
            }}
          />
          <div className="enterprise-list enterprise-panel-scroll">
            {reportsExpanded ? pagedReports.items.map((report) => (
              <button key={report.id} type="button" className="enterprise-list-item" onClick={() => handleDownload(report)}>
                <strong>{report.filename}</strong>
                <span>{report.summary}</span>
              </button>
            )) : <div className="enterprise-collapsed-note">{text("报告列表已折叠", "Artifact list collapsed")}</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}

