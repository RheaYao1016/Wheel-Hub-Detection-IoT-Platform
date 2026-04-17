"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import PagedBlockControls, {
  getPagedItems,
} from "../components/Layout/PagedBlockControls";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
import {
  enterpriseErrorMessage,
  enterpriseGet,
  enterprisePost,
  enterpriseUpload,
} from "@/lib/enterprise-client";
import { localizePromptPreset } from "@/lib/enterprise-localization";
import type { AppLocale } from "@/lib/locale";
import type {
  AiProviderProfile,
  AnalysisJob,
  DataSourceProfile,
  PromptPreset,
} from "@/types/enterprise";

function splitMetaList(value?: string) {
  return (
    value
      ?.split("||")
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
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

function usesChineseCopy(locale: AppLocale) {
  return new Intl.Locale(locale).language === "zh";
}

function localizeSourceType(type: string, locale: AppLocale) {
  if (!usesChineseCopy(locale)) {
    return type.toUpperCase();
  }

  const normalized = type.toLowerCase();
  const mapping: Record<string, string> = {
    postgres: "PostgreSQL 数据源",
    csv: "CSV 文件",
    xlsx: "Excel 文件",
    docx: "Word 文档",
    pdf: "PDF 文档",
    "annotation-yolo": "YOLO 标注集",
  };

  return mapping[normalized] ?? type;
}

function localizeSchemaProfile(profile: string, locale: AppLocale) {
  if (!usesChineseCopy(locale)) {
    return profile;
  }

  const mapping: Record<string, string> = {
    inspection_default: "通用检测结构",
    bridge_cable_roundtrip: "桥索往返检测结构",
    yolo_v10_detect: "YOLOv10 检测结构",
  };

  return mapping[profile] ?? profile;
}

function localizeSourceStatus(status: string, locale: AppLocale) {
  if (!usesChineseCopy(locale)) {
    return status;
  }

  const mapping: Record<string, string> = {
    profiled: "已分析",
    ready: "就绪",
    uploaded: "已上传",
    created: "已创建",
    failed: "失败",
  };

  return mapping[status.toLowerCase()] ?? status;
}

function localizeDataSourceName(
  name: string,
  type: string,
  locale: AppLocale,
) {
  if (!usesChineseCopy(locale)) {
    return name;
  }

  let localized = name;
  localized = localized.replace(
    /Bridge Cable Roundtrip Source/gi,
    "桥索往返检测数据源",
  );
  localized = localized.replace(/Wheel Hub Inspection Source/gi, "轮毂检测数据源");
  localized = localized.replace(/SourceCSV/gi, "数据源 CSV");
  localized = localized.replace(/SourceXLSX/gi, "数据源 Excel");

  return localized || localizeSourceType(type, locale);
}

function localizeDataSourceSummary(
  summary: string | undefined,
  sourceName: string,
  locale: AppLocale,
) {
  if (!summary || !usesChineseCopy(locale)) {
    return summary;
  }

  const localizedName = localizeDataSourceName(sourceName, "", locale);
  const profiledMatch = summary.match(
    /^(.*) has been structurally profiled\. It contains (\d+) fields and (\d+) sample rows, making it suitable for quality diagnosis, import checks, and AI-assisted reporting\.$/i,
  );

  if (profiledMatch) {
    return `${localizedName}已完成结构化分析，包含 ${profiledMatch[2]} 个字段与 ${profiledMatch[3]} 条样例数据，可直接用于质量诊断、导入核验和 AI 辅助报告。`;
  }

  return summary
    .replace(/has been structurally profiled/gi, "已完成结构化分析")
    .replace(/making it suitable for/gi, "可直接用于")
    .replace(/quality diagnosis/gi, "质量诊断")
    .replace(/import checks/gi, "导入核验")
    .replace(/AI-assisted reporting/gi, "AI 辅助报告")
    .replace(/sample rows/gi, "条样例数据")
    .replace(/fields/gi, "个字段");
}

export default function DataHubPage() {
  const ready = useSessionGuard(["admin", "engineer", "operator"]);
  const { locale, text, t } = useLocale();
  const [items, setItems] = useState<DataSourceProfile[]>([]);
  const [providers, setProviders] = useState<AiProviderProfile[]>([]);
  const [promptPresets, setPromptPresets] = useState<PromptPreset[]>([]);
  const [name, setName] = useState("");
  const [schemaProfile, setSchemaProfile] = useState("inspection_default");
  const [sourceType, setSourceType] = useState("postgres");
  const [providerId, setProviderId] = useState("");
  const [promptPresetId, setPromptPresetId] = useState("quality-ops-briefing");
  const [analysisPrompt, setAnalysisPrompt] = useState(
    t("pages.data_hub.copy001"),
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
      (current) =>
        current ||
        presetData.find((item) => item.id === "quality-ops-briefing")?.id ||
        presetData[0]?.id ||
        "",
    );
  };

  useEffect(() => {
    if (!ready) return;
    load().catch((error) => {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, t("pages.data_hub.copy002")));
    });
  }, [ready, text]);

  const summary = useMemo(() => {
    const structured = items.filter((item) => item.type === "postgres").length;
    const uploaded = items.filter((item) => item.type !== "postgres").length;
    const readyCount = items.filter(
      (item) => item.status === "profiled" || item.status === "ready",
    ).length;
    const trainingReady = items.filter(
      (item) =>
        item.type === "annotation-yolo" ||
        item.schemaProfile === "yolo_v10_detect",
    ).length;
    return { structured, uploaded, readyCount, trainingReady };
  }, [items]);
  const pagedItems = useMemo(
    () => getPagedItems(items, itemPage, 4),
    [items, itemPage],
  );

  const localizedPromptPresets = useMemo(
    () => promptPresets.map((item) => localizePromptPreset(item, locale)),
    [promptPresets, locale],
  );
  const selectedPreset =
    localizedPromptPresets.find((item) => item.id === promptPresetId) ?? null;

  const handleCreate = async () => {
    setLoading(true);
    try {
      await enterprisePost("/data-sources", {
        type: sourceType,
        name,
        schemaProfile,
        connectionMeta:
          sourceType === "postgres"
            ? { schema: "public", table: "wheels" }
            : {},
      });
      setName("");
      await load();
      setMessage(t("pages.data_hub.copy003"));
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, t("pages.data_hub.copy004")));
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
      setMessage(t("pages.data_hub.copy005"));
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, t("pages.data_hub.copy006")));
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const handleCreateSourceAnalysis = async (source: DataSourceProfile) => {
    if (!providerId || !promptPresetId) {
      setMessage(t("pages.data_hub.copy007"));
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
      setMessage(t("pages.data_hub.copy008", { p1: created.result.headline }));
    } catch (error) {
      console.error(error);
      setMessage(enterpriseErrorMessage(error, t("pages.data_hub.copy009")));
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/workspace"
        title={t("pages.data_hub.copy010")}
        description={t("pages.data_hub.copy011")}
      />
    );
  }

  return (
    <div className="enterprise-shell">
      <BackButton fallbackHref="/workspace" />

      <section className="enterprise-hero">
        <div>
          <span className="eyebrow">{t("pages.data_hub.copy012")}</span>
          <h1>{t("pages.data_hub.copy013")}</h1>
          <p>{t("pages.data_hub.copy014")}</p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>{t("pages.data_hub.copy015")}</span>
            <strong>{summary.structured}</strong>
          </div>
          <div>
            <span>{t("pages.data_hub.copy016")}</span>
            <strong>{summary.uploaded}</strong>
          </div>
          <div>
            <span>{t("pages.data_hub.copy017")}</span>
            <strong>{summary.trainingReady}</strong>
          </div>
          <div>
            <span>{t("pages.data_hub.copy018")}</span>
            <strong>{summary.readyCount}</strong>
          </div>
        </div>
      </section>

      {message ? <div className="auth-message">{message}</div> : null}

      <div className="enterprise-grid data-hub-grid">
        <Card className="enterprise-side-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {t("pages.data_hub.copy019")}
              </span>
              <h2>{t("pages.data_hub.copy020")}</h2>
            </div>
          </div>

          <div className="enterprise-form-grid">
            <label>
              <span>{t("pages.data_hub.copy021")}</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("pages.data_hub.copy022")}
              />
            </label>

            <label>
              <span>{t("pages.data_hub.copy023")}</span>
              <select
                value={sourceType}
                onChange={(event) => setSourceType(event.target.value)}
              >
                <option value="postgres">
                  {text("PostgreSQL 数据源", "PostgreSQL")}
                </option>
                <option value="csv">{text("CSV 文件", "CSV")}</option>
                <option value="xlsx">{text("Excel 文件", "Excel")}</option>
                <option value="docx">{text("Word 文档", "Word")}</option>
                <option value="pdf">{text("PDF 文档", "PDF")}</option>
              </select>
            </label>

            <label>
              <span>{t("pages.data_hub.copy024")}</span>
              <input
                value={schemaProfile}
                onChange={(event) => setSchemaProfile(event.target.value)}
              />
            </label>

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
              <span>{t("pages.data_hub.copy025")}</span>
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
              <span>{t("pages.data_hub.copy026")}</span>
              <textarea
                className="enterprise-textarea"
                value={analysisPrompt}
                onChange={(event) => setAnalysisPrompt(event.target.value)}
              />
            </label>
          </div>

          <div className="enterprise-action-row">
            <button
              type="button"
              className="enterprise-primary-button"
              onClick={handleCreate}
              disabled={loading}
            >
              {loading
                ? t("pages.data_hub.copy027")
                : t("pages.data_hub.copy028")}
            </button>
            <label className="enterprise-secondary-button enterprise-upload-button">
              {t("pages.data_hub.copy029")}
              <input
                type="file"
                accept=".csv,.xlsx,.docx,.pdf"
                onChange={handleUpload}
                hidden
              />
            </label>
          </div>

          <div className="enterprise-note-card">
            <strong>{t("pages.data_hub.copy030")}</strong>
            <span>
              {selectedPreset?.objective ?? t("pages.data_hub.copy031")}
            </span>
          </div>

          <details className="enterprise-card-details">
            <summary>{t("pages.data_hub.copy032")}</summary>
            <div className="enterprise-note-card">
              <strong>{t("pages.data_hub.copy033")}</strong>
              <span>{t("pages.data_hub.copy034")}</span>
            </div>
          </details>
        </Card>

        <div className="enterprise-card-stack">
          <PagedBlockControls
            count={items.length}
            page={pagedItems.safePage}
            pageCount={pagedItems.pageCount}
            expanded={itemsExpanded}
            showToggle={false}
            onPrev={() => setItemPage((current) => Math.max(0, current - 1))}
            onNext={() =>
              setItemPage((current) =>
                Math.min(pagedItems.pageCount - 1, current + 1),
              )
            }
            onToggle={() => setItemsExpanded((current) => !current)}
            labels={{
              total: t("pages.ai_assistant.copy011"),
              items: t("pages.ai_assistant.copy012"),
              expand: t("pages.ai_assistant.copy014"),
              collapse: t("pages.ai_assistant.copy013"),
              prev: t("pages.ai_assistant.copy015"),
              next: t("pages.ai_assistant.copy016"),
            }}
          />
          {itemsExpanded ? (
            pagedItems.items.map((item) => {
              const fields = splitMetaList(item.connectionMeta.detectedFields);
              const findings = splitMetaList(
                item.connectionMeta.qualityFindings,
              );
              const questions = splitMetaList(
                item.connectionMeta.recommendedQuestions,
              );
              const aiAssistantQuery = buildQuery({
                sourceId: item.id,
                preset: promptPresetId,
                template:
                  selectedPreset?.recommendedTemplate ?? "quality-variance",
                prompt: analysisPrompt,
              });
              const reportsQuery = buildQuery({
                sourceId: item.id,
                preset: promptPresetId,
                template:
                  selectedPreset?.recommendedTemplate ?? "quality-variance",
                prompt: analysisPrompt,
              });
              const trainingQuery = buildQuery({
                sourceId: item.id,
                preset:
                  item.type === "annotation-yolo"
                    ? "yolov10-balanced"
                    : "cpu-safe-demo",
                baseModel: "yolov10n.pt",
                device: "auto",
              });
              const localizedName = localizeDataSourceName(
                item.name,
                item.type,
                locale,
              );
              const localizedType = localizeSourceType(item.type, locale);
              const localizedProfile = localizeSchemaProfile(
                item.schemaProfile,
                locale,
              );
              const localizedStatus = localizeSourceStatus(
                item.status,
                locale,
              );
              const localizedSummary = localizeDataSourceSummary(
                item.connectionMeta.analysisSummary,
                item.name,
                locale,
              );

              return (
                <Card key={item.id} className="enterprise-data-card">
                  <div className="enterprise-data-card-top">
                    <div>
                      <strong>{localizedName}</strong>
                      <span>
                        {localizedType} / {localizedProfile}
                      </span>
                    </div>
                    <div
                      className={`status-chip ${item.qualityScore === "A" ? "status-success" : item.qualityScore === "B" ? "status-warning" : "status-danger"}`}
                    >
                      {t("pages.data_hub.copy035")} {item.qualityScore}
                    </div>
                  </div>

                  <div className="enterprise-data-meta">
                    <div>
                      <span>{t("pages.admin.alerts.copy017")}</span>
                      <strong>{localizedStatus}</strong>
                    </div>
                    <div>
                      <span>{t("pages.data_hub.copy036")}</span>
                      <strong>{item.rowCount}</strong>
                    </div>
                    <div>
                      <span>{t("pages.data_hub.copy037")}</span>
                      <strong>
                        {new Date(item.updatedAt).toLocaleString(
                          t("pages.data_hub.copy038"),
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="enterprise-action-row">
                    <Link
                      href={`/ai-assistant?${aiAssistantQuery}`}
                      className="enterprise-secondary-button"
                    >
                      {t("pages.data_hub.copy039")}
                    </Link>
                    <button
                      type="button"
                      className="enterprise-primary-button"
                      onClick={() => handleCreateSourceAnalysis(item)}
                      disabled={loading || !providerId}
                    >
                      {t("pages.data_hub.copy040")}
                    </button>
                  </div>

                  <p className="panel-caption data-hub-summary">
                    {localizedSummary ?? t("pages.data_hub.copy041")}
                  </p>

                  <details className="enterprise-card-details data-hub-details">
                    <summary>{t("pages.data_hub.copy042")}</summary>

                    <div className="enterprise-chip-grid">
                      {(fields.length
                        ? fields
                        : Object.keys(item.previewRows[0] ?? {})
                      ).map((field) => (
                        <span
                          key={field}
                          className="enterprise-chip enterprise-chip-static"
                        >
                          {field}
                        </span>
                      ))}
                    </div>

                    <div className="enterprise-note-card">
                      <strong>{t("pages.data_hub.copy043")}</strong>
                      <span>
                        {localizedSummary ?? t("pages.data_hub.copy041")}
                      </span>
                    </div>

                    <div className="enterprise-action-row data-hub-actions">
                      <Link
                        href={`/reports?${reportsQuery}`}
                        className="enterprise-secondary-button"
                      >
                        {t("pages.data_hub.copy044")}
                      </Link>
                      {item.type === "annotation-yolo" ||
                      item.schemaProfile === "yolo_v10_detect" ? (
                        <Link
                          href={`/training?${trainingQuery}`}
                          className="enterprise-secondary-button"
                        >
                          {t("pages.data_hub.copy045")}
                        </Link>
                      ) : null}
                    </div>

                    <div className="enterprise-preview-table">
                      {item.previewRows.length ? (
                        item.previewRows.map((row, index) => (
                          <div
                            key={`${item.id}-${index}`}
                            className="enterprise-preview-row"
                          >
                            {Object.entries(row).map(([key, value]) => (
                              <span key={key}>
                                <strong>{key}</strong> {value}
                              </span>
                            ))}
                          </div>
                        ))
                      ) : (
                        <div className="empty-state">
                          <span>{t("pages.data_hub.copy046")}</span>
                          {t("pages.data_hub.copy047")}
                        </div>
                      )}
                    </div>

                    <div className="enterprise-note-card">
                      <strong>{t("pages.data_hub.copy048")}</strong>
                      <span>
                        {(findings.length
                          ? findings
                          : [t("pages.data_hub.copy049")]
                        )
                          .map((entry) =>
                            localizeDataSourceSummary(entry, item.name, locale) ??
                            entry,
                          )
                          .join(" ")}
                      </span>
                    </div>

                    <div className="enterprise-note-card">
                      <strong>{t("pages.data_hub.copy050")}</strong>
                      <span>
                        {(questions.length
                          ? questions
                          : [t("pages.data_hub.copy051")]
                        )
                          .map((entry) =>
                            localizeDataSourceSummary(entry, item.name, locale) ??
                            entry,
                          )
                          .join(" ")}
                      </span>
                    </div>

                    <div className="enterprise-note-card">
                      <strong>{t("pages.data_hub.copy052")}</strong>
                      <span>
                        {item.connectionMeta.sampleFormat ??
                          '{"task":"quality-variance-diagnosis","requiredFields":[]}'}
                      </span>
                    </div>
                  </details>
                </Card>
              );
            })
          ) : (
            <div className="enterprise-collapsed-note">
              {t("pages.ai_assistant.copy107")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
