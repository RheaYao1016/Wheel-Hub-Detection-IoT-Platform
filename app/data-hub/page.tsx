"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Database,
  FileSearch,
  FileUp,
  FileWarning,
  FolderSearch,
  ShieldAlert,
  Sparkles,
  Wand2,
} from "lucide-react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import EmptyStateCard from "../components/Layout/EmptyStateCard";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import TaskSection from "../components/Layout/TaskSection";
import WorkbenchFilterBar from "../components/Layout/WorkbenchFilterBar";
import WorkflowHero from "../components/Layout/WorkflowHero";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/Table";
import { Textarea } from "../components/ui/Textarea";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
import {
  enterpriseErrorMessage,
  enterpriseGet,
  enterprisePost,
  enterpriseUpload,
} from "@/lib/enterprise-client";
import { localizePromptPreset } from "@/lib/enterprise-localization";
import { cn } from "@/lib/utils";
import type {
  AiProviderProfile,
  AnalysisJob,
  DataSourceProfile,
  PromptPreset,
} from "@/types/enterprise";

type CatalogFilter = "all" | "attention" | "ready" | "train" | "documents";
type QualityFilter = "all" | "A" | "B" | "C";
type StatusFilter = "all" | "ready" | "profiled" | "draft" | "watch";

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

function isTrainingReady(source: DataSourceProfile) {
  return (
    source.type === "annotation-yolo" ||
    source.schemaProfile === "yolo_v10_detect"
  );
}

function isAnalysisReady(source: DataSourceProfile) {
  return source.status === "profiled" || source.status === "ready";
}

function needsAttention(source: DataSourceProfile) {
  return (
    source.qualityScore === "C" ||
    !isAnalysisReady(source) ||
    Number(source.rowCount) <= 0
  );
}

function isDocumentSource(source: DataSourceProfile) {
  return ["csv", "xlsx", "docx", "pdf"].includes(source.type);
}

function getPrimaryRoute(source: DataSourceProfile) {
  if (isTrainingReady(source)) {
    return "train";
  }
  if (needsAttention(source)) {
    return "repair";
  }
  return "analyze";
}

function getStatusVariant(source: DataSourceProfile) {
  if (source.status === "ready") return "success" as const;
  if (source.status === "profiled") return "info" as const;
  if (needsAttention(source)) return "warning" as const;
  return "secondary" as const;
}

