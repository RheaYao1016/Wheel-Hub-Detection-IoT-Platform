"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import PagedBlockControls, { getPagedItems } from "../components/Layout/PagedBlockControls";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
import { enterpriseErrorMessage, enterpriseGet, enterprisePost, enterpriseUpload } from "@/lib/enterprise-client";
import { localizePromptPreset } from "@/lib/enterprise-localization";
import type { AiProviderProfile, AnalysisJob, DataSourceProfile, PromptPreset } from "@/types/enterprise";

function splitMetaList(value?: string) {
  return value?.split("||").map((item) => item.trim()).filter(Boolean) ?? [];
}

function buildQuery(params: Record<string, string>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) {
      query.set(key, value);
    }
  }
  return query.toString();
}

export default function DataHubPage() {
  const ready = useSessionGuard(["admin", "engineer", "operator"]);
  const { locale, text } = useLocale();
  const [items, setItems] = useState<DataSourceProfile[]>([]);
  const [providers, setProviders] = useState<AiProviderProfile[]>([]);
  const [promptPresets, setPromptPresets] = useState<PromptPreset[]>([]);
  const [name, setName] = useState("");
  const [schemaProfile, setSchemaProfile] = useState("inspection_default");
  const [sourceType, setSourceType] = useState("postgres");
  const [providerId, setProviderId] = useState("");
  const [promptPresetId, setPromptPresetId] = useState("quality-ops-briefing");
  const [analysisPrompt, setAnalysisPrompt] = useState(
    text(
      "请结合这个数据源，说明最重要的运营质量风险，并给出一线团队现在最该先做的动作。",
      "Review this source and explain the most important operational quality risk in clear language for frontline teams.",
    ),
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [itemPage, setItemPage] = useState(0);
  const [itemsExpanded, setItemsExpanded] = useState(true);

  const load = async () => {
    const [sourceData, providerData, presetData] = await Promise.all([
      enterpriseGet<DataSourceProfile[]>("/data-sources"),
      enterpriseGet<AiProviderProfile[]>("/ai/providers"),
      enterpriseGet<PromptPreset[]>("/ai/prompt-presets"),
    ]);
    setItems(sourceData);
    setProviders(providerData);
    setPromptPresets(presetData);
    setProviderId((current) => current || providerData[0]?.id || "");
    setPromptPresetId(
      (current) => current || presetData.find((item) => item.id === "quality-ops-briefing")?.id || presetData[0]?.id || "",
    );
  };

  useEffect(() => {
    if (!ready) return;
    load().catch((error) => {
      console.error(error);
      setMessage(
        enterpriseErrorMessage(
          error,
          text("加载数据中心失败，请确认后端和 AI 服务已经启动。", "Failed to load the Data Hub. Make sure the backend and AI service are running."),
        ),
      );
    });
  }, [ready, text]);

  const summary = useMemo(() => {
    const structured = items.filter((item) => item.type === "postgres").length;
    const uploaded = items.filter((item) => item.type !== "postgres").length;
    const readyCount = items.filter((item) => item.status === "profiled" || item.status === "ready").length;
    const trainingReady = items.filter((item) => item.type === "annotation-yolo" || item.schemaProfile === "yolo_v10_detect").length;
    return { structured, uploaded, readyCount, trainingReady };
  }, [items]);
  const pagedItems = useMemo(() => getPagedItems(items, itemPage, 4), [items, itemPage]);

  const localizedPromptPresets = useMemo(() => promptPresets.map((item) => localizePromptPreset(item, locale)), [promptPresets, locale]);
  const selectedPreset = localizedPromptPresets.find((item) => item.id === promptPresetId) ?? null;

  const handleCreate = async () => {
    setLoading(true);
    try {
      await enterprisePost("/data-sources", {
        type: sourceType,
        name,
        schemaProfile,
        connectionMeta: sourceType === "postgres" ? { schema: "public", table: "wheels" } : {},
      });
      setName("");
      await load();
      setMessage(
        text(
          "数据源已创建，后端已完成 profiling，并生成了可供 AI 使用的上下文摘要。",
          "Source created. The backend has already profiled it and produced AI-ready context metadata.",
        ),
      );
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, text("创建数据源失败。", "Failed to create the data source.")));
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name.replace(/\.[^.]+$/, ""));
      formData.append("schemaProfile", schemaProfile);
      await enterpriseUpload("/data-sources/upload", formData);
      await load();
      setMessage(
        text(
          "文件已上传并完成 profiling。字段摘要、质量发现和示例分析格式已经生成。",
          "File uploaded and profiled. Field hints, quality findings, and a sample analysis format are now available.",
        ),
      );
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, text("上传文件失败。", "Failed to upload the file.")));
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const handleCreateSourceAnalysis = async (source: DataSourceProfile) => {
    if (!providerId || !promptPresetId) {
      setMessage(text("请先配置真实模型服务和提示词预设，再创建数据源分析。", "Configure a real provider and prompt preset before creating a source analysis."));
      return;
    }

    setLoading(true);
    try {
      const created = await enterprisePost<AnalysisJob>("/analysis/jobs", {
        prompt: analysisPrompt,
        template: selectedPreset?.recommendedTemplate ?? "quality-variance",
        verbosity: "standard",
        providerId,
        persona: "operator",
        locale,
        promptPresetId,
        sourceIds: [source.id],
      });
      setMessage(text(`已创建正式分析：${created.result.headline}`, `Formal source analysis created: ${created.result.headline}`));
    } catch (error) {
      console.error(error);
      setMessage(
        enterpriseErrorMessage(
          error,
          text("创建数据源专属分析失败，请先检查模型服务配置。", "Failed to create a source-specific analysis. Check the provider configuration first."),
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/workspace"
        title={text("正在加载数据中心", "Loading Data Hub")}
        description={text("正在校验会话并准备数据源、画像和路由布局...", "Verifying the session and preparing sources, profiling, and routing layout...")}
      />
    );
  }

  return (
    <div className="enterprise-shell">
      <BackButton fallbackHref="/workspace" />

      <section className="enterprise-hero">
        <div>
          <span className="eyebrow">{text("数据中心", "Data Hub")}</span>
          <h1>{text("已分析的数据接入与直达 AI 路由", "Profiled data intake with direct AI routing")}</h1>
          <p>
            {text(
              "每个上传文件和导出的数据集都会先在后端完成 profiling，再出现在这里。你可以从同一张数据源卡片直接进入 AI 助手、报告中心或训练中心，不需要重复选择上下文。",
              "Every uploaded file and exported dataset is profiled on the backend before it appears here. From the same source card you can now move directly into AI diagnosis, report authoring, or training readiness with the source already selected.",
            )}
          </p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>{text("结构化源", "Structured")}</span>
            <strong>{summary.structured}</strong>
          </div>
          <div>
            <span>{text("上传源", "Uploaded")}</span>
            <strong>{summary.uploaded}</strong>
          </div>
          <div>
            <span>{text("可训练", "Training-ready")}</span>
            <strong>{summary.trainingReady}</strong>
          </div>
          <div>
            <span>{text("可分析", "Ready for analysis")}</span>
            <strong>{summary.readyCount}</strong>
          </div>
        </div>
      </section>

      {message ? <div className="auth-message">{message}</div> : null}

      <div className="enterprise-grid">
        <Card className="enterprise-side-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">{text("数据源构建", "Source Builder")}</span>
              <h2>{text("创建、分析并路由", "Create, profile, and route")}</h2>
            </div>
          </div>

          <div className="enterprise-form-grid">
            <label>
              <span>{text("数据源名称", "Source name")}</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={text("检测汇总 / 异常复盘 / 导出数据集", "Inspection summary / anomaly review / exported dataset")}
              />
            </label>

            <label>
              <span>{text("数据源类型", "Source type")}</span>
              <select value={sourceType} onChange={(event) => setSourceType(event.target.value)}>
                <option value="postgres">PostgreSQL</option>
                <option value="csv">CSV</option>
                <option value="xlsx">Excel</option>
                <option value="docx">Word</option>
                <option value="pdf">PDF</option>
              </select>
            </label>

            <label>
              <span>{text("Schema 配置", "Schema profile")}</span>
              <input value={schemaProfile} onChange={(event) => setSchemaProfile(event.target.value)} />
            </label>

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
              <span>{text("默认分析请求", "Default source prompt")}</span>
              <textarea className="enterprise-textarea" value={analysisPrompt} onChange={(event) => setAnalysisPrompt(event.target.value)} />
            </label>
          </div>

          <div className="enterprise-action-row">
            <button type="button" className="enterprise-primary-button" onClick={handleCreate} disabled={loading}>
              {loading ? text("处理中...", "Processing...") : text("创建数据源", "Create source")}
            </button>
            <label className="enterprise-secondary-button enterprise-upload-button">
              {text("上传并分析", "Upload and profile")}
              <input type="file" accept=".csv,.xlsx,.docx,.pdf" onChange={handleUpload} hidden />
            </label>
          </div>

          <div className="enterprise-note-card">
            <strong>{text("当前预设", "Active prompt preset")}</strong>
            <span>{selectedPreset?.objective ?? text("请选择一个预设，定义后端如何组织数据源分析。", "Select a preset to define how the backend should scaffold source analysis.")}</span>
          </div>

          <div className="enterprise-note-card">
            <strong>{text("最佳实践", "Best practice")}</strong>
            <span>
              {text(
                "质量运营简报适合现场解释，正式报告编写适合导出型分析，训练顾问适合导出的 YOLO 数据集。",
                "Use quality briefing for operational explanation, report author for export-ready narratives, and training advisor when the source is an exported YOLO dataset.",
              )}
            </span>
          </div>
        </Card>

        <div className="enterprise-card-stack enterprise-panel-scroll">
          <PagedBlockControls
            count={items.length}
            page={pagedItems.safePage}
            pageCount={pagedItems.pageCount}
            expanded={itemsExpanded}
            onPrev={() => setItemPage((current) => Math.max(0, current - 1))}
            onNext={() => setItemPage((current) => Math.min(pagedItems.pageCount - 1, current + 1))}
            onToggle={() => setItemsExpanded((current) => !current)}
            labels={{
              total: text("共", "Total"),
              items: text("项", "items"),
              expand: text("展开", "Expand"),
              collapse: text("收起", "Collapse"),
              prev: text("上一页", "Prev"),
              next: text("下一页", "Next"),
            }}
          />
          {itemsExpanded ? pagedItems.items.map((item) => {
            const fields = splitMetaList(item.connectionMeta.detectedFields);
            const findings = splitMetaList(item.connectionMeta.qualityFindings);
            const questions = splitMetaList(item.connectionMeta.recommendedQuestions);
            const aiAssistantQuery = buildQuery({
              sourceId: item.id,
              preset: promptPresetId,
              template: selectedPreset?.recommendedTemplate ?? "quality-variance",
              prompt: analysisPrompt,
            });
            const reportsQuery = buildQuery({
              sourceId: item.id,
              preset: promptPresetId,
              template: selectedPreset?.recommendedTemplate ?? "quality-variance",
              prompt: analysisPrompt,
            });
            const trainingQuery = buildQuery({
              sourceId: item.id,
              preset: item.type === "annotation-yolo" ? "yolov10-balanced" : "cpu-safe-demo",
              baseModel: "yolov10n.pt",
              device: "auto",
            });

            return (
              <Card key={item.id} className="enterprise-data-card">
                <div className="enterprise-data-card-top">
                  <div>
                    <strong>{item.name}</strong>
                    <span>
                      {item.type.toUpperCase()} / {item.schemaProfile}
                    </span>
                  </div>
                  <div className={`status-chip ${item.qualityScore === "A" ? "status-success" : item.qualityScore === "B" ? "status-warning" : "status-danger"}`}>
                    {text("等级", "Grade")} {item.qualityScore}
                  </div>
                </div>

                <div className="enterprise-data-meta">
                  <div>
                    <span>{text("状态", "Status")}</span>
                    <strong>{item.status}</strong>
                  </div>
                  <div>
                    <span>{text("行数", "Rows")}</span>
                    <strong>{item.rowCount}</strong>
                  </div>
                  <div>
                    <span>{text("更新时间", "Updated")}</span>
                    <strong>{new Date(item.updatedAt).toLocaleString(locale === "zh-CN" ? "zh-CN" : "en-US")}</strong>
                  </div>
                </div>

                <div className="enterprise-action-row">
                  <Link href={`/ai-assistant?${aiAssistantQuery}`} className="enterprise-secondary-button">
                    {text("在 AI 助手中打开", "Open in AI Assistant")}
                  </Link>
                  <Link href={`/reports?${reportsQuery}`} className="enterprise-secondary-button">
                    {text("在报告中心中打开", "Open in Report Center")}
                  </Link>
                  {item.type === "annotation-yolo" || item.schemaProfile === "yolo_v10_detect" ? (
                    <Link href={`/training?${trainingQuery}`} className="enterprise-secondary-button">
                      {text("在训练中心中打开", "Open in Training")}
                    </Link>
                  ) : null}
                  <button type="button" className="enterprise-primary-button" onClick={() => handleCreateSourceAnalysis(item)} disabled={loading || !providerId}>
                    {text("创建数据源诊断", "Create source diagnosis")}
                  </button>
                </div>

                <div className="enterprise-note-card">
                  <strong>{text("Profile 摘要", "Profile summary")}</strong>
                  <span>{item.connectionMeta.analysisSummary ?? text("该数据源已注册，但还没有生成详细 profiling。", "This source is registered but has not produced a detailed profile yet.")}</span>
                </div>

                <div className="enterprise-chip-grid">
                  {(fields.length ? fields : Object.keys(item.previewRows[0] ?? {})).map((field) => (
                    <span key={field} className="enterprise-chip enterprise-chip-static">
                      {field}
                    </span>
                  ))}
                </div>

                <details className="enterprise-card-details">
                  <summary>{text("查看预览、质量发现与建议问题", "View preview, findings, and recommended questions")}</summary>
                <div className="enterprise-preview-table">
                  {item.previewRows.length ? (
                    item.previewRows.map((row, index) => (
                      <div key={`${item.id}-${index}`} className="enterprise-preview-row">
                        {Object.entries(row).map(([key, value]) => (
                          <span key={key}>
                            <strong>{key}</strong> {value}
                          </span>
                        ))}
                      </div>
                    ))
                  ) : (
                    <div className="empty-state">
                      <span>{text("样例", "Rows")}</span>
                      {text("当前数据源还没有可展示的预览记录。", "No sampled preview rows are available for this source yet.")}
                    </div>
                  )}
                </div>

                <div className="enterprise-note-card">
                  <strong>{text("质量发现", "Quality findings")}</strong>
                  <span>{(findings.length ? findings : [text("当前还没有质量发现。", "No quality findings are available yet.")]).join(" ")}</span>
                </div>

                <div className="enterprise-note-card">
                  <strong>{text("建议问题", "Recommended questions")}</strong>
                  <span>{(questions.length ? questions : [text("上传真实数据源后，这里会生成引导式分析问题。", "Upload a real source to generate guided analysis prompts.")]).join(" ")}</span>
                </div>

                <div className="enterprise-note-card">
                  <strong>{text("示例分析格式", "Sample analysis format")}</strong>
                  <span>{item.connectionMeta.sampleFormat ?? '{"task":"quality-variance-diagnosis","requiredFields":[]}'}</span>
                </div>
                </details>
              </Card>
            );
          }) : <div className="enterprise-collapsed-note">{text("数据源列表已折叠", "Source list collapsed")}</div>}
        </div>
      </div>
    </div>
  );
}
