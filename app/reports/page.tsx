"use client";

import { useEffect, useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import PagedBlockControls, {
  getPagedItems,
} from "../components/Layout/PagedBlockControls";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
import {
  enterpriseDownload,
  enterpriseErrorMessage,
  enterpriseGet,
  enterprisePost,
} from "@/lib/enterprise-client";
import {
  localizeAnalysisJob,
  localizeDataSourceProfile,
  localizePromptPreset,
  localizeTemplateLabel,
  localizeVerbosityLabel,
} from "@/lib/enterprise-localization";
import type {
  AiProviderProfile,
  AnalysisJob,
  DataSourceProfile,
  PromptPreset,
  ReportArtifact,
} from "@/types/enterprise";

const TEMPLATE_OPTIONS = [
  {
    value: "quality-variance",
    labelKey: "pages.reports.template.qualityVariance",
  },
  {
    value: "defect-trend",
    labelKey: "pages.reports.template.defectTrend",
  },
  {
    value: "shift-efficiency",
    labelKey: "pages.reports.template.shiftEfficiency",
  },
  {
    value: "equipment-troubleshooting",
    labelKey: "pages.reports.template.equipmentTroubleshooting",
  },
  {
    value: "bridge-cable-risk",
    labelKey: "pages.reports.template.bridgeCableRisk",
  },
];

const REPORT_EXPORT_ACTIONS = [
  { format: "docx", labelKey: "pages.reports.copy032" },
  { format: "xlsx", labelKey: "pages.reports.copy033" },
  { format: "csv", labelKey: "pages.reports.copy034" },
  { format: "csv7", labelKey: "pages.reports.copy035" },
  { format: "chart", labelKey: "pages.reports.copy036" },
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
  const { locale, t } = useLocale();
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
  const [prompt, setPrompt] = useState(
    "Create a diagnosis report from selected sources with measurable risk indicators and actionable recommendations.",
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [jobPage, setJobPage] = useState(0);
  const [reportPage, setReportPage] = useState(0);
  const [jobsExpanded, setJobsExpanded] = useState(true);
  const [reportsExpanded, setReportsExpanded] = useState(true);

  const localizedPromptPresets = useMemo(
    () => promptPresets.map((item) => localizePromptPreset(item, locale)),
    [promptPresets, locale],
  );
  const localizedSources = useMemo(
    () => sources.map((item) => localizeDataSourceProfile(item, locale)),
    [sources, locale],
  );
  const localizedJobs = useMemo(
    () => jobs.map((item) => localizeAnalysisJob(item, locale)),
    [jobs, locale],
  );
  const templateOptions = useMemo(
    () =>
      TEMPLATE_OPTIONS.map((item) => ({
        ...item,
        label: t(item.labelKey),
      })),
    [t],
  );
  const pagedJobs = useMemo(
    () => getPagedItems(localizedJobs, jobPage, 4),
    [localizedJobs, jobPage],
  );
  const pagedReports = useMemo(
    () => getPagedItems(reports, reportPage, 8),
    [reports, reportPage],
  );
  const reportExportActions = useMemo(
    () =>
      REPORT_EXPORT_ACTIONS.map((item) => ({
        ...item,
        label: t(item.labelKey),
      })),
    [t],
  );
  const exportSurfaceTitle =
    locale === "zh-CN" ? "导出格式" : "Export formats";
  const exportSurfaceHint =
    locale === "zh-CN"
      ? "导出入口已前置显示，生成后可在右侧下载中心直接下载。"
      : "Export actions are shown by default. Download generated files from the Download Center.";
  const findingsSummaryLabel =
    locale === "zh-CN"
      ? "查看关键发现与证据"
      : "View findings and evidence";
  const localizeRiskLevel = (riskLevel: string) => {
    if (riskLevel === "high") return t("pages.admin.alerts.copy001");
    if (riskLevel === "medium") return t("pages.admin.alerts.copy002");
    if (riskLevel === "low") return t("pages.admin.alerts.copy003");
    return riskLevel;
  };

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
        "report-author",
    );
    setSelectedSourceIds((current) =>
      current.length ? current : sourceData.slice(0, 2).map((item) => item.id),
    );
  };

  useEffect(() => {
    if (!ready) return;
    load().catch((error) => {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, t("pages.reports.copy001")));
    });
  }, [ready, t]);

  const toggleSource = (sourceId: string) => {
    setSelectedSourceIds((current) =>
      current.includes(sourceId)
        ? current.filter((item) => item !== sourceId)
        : [...current, sourceId],
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
      setMessage(t("pages.reports.copy002"));
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, t("pages.reports.copy003")));
    } finally {
      setLoading(false);
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
      setMessage(t("pages.reports.copy004", { p1: format.toUpperCase() }));
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, t("pages.reports.copy005")));
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (report: ReportArtifact) => {
    try {
      const blob = await enterpriseDownload(`/reports/${report.id}/download`);
      saveBlob(blob, report.filename);
      setMessage(t("pages.reports.copy006", { p1: report.filename }));
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, t("pages.reports.copy007")));
    }
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/workspace"
        title={t("pages.reports.copy008")}
        description={t("pages.reports.copy009")}
      />
    );
  }

  return (
    <div className="enterprise-shell">
      <BackButton fallbackHref="/workspace" />

      <section className="enterprise-hero">
        <div>
          <span className="eyebrow">{t("pages.reports.copy010")}</span>
          <h1>{t("pages.reports.copy011")}</h1>
          <p>{t("pages.reports.copy012")}</p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>{t("pages.reports.copy013")}</span>
            <strong>{jobs.length}</strong>
          </div>
          <div>
            <span>{t("pages.reports.copy014")}</span>
            <strong>{reports.length}</strong>
          </div>
          <div>
            <span>{t("pages.reports.copy015")}</span>
            <strong>
              {jobs.filter((item) => item.result?.riskLevel === "high").length}
            </strong>
          </div>
        </div>
      </section>

      {message ? <div className="auth-message">{message}</div> : null}

      <div className="enterprise-grid reports-grid">
        <Card className="enterprise-side-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">{t("pages.reports.copy016")}</span>
              <h2>{t("pages.reports.copy017")}</h2>
            </div>
          </div>

          <div className="enterprise-form-grid">
            <label>
              <span>{t("pages.ai_assistant.copy119")}</span>
              <select
                value={providerId}
                onChange={(event) => setProviderId(event.target.value)}
              >
                {providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name} / {provider.chatModel}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{t("pages.reports.copy018")}</span>
              <select
                value={template}
                onChange={(event) => setTemplate(event.target.value)}
              >
                {templateOptions.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{t("pages.reports.copy019")}</span>
              <select
                value={promptPresetId}
                onChange={(event) => setPromptPresetId(event.target.value)}
              >
                {localizedPromptPresets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>{t("pages.ai_assistant.copy117")}</span>
              <select
                value={verbosity}
                onChange={(event) => setVerbosity(event.target.value)}
              >
                <option value="brief">{t("pages.ai_assistant.copy008")}</option>
                <option value="standard">
                  {t("pages.ai_assistant.copy009")}
                </option>
                <option value="deep">{t("pages.ai_assistant.copy010")}</option>
              </select>
            </label>
          </div>

          <div className="panel-caption">
            {t("pages.reports.copy020")} · {selectedSourceIds.length}
          </div>
          <div className="enterprise-source-picker">
            {localizedSources.map((source) => {
              const active = selectedSourceIds.includes(source.id);
              return (
                <button
                  key={source.id}
                  type="button"
                  className={`enterprise-source-card ${
                    active ? "enterprise-source-card-active" : ""
                  }`}
                  onClick={() => toggleSource(source.id)}
                >
                  <strong>{source.name}</strong>
                  <span>
                    {source.type.toUpperCase()} / {t("pages.reports.copy021")}{" "}
                    {source.qualityScore}
                  </span>
                  <em>
                    {source.connectionMeta.analysisSummary ??
                      t("pages.reports.copy022")}
                  </em>
                </button>
              );
            })}
          </div>

          <textarea
            className="enterprise-textarea"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
          />

          <button
            type="button"
            className="enterprise-primary-button"
            onClick={handleCreateAnalysis}
            disabled={loading || !providerId || !selectedSourceIds.length}
          >
            {loading ? t("pages.data_hub.copy027") : t("pages.reports.copy023")}
          </button>
        </Card>

        <div className="enterprise-card-stack reports-stack">
          <Card className="enterprise-main-card reports-job-board">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">
                  {t("pages.reports.copy024")}
                </span>
                <h2>{t("pages.reports.copy025")}</h2>
              </div>
            </div>

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
                total: t("pages.ai_assistant.copy011"),
                items: t("pages.ai_assistant.copy012"),
                expand: t("pages.ai_assistant.copy014"),
                collapse: t("pages.ai_assistant.copy013"),
                prev: t("pages.ai_assistant.copy015"),
                next: t("pages.ai_assistant.copy016"),
              }}
            />

            {jobsExpanded ? (
              <div className="enterprise-card-stack reports-job-list">
                {pagedJobs.items.map((job) => {
                  const chartOption = {
                    tooltip: { trigger: "axis" },
                    xAxis: {
                      type: "category",
                      data: (job.result.chartSeries ?? []).map(
                        (item) => item.name,
                      ),
                    },
                    yAxis: { type: "value" },
                    series: [
                      {
                        type: "bar",
                        data: (job.result.chartSeries ?? []).map(
                          (item) => item.value,
                        ),
                        itemStyle: { color: "#5bbdf7" },
                      },
                    ],
                  };

                  return (
                    <Card key={job.id} className="enterprise-report-job">
                      <div className="enterprise-data-card-top">
                        <div>
                          <strong>{job.result.headline}</strong>
                          <span>
                            {localizeTemplateLabel(job.template, locale)} /{" "}
                            {localizeVerbosityLabel(job.verbosity, locale)} /{" "}
                            {job.result.inspectionDomain ??
                              t("pages.reports.copy026")}
                          </span>
                        </div>
                        <div
                          className={`status-chip ${
                            job.result.riskLevel === "high"
                              ? "status-danger"
                              : job.result.riskLevel === "medium"
                                ? "status-warning"
                                : "status-success"
                          }`}
                        >
                          {localizeRiskLevel(job.result.riskLevel)}
                        </div>
                      </div>

                      <p className="enterprise-report-summary reports-summary">
                        {job.result.summary}
                      </p>

                      {(job.result.chartSeries?.length ?? 0) > 0 ? (
                        <div className="rounded-xl border border-[rgba(91,189,247,0.2)] p-3">
                          <div className="mb-2 text-xs text-[var(--text-secondary)]">
                            {t("pages.reports.copy027")}
                          </div>
                          <ReactECharts
                            option={chartOption}
                            style={{ height: 240 }}
                          />
                        </div>
                      ) : null}

                      <div className="enterprise-note-card reports-export-surface">
                        <div className="reports-export-surface-header">
                          <strong>{exportSurfaceTitle}</strong>
                          <span>{exportSurfaceHint}</span>
                        </div>
                        <div className="enterprise-action-row reports-export-row">
                          {reportExportActions.map((action) => (
                            <button
                              key={`${job.id}-${action.format}`}
                              type="button"
                              className="enterprise-secondary-button"
                              onClick={() =>
                                handleCreateReport(job.id, action.format)
                              }
                              disabled={loading}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <details className="enterprise-card-details">
                        <summary>{findingsSummaryLabel}</summary>
                        <div className="enterprise-note-card">
                          <strong>{t("pages.reports.copy029")}</strong>
                          <span>{job.result.findings.join(" ")}</span>
                        </div>

                        <div className="enterprise-note-card">
                          <strong>{t("pages.reports.copy030")}</strong>
                          <span>{job.result.recommendations.join(" ")}</span>
                        </div>

                        <div className="enterprise-note-card">
                          <strong>{t("pages.reports.copy031")}</strong>
                          <span>
                            {job.result.evidence
                              .map((item) => `${item.label}: ${item.detail}`)
                              .join(" | ")}
                          </span>
                        </div>
                      </details>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="enterprise-collapsed-note">
                {t("pages.reports.copy037")}
              </div>
            )}
          </Card>

          <Card className="enterprise-side-card reports-artifacts">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">
                  {t("pages.reports.copy038")}
                </span>
                <h2>{t("pages.reports.copy039")}</h2>
              </div>
            </div>
            <PagedBlockControls
              count={reports.length}
              page={pagedReports.safePage}
              pageCount={pagedReports.pageCount}
              expanded={reportsExpanded}
              showToggle={false}
              onPrev={() =>
                setReportPage((current) => Math.max(0, current - 1))
              }
              onNext={() =>
                setReportPage((current) =>
                  Math.min(pagedReports.pageCount - 1, current + 1),
                )
              }
              onToggle={() => setReportsExpanded((current) => !current)}
              labels={{
                total: t("pages.ai_assistant.copy011"),
                items: t("pages.ai_assistant.copy012"),
                expand: t("pages.ai_assistant.copy014"),
                collapse: t("pages.ai_assistant.copy013"),
                prev: t("pages.ai_assistant.copy015"),
                next: t("pages.ai_assistant.copy016"),
              }}
            />
            <div className="enterprise-list">
              {reportsExpanded ? (
                pagedReports.items.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    className="enterprise-list-item"
                    onClick={() => handleDownload(report)}
                  >
                    <strong>{report.filename}</strong>
                    <span>{report.summary}</span>
                  </button>
                ))
              ) : (
                <div className="enterprise-collapsed-note">
                  {t("pages.reports.copy040")}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