function getQualityVariant(source: DataSourceProfile) {
  if (source.qualityScore === "A") return "success" as const;
  if (source.qualityScore === "B") return "warning" as const;
  return "destructive" as const;
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
  const [catalogFilter, setCatalogFilter] = useState<CatalogFilter>("all");
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchValue, setSearchValue] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");

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
  }, [ready, t]);

  const localizedPromptPresets = useMemo(
    () => promptPresets.map((item) => localizePromptPreset(item, locale)),
    [promptPresets, locale],
  );

  const selectedPreset =
    localizedPromptPresets.find((item) => item.id === promptPresetId) ?? null;

  const summary = useMemo(() => {
    const structured = items.filter((item) => item.type === "postgres").length;
    const uploaded = items.filter((item) => item.type !== "postgres").length;
    const readyCount = items.filter(isAnalysisReady).length;
    const trainingReady = items.filter(isTrainingReady).length;
    const attentionCount = items.filter(needsAttention).length;
    return {
      structured,
      uploaded,
      readyCount,
      trainingReady,
      attentionCount,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const query = searchValue.trim().toLowerCase();

    return items.filter((item) => {
      if (catalogFilter === "attention" && !needsAttention(item)) return false;
      if (catalogFilter === "ready" && !isAnalysisReady(item)) return false;
      if (catalogFilter === "train" && !isTrainingReady(item)) return false;
      if (catalogFilter === "documents" && !isDocumentSource(item)) return false;

      if (qualityFilter !== "all" && item.qualityScore !== qualityFilter) {
        return false;
      }

      if (statusFilter === "ready" && item.status !== "ready") return false;
      if (statusFilter === "profiled" && item.status !== "profiled") return false;
      if (statusFilter === "draft" && isAnalysisReady(item)) return false;
      if (statusFilter === "watch" && !needsAttention(item)) return false;

      if (!query) return true;

      const searchable = [
        item.name,
        item.type,
        item.schemaProfile,
        item.status,
        item.qualityScore,
        item.connectionMeta.analysisSummary,
        item.connectionMeta.detectedFields,
        item.connectionMeta.qualityFindings,
        item.connectionMeta.recommendedQuestions,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [catalogFilter, items, qualityFilter, searchValue, statusFilter]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedSourceId("");
      return;
    }

    const activeStillVisible = filteredItems.some(
      (item) => item.id === selectedSourceId,
    );
    if (!activeStillVisible) {
      setSelectedSourceId(filteredItems[0].id);
    }
  }, [filteredItems, selectedSourceId]);

  const selectedSource =
    filteredItems.find((item) => item.id === selectedSourceId) ??
    filteredItems[0] ??
    null;

  const selectedSourceFields = selectedSource
    ? splitMetaList(selectedSource.connectionMeta.detectedFields)
    : [];
  const selectedSourceFindings = selectedSource
    ? splitMetaList(selectedSource.connectionMeta.qualityFindings)
    : [];
  const selectedSourceQuestions = selectedSource
    ? splitMetaList(selectedSource.connectionMeta.recommendedQuestions)
    : [];

  const intakeChecklist = useMemo(
    () => [
      {
        title: text("需要补数据治理", "Needs data governance"),
        value: `${summary.attentionCount}`,
        detail: text(
          "质量偏弱、字段不全或尚未完成画像的源应该先回到数据治理。",
          "Weak-quality or incomplete sources should return to governance first.",
        ),
        icon: <ShieldAlert className="h-5 w-5" />,
        tone:
          summary.attentionCount > 0
            ? ("warning" as const)
            : ("success" as const),
      },
      {
        title: text("可以直接进 AI", "Ready for AI"),
        value: `${summary.readyCount}`,
        detail: text(
          "这些源已经足够支撑提问、分析和报告链路。",
          "These sources are usable for analysis, prompting, and reporting.",
        ),
        icon: <BrainCircuit className="h-5 w-5" />,
        tone: "info" as const,
      },
      {
        title: text("训练候选集", "Training candidates"),
        value: `${summary.trainingReady}`,
        detail: text(
          "YOLO 类型数据集可直接送入训练中心，不必再绕路。",
          "YOLO-style datasets can move straight into training.",
        ),
        icon: <Wand2 className="h-5 w-5" />,
        tone:
          summary.trainingReady > 0
            ? ("success" as const)
            : ("default" as const),
      },
      {
        title: text("文档类资产", "Document assets"),
        value: `${summary.uploaded}`,
        detail: text(
          "文档、Excel 和 CSV 更适合先走分析与报告，再决定是否结构化沉淀。",
          "Documents and spreadsheets usually go to analysis before deeper structuring.",
        ),
        icon: <FileSearch className="h-5 w-5" />,
        tone: "default" as const,
      },
    ],
    [summary, text],
  );

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
    <div className="relative mx-auto max-w-[1920px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary/10 blur-[110px]" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-accent/10 blur-[110px]" />
      </div>

      <BackButton fallbackHref="/workspace" />

      <WorkflowHero
        eyebrow={t("pages.data_hub.copy012")}
        title={t("pages.data_hub.copy013")}
        description={t("pages.data_hub.copy014")}
        stats={[
          {
            label: t("pages.data_hub.copy015"),
            value: `${summary.structured}`,
            detail: text("结构化连接源", "Structured sources"),
            icon: <Database className="h-5 w-5" />,
          },
          {
            label: t("pages.data_hub.copy016"),
            value: `${summary.uploaded}`,
            detail: text("上传文件源", "Uploaded files"),
            icon: <FileUp className="h-5 w-5" />,
            tone: "info",
          },
          {
            label: t("pages.data_hub.copy018"),
            value: `${summary.readyCount}`,
            detail: text("已可用于分析", "Ready for analysis"),
            icon: <Sparkles className="h-5 w-5" />,
            tone: summary.readyCount > 0 ? "success" : "default",
          },
          {
            label: text("待治理资产", "Needs governance"),
            value: `${summary.attentionCount}`,
            detail: text("先补字段、质量与画像", "Fix quality and profiling first"),
            icon: <ShieldAlert className="h-5 w-5" />,
            tone: summary.attentionCount > 0 ? "warning" : "success",
          },
        ]}
        actions={
          <>
            <Button asChild>
              <Link href="/workspace">{text("返回工作台", "Back To Workspace")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/reports">{text("去报告中心", "Open Reports")}</Link>
            </Button>
          </>
        }
        aside={
          <Card variant="glass" className="h-full border-border/60">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                {text("数据中心顺序", "Data hub order")}
              </Badge>
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>{text("1. 先接入源，并给它明确 schema 与分析目标。", "1. Register the source with a clear schema and analysis goal.")}</p>
                <p>{text("2. 再判断它是应该去 AI、报告、训练，还是先回治理。", "2. Decide whether it belongs in AI, reporting, training, or governance next.")}</p>
                <p>{text("3. 最后在目录里保留可复核的质量证据和下一步入口。", "3. Keep quality evidence and the next step visible in the catalog.")}</p>
              </div>
            </div>
          </Card>
        }
      />

      {message ? (
        <div className="mb-8 rounded-2xl border border-border/60 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}

      <TaskSection
        eyebrow={text("源接入", "Source intake")}
        title={text(
          "把接入、分析策略和去向编排放在同一个入口",
          "Keep intake, analysis strategy, and downstream routing in one entry surface",
        )}
        description={text(
          "这里参考成熟企业后台常见的数据接入工作面，不再让用户在创建完源之后自己猜下一步。",
          "This follows enterprise data-intake workbench patterns so users do not have to guess the next step after creating a source.",
        )}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Card variant="glass" className="border-border/60">
            <div className="mb-5 flex items-center gap-3">
              <Database className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">{t("pages.data_hub.copy020")}</h3>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium">{t("pages.data_hub.copy021")}</span>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder={t("pages.data_hub.copy022")}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">{t("pages.data_hub.copy023")}</span>
                <Select value={sourceType} onValueChange={setSourceType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Source type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postgres">PostgreSQL</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">Excel</SelectItem>
                    <SelectItem value="docx">Word</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">{t("pages.data_hub.copy024")}</span>
                <Input
                  value={schemaProfile}
                  onChange={(event) => setSchemaProfile(event.target.value)}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium">{t("pages.ai_assistant.copy119")}</span>
                <Select value={providerId} onValueChange={setProviderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Provider" />
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

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium">{t("pages.data_hub.copy025")}</span>
                <Select value={promptPresetId} onValueChange={setPromptPresetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Prompt preset" />
                  </SelectTrigger>
                  <SelectContent>
                    {localizedPromptPresets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="space-y-2 md:col-span-2">
                <span className="text-sm font-medium">{t("pages.data_hub.copy026")}</span>
                <Textarea
                  className="min-h-[120px]"
                  value={analysisPrompt}
                  onChange={(event) => setAnalysisPrompt(event.target.value)}
                />
              </label>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={handleCreate} disabled={loading || !name.trim()}>
                {loading ? t("pages.data_hub.copy027") : t("pages.data_hub.copy028")}
              </Button>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium transition hover:border-primary/50">
                <FileUp className="h-4 w-4" />
                {t("pages.data_hub.copy029")}
                <input
                  type="file"
                  accept=".csv,.xlsx,.docx,.pdf"
                  onChange={handleUpload}
                  hidden
                />
              </label>
            </div>
          </Card>

          <Card variant="gradient" className="border-border/60">
            <div className="mb-5 flex items-center gap-3">
              <FolderSearch className="h-5 w-5 text-accent" />
              <h3 className="text-lg font-bold">{text("接入前检查", "Before routing data onward")}</h3>
            </div>
            <div className="space-y-4 text-sm leading-6 text-muted-foreground">
              <p>{text("数据中心要先把信息做成可判断的资产，而不是把文件简单堆进系统。", "Data Hub should turn raw files into decision-ready assets, not just store uploads.")}</p>
              <p>{text("这轮结构借鉴成熟工作台的 list-detail 和 data-entry 模式：先定模式，再定目标，再定去向。", "The structure borrows list-detail and data-entry conventions: choose the mode, define the objective, then define the route.")}</p>
            </div>

            <div className="mt-5 rounded-2xl border border-border/60 bg-background/40 p-4">
              <div className="text-sm font-semibold">{t("pages.data_hub.copy030")}</div>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedPreset?.objective ?? t("pages.data_hub.copy031")}
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {[
                text("结构化库优先走持续分析和治理。", "Structured sources should support repeatable analysis and governance."),
                text("文档类源优先走 AI 摘要与正式报告。", "Document-like sources should usually go to AI summarization and reporting."),
                text("YOLO 标注集优先走训练与版本沉淀。", "YOLO-style datasets should usually route to training and model versioning."),
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-border/60 bg-background/35 px-4 py-3 text-sm text-muted-foreground"
                >
                  {item}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </TaskSection>

      <TaskSection
        className="mt-10"
        eyebrow={text("治理看板", "Governance board")}
        title={text(
          "先看哪些源值得推进，哪些源必须先回治理",
          "Separate assets worth advancing from assets that must return to governance",
        )}
        description={text(
          "这层编排让数据中心更像企业资产工作台，而不是单纯的上传页。",
          "This makes Data Hub feel like an enterprise asset workbench instead of a one-off upload page.",
        )}
      >
        <div className="grid gap-4 xl:grid-cols-4">
          {intakeChecklist.map((item) => (
            <Card key={item.title} variant="glass" className="border-border/60">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-2xl border border-border/60 bg-background/70 p-2.5 text-primary">
                  {item.icon}
                </div>
                <Badge variant={item.tone}>{item.value}</Badge>
              </div>
              <h3 className="text-base font-bold">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.detail}</p>
            </Card>
          ))}
        </div>
      </TaskSection>

      <TaskSection
        className="mt-10"
        eyebrow={text("源目录", "Source catalog")}
        title={text(
          "把数据源做成可筛选、可联动、可立刻进入下一步的资产目录",
          "Turn sources into a filterable asset catalog with immediate next-step routing",
        )}
        description={text(
          "这里直接借鉴成熟后台的搜索栏加目录明细模式：左边快速筛，右边深读和派发。",
          "This intentionally borrows the search-toolbar plus list-detail pattern used by mature operational consoles.",
        )}
      >
        <WorkbenchFilterBar
          eyebrow={text("目录筛选", "Catalog filters")}
          title={text("先缩小范围，再进入细节", "Reduce the set before diving into detail")}
          description={text(
            "运营和工程团队应该先按风险、质量和去向聚焦，再打开单个资产详情。",
            "Operations and engineering teams should focus by risk, quality, and route before opening full source detail.",
          )}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          searchPlaceholder={text("搜索数据源名称、schema、字段或问题建议", "Search name, schema, fields, or suggested questions")}
          summary={text(
            `当前显示 ${filteredItems.length} / ${items.length} 个数据源`,
            `${filteredItems.length} of ${items.length} sources visible`,
          )}
          filters={[
            {
              id: "all",
              label: text("全部", "All"),
              count: items.length,
              active: catalogFilter === "all",
              onClick: () => setCatalogFilter("all"),
            },
            {
              id: "attention",
              label: text("先治理", "Needs governance"),
              count: items.filter(needsAttention).length,
              active: catalogFilter === "attention",
              onClick: () => setCatalogFilter("attention"),
            },
            {
              id: "ready",
              label: text("可进 AI", "AI-ready"),
              count: items.filter(isAnalysisReady).length,
              active: catalogFilter === "ready",
              onClick: () => setCatalogFilter("ready"),
            },
            {
              id: "train",
              label: text("训练候选", "Training"),
              count: items.filter(isTrainingReady).length,
              active: catalogFilter === "train",
              onClick: () => setCatalogFilter("train"),
            },
            {
              id: "documents",
              label: text("文档资产", "Documents"),
              count: items.filter(isDocumentSource).length,
              active: catalogFilter === "documents",
              onClick: () => setCatalogFilter("documents"),
            },
          ]}
          secondaryAction={
            <div className="flex flex-wrap gap-3">
              <Select
                value={qualityFilter}
                onValueChange={(value) => setQualityFilter(value as QualityFilter)}
              >
                <SelectTrigger className="h-11 min-w-[150px] rounded-2xl bg-background/55">
                  <SelectValue placeholder={text("质量等级", "Quality")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{text("全部质量", "All quality")}</SelectItem>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(value) => setStatusFilter(value as StatusFilter)}
              >
                <SelectTrigger className="h-11 min-w-[170px] rounded-2xl bg-background/55">
                  <SelectValue placeholder={text("状态", "Status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{text("全部状态", "All statuses")}</SelectItem>
                  <SelectItem value="ready">{text("Ready", "Ready")}</SelectItem>
                  <SelectItem value="profiled">{text("Profiled", "Profiled")}</SelectItem>
                  <SelectItem value="draft">{text("待补画像", "Needs profiling")}</SelectItem>
                  <SelectItem value="watch">{text("重点关注", "Needs attention")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
          action={
            <Button
              variant="outline"
              onClick={() => {
                setCatalogFilter("all");
                setQualityFilter("all");
                setStatusFilter("all");
                setSearchValue("");
              }}
            >
              {text("重置筛选", "Reset filters")}
            </Button>
          }
        />

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <Card variant="glass" className="border-border/60 p-0">
            {filteredItems.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{text("数据源", "Source")}</TableHead>
                    <TableHead>{text("状态", "Status")}</TableHead>
                    <TableHead>{text("质量", "Quality")}</TableHead>
                    <TableHead>{text("记录数", "Rows")}</TableHead>
                    <TableHead>{text("建议去向", "Suggested route")}</TableHead>
                    <TableHead className="text-right">{text("更新时间", "Updated")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow
                      key={item.id}
                      className={cn(
                        "cursor-pointer",
                        item.id === selectedSourceId && "bg-primary/5",
                      )}
                      onClick={() => setSelectedSourceId(item.id)}
                    >
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-semibold">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.type.toUpperCase()} / {item.schemaProfile}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(item)}>{item.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getQualityVariant(item)}>
                          {t("pages.data_hub.copy035")} {item.qualityScore}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.rowCount}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getPrimaryRoute(item) === "train"
                            ? text("训练", "Training")
                            : getPrimaryRoute(item) === "repair"
                              ? text("先治理", "Govern first")
                              : text("分析", "Analysis")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {new Date(item.updatedAt).toLocaleDateString(
                          t("pages.data_hub.copy038"),
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-6">
                <EmptyStateCard
                  icon={<Database className="h-6 w-6" />}
                  title={text("当前筛选下没有数据源", "No sources match the current filters")}
                  description={text(
                    "放宽筛选条件，或者先接入新的数据源。",
                    "Relax the filters or register a new source first.",
                  )}
                />
              </div>
            )}
          </Card>

          <Card variant="gradient" className="border-border/60">
            {selectedSource ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      {text("源详情", "Source detail")}
                    </p>
                    <h3 className="mt-2 text-2xl font-black tracking-tight">
                      {selectedSource.name}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {selectedSource.type.toUpperCase()} / {selectedSource.schemaProfile}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getStatusVariant(selectedSource)}>
                      {selectedSource.status}
                    </Badge>
                    <Badge variant={getQualityVariant(selectedSource)}>
                      {selectedSource.qualityScore}
                    </Badge>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
                    <div className="text-muted-foreground">{text("记录数", "Rows")}</div>
                    <div className="mt-1 font-semibold">{selectedSource.rowCount}</div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
                    <div className="text-muted-foreground">{text("建议去向", "Route")}</div>
                    <div className="mt-1 font-semibold">
                      {getPrimaryRoute(selectedSource) === "train"
                        ? text("训练链路", "Training lane")
                        : getPrimaryRoute(selectedSource) === "repair"
                          ? text("先治理", "Govern first")
                          : text("AI / 报告", "AI / Reports")}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/40 p-3">
                    <div className="text-muted-foreground">{text("最后更新", "Updated")}</div>
                    <div className="mt-1 font-semibold">
                      {new Date(selectedSource.updatedAt).toLocaleDateString(
                        t("pages.data_hub.copy038"),
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl border border-border/60 bg-background/40 p-4">
                  <div className="text-sm font-semibold">{text("分析摘要", "Analysis summary")}</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {selectedSource.connectionMeta.analysisSummary ??
                      t("pages.data_hub.copy041")}
                  </p>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <div className="mb-2 text-sm font-semibold">
                      {text("字段与结构", "Fields and structure")}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(selectedSourceFields.length
                        ? selectedSourceFields
                        : Object.keys(selectedSource.previewRows[0] ?? {})
                      ).map((field) => (
                        <Badge key={field} variant="secondary">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-semibold">
                      {text("质量提醒", "Quality findings")}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(selectedSourceFindings.length
                        ? selectedSourceFindings
                        : [t("pages.data_hub.copy049")]
                      ).map((finding) => (
                        <Badge key={finding} variant="outline">
                          {finding}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 text-sm font-semibold">
                      {text("推荐问题", "Suggested prompts")}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(selectedSourceQuestions.length
                        ? selectedSourceQuestions
                        : [t("pages.data_hub.copy051")]
                      ).map((question) => (
                        <Badge key={question} variant="outline">
                          {question}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    size="sm"
                    onClick={() => handleCreateSourceAnalysis(selectedSource)}
                    disabled={loading || !providerId}
                  >
                    <BrainCircuit className="h-4 w-4" />
                    {t("pages.data_hub.copy040")}
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/ai-assistant?${buildQuery({
                        sourceId: selectedSource.id,
                        preset: promptPresetId,
                        template:
                          selectedPreset?.recommendedTemplate ??
                          "quality-variance",
                        prompt: analysisPrompt,
                      })}`}
                    >
                      {t("pages.data_hub.copy039")}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/reports?${buildQuery({
                        sourceId: selectedSource.id,
                        preset: promptPresetId,
                        template:
                          selectedPreset?.recommendedTemplate ??
                          "quality-variance",
                        prompt: analysisPrompt,
                      })}`}
                    >
                      {t("pages.data_hub.copy044")}
                    </Link>
                  </Button>
                  {isTrainingReady(selectedSource) ? (
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={`/training?${buildQuery({
                          sourceId: selectedSource.id,
                          preset: "yolov10-balanced",
                          baseModel: "yolov10n.pt",
                          device: "auto",
                        })}`}
                      >
                        {t("pages.data_hub.copy045")}
                      </Link>
                    </Button>
                  ) : null}
                </div>

                <div className="mt-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    {text("样例记录", "Preview rows")}
                  </div>
                  <div className="space-y-2">
                    {selectedSource.previewRows.length ? (
                      selectedSource.previewRows.slice(0, 3).map((row, index) => (
                        <div
                          key={`${selectedSource.id}-${index}`}
                          className="rounded-2xl border border-border/60 bg-background/40 p-3 text-sm"
                        >
                          {Object.entries(row).map(([key, value]) => (
                            <div key={key}>
                              <strong>{key}:</strong> {value}
                            </div>
                          ))}
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                        <FileWarning className="mb-2 h-5 w-5" />
                        {t("pages.data_hub.copy047")}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <EmptyStateCard
                icon={<Database className="h-6 w-6" />}
                title={text("还没有数据源", "No data sources yet")}
                description={text(
                  "先创建结构化连接或上传文件，数据中心才会开始承接后续流程。",
                  "Create a source or upload a file to start the downstream workflow.",
                )}
              />
            )}
          </Card>
        </div>
      </TaskSection>
    </div>
  );
}
