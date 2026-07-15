"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Download,
  Eye,
  FileSpreadsheet,
  History,
  LayoutTemplate,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Upload,
} from "lucide-react";
import BackButton from "../../components/Layout/BackButton";
import Card from "../../components/Layout/Card";
import EmptyStateCard from "../../components/Layout/EmptyStateCard";
import TaskSection from "../../components/Layout/TaskSection";
import WorkflowHero from "../../components/Layout/WorkflowHero";
import WorkflowSteps, {
  type WorkflowStep,
} from "../../components/Layout/WorkflowSteps";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import ExportButton from "@/app/components/Controls/ExportButton";
import {
  buildExportFilename,
  exportToCsv,
  exportToXlsx,
} from "@/app/utils/export";
import { clearAuthSession } from "@/lib/auth-session";
import {
  PlatformAuthError,
  requestPlatformBlob,
  requestPlatformJson,
} from "@/lib/dashboard-client";
import type {
  ImportBatch,
  ImportBatchStatus,
  ImportHistoryResponse,
} from "@/types/imports";
import { useLocale } from "../../components/Locale/LocaleProvider";
import { useAdminGuard } from "../hooks/useAdminGuard";

type CanonicalImportStatus = "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED";
type ToastState = { tone: "success" | "error"; message: string } | null;
type EditState = {
  id: string;
  filename: string;
  status: CanonicalImportStatus;
  note: string;
  errorDetails: string;
} | null;

const statusMap: Record<string, CanonicalImportStatus> = {
  SUCCESS: "SUCCESS",
  PARTIAL_SUCCESS: "PARTIAL_SUCCESS",
  FAILED: "FAILED",
  成功: "SUCCESS",
  部分成功: "PARTIAL_SUCCESS",
  失败: "FAILED",
};

const backendStatusMap: Record<CanonicalImportStatus, string> = {
  SUCCESS: "成功",
  PARTIAL_SUCCESS: "部分成功",
  FAILED: "失败",
};

const IMPORT_TEMPLATE_ROWS = {
  wheel_hub: {
    header: [
      "asset_id",
      "inspection_type",
      "diameter_mm",
      "runout_mm",
      "defect_score",
      "result",
      "capture_time",
    ],
    rows: [
      [
        "WH-2026-0001",
        "wheel_hub",
        650.2,
        0.18,
        0.17,
        "PASS",
        "2026-04-16T08:20:00Z",
      ],
      [
        "WH-2026-0002",
        "wheel_hub",
        649.8,
        0.31,
        0.82,
        "FAIL",
        "2026-04-16T08:23:00Z",
      ],
    ],
  },
  bridge_cable: {
    header: [
      "asset_id",
      "inspection_type",
      "segment",
      "corrosion_ratio",
      "wire_break_count",
      "tension_loss_ratio",
      "result",
      "capture_time",
    ],
    rows: [
      [
        "BC-S7-01",
        "bridge_cable",
        "S7-01",
        0.08,
        1,
        0.06,
        "WATCH",
        "2026-04-16T09:10:00Z",
      ],
      [
        "BC-S7-02",
        "bridge_cable",
        "S7-02",
        0.32,
        7,
        0.27,
        "FAIL",
        "2026-04-16T09:12:00Z",
      ],
    ],
  },
};

function toCanonicalStatus(status: ImportBatchStatus): CanonicalImportStatus {
  return statusMap[status] ?? "SUCCESS";
}

function toBackendStatus(status: CanonicalImportStatus) {
  return backendStatusMap[status] ?? "成功";
}

function formatBytes(size: number) {
  if (!size) {
    return "0 KB";
  }
  return `${(size / 1024).toFixed(1)} KB`;
}

export default function DataImportPage() {
  const router = useRouter();
  const ready = useAdminGuard();
  const { text, t } = useLocale();
  const [filename, setFilename] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [status, setStatus] = useState<CanonicalImportStatus>("SUCCESS");
  const [importer, setImporter] = useState("Admin");
  const [note, setNote] = useState("");
  const [errorDetails, setErrorDetails] = useState("");
  const [history, setHistory] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>(null);
  const [deleteState, setDeleteState] = useState<ImportBatch | null>(null);

  const showToast = useCallback(
    (message: string, tone: "success" | "error" = "success") =>
      setToast({ message, tone }),
    [],
  );

  const localizeStatus = useCallback(
    (value: CanonicalImportStatus) =>
      ({
        SUCCESS: t("pages.admin.data_import.copy001", undefined, "成功"),
        PARTIAL_SUCCESS: t(
          "pages.admin.data_import.copy002",
          undefined,
          "部分成功",
        ),
        FAILED: t("pages.admin.data_import.copy003", undefined, "失败"),
      })[value],
    [t],
  );

  const handleAuthError = useCallback(() => {
    clearAuthSession();
    router.replace("/login");
  }, [router]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await requestPlatformJson<ImportHistoryResponse>(
        "/admin/imports?page=1&pageSize=12",
        "/api/imports?page=1&pageSize=12",
      );
      setHistory(
        data.items
          .map((item) => ({
            ...item,
            status: toCanonicalStatus(item.status),
          }))
          .sort((left, right) => right.importedAt.localeCompare(left.importedAt)),
      );
    } catch (error) {
      if (error instanceof PlatformAuthError) {
        handleAuthError();
        return;
      }
      console.error(error);
      showToast(
        t("pages.admin.data_import.copy004", undefined, "导入历史加载失败"),
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [handleAuthError, showToast, t]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    setImporter(window.localStorage.getItem("admin_user") || "Admin");
    loadHistory();
  }, [loadHistory, ready]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const previewReady = useMemo(() => rows.length > 0, [rows.length]);
  const successCount = useMemo(
    () =>
      history.filter((item) => toCanonicalStatus(item.status) === "SUCCESS")
        .length,
    [history],
  );
  const issueCount = useMemo(
    () =>
      history.filter((item) => toCanonicalStatus(item.status) !== "SUCCESS")
        .length,
    [history],
  );
  const latestImport = history[0];

  const workflowSteps = useMemo<WorkflowStep[]>(() => {
    const hasHistory = history.length > 0;
    return [
      {
        id: "upload",
        title: t("pages.admin.data_import.copy005", undefined, "上传文件"),
        detail: filename
          ? t("pages.admin.data_import.copy006", { p1: filename }, `已选择 ${filename}`)
          : t("pages.admin.data_import.copy007", undefined, "上传 CSV 模板文件"),
        state: filename ? "done" : "active",
      },
      {
        id: "validate",
        title: t("pages.admin.data_import.copy008", undefined, "预检字段"),
        detail: previewReady
          ? t(
              "pages.admin.data_import.copy009",
              { p1: rows.length },
              `已预览 ${rows.length} 条记录`,
            )
          : t("pages.admin.data_import.copy010", undefined, "等待字段解析"),
        state: previewReady ? "done" : filename ? "active" : "upcoming",
      },
      {
        id: "submit",
        title: t("pages.admin.data_import.copy011", undefined, "提交导入"),
        detail: submitting
          ? t("pages.admin.data_import.copy012", undefined, "正在写入平台")
          : t("pages.admin.data_import.copy013", undefined, "确认状态后提交"),
        state: submitting ? "active" : previewReady ? "active" : "upcoming",
      },
      {
        id: "history",
        title: t("pages.admin.data_import.copy014", undefined, "追踪历史"),
        detail: hasHistory
          ? t(
              "pages.admin.data_import.copy015",
              { p1: history.length },
              `最近 ${history.length} 条历史记录`,
            )
          : t("pages.admin.data_import.copy016", undefined, "等待导入历史"),
        state: hasHistory ? "done" : "upcoming",
      },
    ];
  }, [filename, history.length, previewReady, rows.length, submitting, t]);

  const validationChecklist = useMemo(
    () => [
      {
        label: text("文件已选择", "File selected"),
        ok: Boolean(filename),
        detail: filename || text("尚未选择文件", "No file selected"),
      },
      {
        label: text("字段已识别", "Columns parsed"),
        ok: headers.length > 0,
        detail:
          headers.length > 0
            ? `${headers.length} ${text("列", "columns")}`
            : text("等待解析", "Waiting"),
      },
      {
        label: text("记录可预览", "Rows previewed"),
        ok: previewReady,
        detail:
          rows.length > 0
            ? `${rows.length} ${text("行", "rows")}`
            : text("暂无预览", "No preview"),
      },
      {
        label: text("导入状态", "Import status"),
        ok: status === "SUCCESS",
        detail: localizeStatus(status),
      },
    ],
    [filename, headers.length, localizeStatus, previewReady, rows.length, status, text],
  );

  const handleFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) {
      return;
    }
    setFilename(file.name);
    setFileSize(file.size);

    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: (result: Papa.ParseResult<string[]>) => {
        const parsed = (result.data as string[][]).map((line) =>
          line.map((cell) => String(cell ?? "").trim()),
        );
        setHeaders(parsed[0] ?? []);
        setRows(parsed.slice(1, 41));
      },
      error: () => {
        showToast(
          t("pages.admin.data_import.copy017", undefined, "文件解析失败"),
          "error",
        );
      },
    });
  };

  const resetForm = () => {
    setFilename("");
    setFileSize(0);
    setHeaders([]);
    setRows([]);
    setStatus("SUCCESS");
    setNote("");
    setErrorDetails("");
  };

  const handleImport = async () => {
    if (!previewReady || submitting) {
      return;
    }

    setSubmitting(true);
    const importedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
    const batch: ImportBatch = {
      id: `IMP-${Date.now()}`,
      filename: filename || "unnamed.csv",
      size: fileSize,
      rows: rows.length,
      durationMs: 800 + rows.length * 16,
      status,
      importedAt,
      importedBy: importer || "Admin",
      note: note || undefined,
      errorDetails:
        status === "SUCCESS"
          ? undefined
          : errorDetails || "Import finished with issues. Check logs.",
      log: [
        `[${importedAt}] ${importer} submitted ${filename || "unnamed.csv"}`,
        `[${importedAt}] status=${status}`,
      ].join("\n"),
    };

    try {
      await requestPlatformJson<ImportBatch>("/admin/imports", "/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...batch,
          status: toBackendStatus(status),
        }),
      });
      resetForm();
      await loadHistory();
      showToast(
        t("pages.admin.data_import.copy018", undefined, "导入批次已提交"),
      );
    } catch (error) {
      if (error instanceof PlatformAuthError) {
        handleAuthError();
        return;
      }
      console.error(error);
      showToast(
        t("pages.admin.data_import.copy019", undefined, "导入提交失败"),
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadLog = async (item: ImportBatch) => {
    try {
      const blob = await requestPlatformBlob(
        `/admin/imports/${item.id}/log`,
        `/api/imports/${item.id}/log`,
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${item.id}.log`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      showToast(t("pages.admin.data_import.copy020", undefined, "日志已下载"));
    } catch (error) {
      if (error instanceof PlatformAuthError) {
        handleAuthError();
        return;
      }
      console.error(error);
      showToast(
        t("pages.admin.data_import.copy021", undefined, "日志下载失败"),
        "error",
      );
    }
  };

  const saveEdit = async () => {
    if (!editState) {
      return;
    }
    try {
      await requestPlatformJson(
        `/admin/imports/${editState.id}`,
        `/api/imports/${editState.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: toBackendStatus(editState.status),
            note: editState.note || undefined,
            errorDetails:
              editState.status === "SUCCESS"
                ? undefined
                : editState.errorDetails || undefined,
          }),
        },
      );
      setEditState(null);
      await loadHistory();
      showToast(t("pages.admin.data_import.copy022", undefined, "记录已更新"));
    } catch (error) {
      if (error instanceof PlatformAuthError) {
        handleAuthError();
        return;
      }
      console.error(error);
      showToast(
        t("pages.admin.data_import.copy023", undefined, "更新失败"),
        "error",
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleteState) {
      return;
    }
    try {
      await requestPlatformJson(
        `/admin/imports/${deleteState.id}`,
        `/api/imports/${deleteState.id}`,
        { method: "DELETE" },
      );
      setDeleteState(null);
      await loadHistory();
      showToast(t("pages.admin.data_import.copy024", undefined, "记录已删除"));
    } catch (error) {
      if (error instanceof PlatformAuthError) {
        handleAuthError();
        return;
      }
      console.error(error);
      showToast(
        t("pages.admin.data_import.copy025", undefined, "删除失败"),
        "error",
      );
    }
  };

  const exportImportTemplate = async () => {
    const sheets = Object.entries(IMPORT_TEMPLATE_ROWS).map(([key, value]) => ({
      name: key,
      header: value.header,
      rows: value.rows,
    }));
    await exportToXlsx({
      filename: buildExportFilename("import_template", "xlsx"),
      sheets,
    });
    showToast(
      t("pages.admin.data_import.copy026", undefined, "模板已导出"),
    );
  };

  const exportHistoryWorkbook = async () => {
    await exportToXlsx({
      filename: buildExportFilename("import_history", "xlsx"),
      sheets: [
        {
          name: "history",
          header: [
            t("pages.admin.data_import.copy027", undefined, "批次编号"),
            t("pages.admin.data_import.copy028", undefined, "文件名"),
            t("pages.admin.alerts.copy017", undefined, "状态"),
            t("pages.admin.data_import.copy029", undefined, "导入人"),
            t("pages.admin.data_import.copy030", undefined, "导入时间"),
            t("pages.admin.data_import.copy031", undefined, "备注"),
          ],
          rows: history.map((item) => [
            item.id,
            item.filename,
            localizeStatus(toCanonicalStatus(item.status)),
            item.importedBy,
            item.importedAt,
            item.note ?? "",
          ]),
        },
      ],
    });
    showToast(text("历史台账已导出", "History workbook exported"));
  };

  if (!ready) {
    return null;
  }

  return (
    <div className="page-shell pb-10 pt-0">
      <BackButton fallbackHref="/admin" />

      <WorkflowHero
        eyebrow={text("Import Operations", "Import Operations")}
        title={t("pages.admin.data_import.copy032", undefined, "数据导入流程台")}
        description={text(
          "这个页面按照企业导入流程重新组织：模板先行、字段校验、提交入库、历史追踪四段连续推进，避免管理员在上传、预览和历史之间来回跳。",
          "A continuous flow for template, validation, submission, and history tracking."
        )}
        badgeVariant="info"
        stats={[
          {
            label: text("当前预览行数", "Preview rows"),
            value: String(rows.length),
            detail: text("最多展示前 40 行", "Showing the first 40 rows"),
            tone: rows.length ? "info" : "default",
            icon: <Eye className="h-5 w-5" />,
          },
          {
            label: text("历史批次", "History"),
            value: String(history.length),
            detail: text("当前加载的最近记录", "Recent batches loaded"),
            tone: history.length ? "default" : "warning",
            icon: <History className="h-5 w-5" />,
          },
          {
            label: text("成功批次", "Successful"),
            value: String(successCount),
            detail: text("最近成功入库次数", "Recent successful runs"),
            tone: "success",
            icon: <CheckCircle2 className="h-5 w-5" />,
          },
          {
            label: text("问题批次", "Issue batches"),
            value: String(issueCount),
            detail: text("需要复核或修订", "Need follow-up"),
            tone: issueCount ? "warning" : "default",
            icon: <ShieldAlert className="h-5 w-5" />,
          },
        ]}
        actions={
          <>
            <Button onClick={exportImportTemplate}>
              <LayoutTemplate className="h-4 w-4" />
              {t("pages.admin.data_import.copy040", undefined, "导出模板")}
            </Button>
            <Button variant="outline" onClick={loadHistory}>
              <RefreshCw className="h-4 w-4" />
              {text("刷新历史", "Refresh history")}
            </Button>
          </>
        }
        aside={
          <Card variant="glass" className="h-full border-border/70">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {text("治理规则", "Governance rules")}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  {text("先模板，再校验，再提交", "Template before submit")}
                </h2>
              </div>
              <div className="space-y-3">
                {[
                  text("先下载官方模板，避免字段命名偏差。", "Use official templates first."),
                  text("校验区确认字段与预览后再提交入库。", "Validate fields before import."),
                  text("有异常状态时必须补充备注和错误说明。", "Issue statuses should include notes."),
                ].map((rule, index) => (
                  <div
                    key={rule}
                    className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/55 p-4"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-black text-primary">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{rule}</p>
                  </div>
                ))}
              </div>
              {latestImport ? (
                <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
                  <strong className="block text-sm">
                    {text("最近一次导入", "Latest import")}
                  </strong>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {latestImport.filename} · {latestImport.importedAt}
                  </p>
                </div>
              ) : null}
            </div>
          </Card>
        }
      />

      <WorkflowSteps
        title={t("pages.admin.data_import.copy036", undefined, "导入路径")}
        subtitle={t(
          "pages.admin.data_import.copy037",
          undefined,
          "按固定步骤完成模板准备、字段校验、提交与追踪",
        )}
        steps={workflowSteps}
      />

      <TaskSection
        title={text("模板与导入规范", "Templates and rules")}
        description={text(
          "模板下载区不只是附件入口，也负责告诉使用者当前支持哪些业务对象和字段结构。",
          "Templates define supported business objects and expected field structures."
        )}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(IMPORT_TEMPLATE_ROWS).map(([name, value]) => (
              <Card key={name} variant="glass" className="border-border/70">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <strong className="block text-lg">{name}</strong>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {text("字段数", "Columns")} {value.header.length} ·{" "}
                      {text("示例行", "Example rows")} {value.rows.length}
                    </p>
                    <p className="mt-2 text-xs leading-6 text-muted-foreground">
                      {value.header.join(" / ")}
                    </p>
                  </div>
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                </div>
              </Card>
            ))}
          </div>

          <Card variant="glass" className="space-y-4 border-border/70">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {text("操作建议", "Operator guidance")}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                {text("导入前确认项", "Before you import")}
              </h2>
            </div>
            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>{text("1. 使用模板原始表头，不要重命名字段。", "1. Keep original headers.")}</p>
              <p>{text("2. 建议一次导入一个业务对象，便于问题追踪。", "2. Import one object type per batch.")}</p>
              <p>{text("3. 如果选择失败或部分成功状态，请填写备注。", "3. Add notes for issue statuses.")}</p>
            </div>
            <Button onClick={exportImportTemplate}>
              <Download className="h-4 w-4" />
              {t("pages.admin.data_import.copy040", undefined, "导出模板")}
            </Button>
          </Card>
        </div>
      </TaskSection>

      <TaskSection
        title={text("上传与校验", "Upload and validation")}
        description={text(
          "把导入动作和校验判断放在一屏完成，管理员可以先看校验结果，再决定是否真的提交。",
          "Preview and validation happen beside the upload controls before submission."
        )}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
          <Card id="import-create" variant="glass" className="space-y-5 border-border/70">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {text("上传区", "Upload zone")}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                {t("pages.admin.data_import.copy039", undefined, "创建导入批次")}
              </h2>
            </div>

            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-primary/35 bg-primary/5 px-6 py-10 text-center transition hover:border-primary/55 hover:bg-primary/10">
              <input
                hidden
                type="file"
                accept=".csv,text/csv,.txt"
                onChange={(event) => handleFile(event.target.files)}
              />
              <div className="rounded-2xl border border-primary/30 bg-background/70 p-3 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <strong className="text-lg">
                {t("pages.admin.data_import.copy042", undefined, "选择导入文件")}
              </strong>
              <span className="text-sm text-muted-foreground">
                {t(
                  "pages.admin.data_import.copy043",
                  undefined,
                  "支持 CSV 或文本格式，建议使用模板导出的原始表头。",
                )}
              </span>
              {filename ? (
                <Badge variant="info">
                  {filename} · {formatBytes(fileSize)}
                </Badge>
              ) : null}
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">
                  {t("pages.admin.data_import.copy029", undefined, "导入人")}
                </span>
                <input
                  className="w-full rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                  value={importer}
                  onChange={(event) => setImporter(event.target.value)}
                  placeholder={t("pages.admin.data_import.copy029", undefined, "导入人")}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">
                  {text("结果状态", "Import status")}
                </span>
                <select
                  className="w-full rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as CanonicalImportStatus)
                  }
                >
                  <option value="SUCCESS">{localizeStatus("SUCCESS")}</option>
                  <option value="PARTIAL_SUCCESS">
                    {localizeStatus("PARTIAL_SUCCESS")}
                  </option>
                  <option value="FAILED">{localizeStatus("FAILED")}</option>
                </select>
              </label>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">
                {t("pages.admin.data_import.copy044", undefined, "备注")}
              </span>
              <input
                className="w-full rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={t(
                  "pages.admin.data_import.copy044",
                  undefined,
                  "补充本次导入的业务背景或注意事项",
                )}
              />
            </label>

            {status !== "SUCCESS" ? (
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">
                  {t("pages.admin.data_import.copy045", undefined, "错误说明")}
                </span>
                <textarea
                  className="min-h-[110px] w-full rounded-2xl border border-warning/30 bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-warning"
                  value={errorDetails}
                  onChange={(event) => setErrorDetails(event.target.value)}
                  placeholder={t(
                    "pages.admin.data_import.copy045",
                    undefined,
                    "说明哪些记录失败、哪些字段需要复核",
                  )}
                />
              </label>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button
                disabled={!previewReady || submitting}
                onClick={handleImport}
              >
                {submitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {submitting
                  ? t("pages.admin.data_import.copy046", undefined, "提交中")
                  : t("pages.admin.data_import.copy047", undefined, "提交导入")}
              </Button>
              <Button variant="outline" onClick={resetForm}>
                {text("清空当前批次", "Clear current batch")}
              </Button>
            </div>
          </Card>

          <Card variant="glass" className="space-y-5 border-border/70">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {text("校验区", "Validation panel")}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                {text("提交前确认", "Checks before submit")}
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {validationChecklist.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-border/70 bg-background/55 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-sm">{item.label}</strong>
                    <Badge variant={item.ok ? "success" : "outline"}>
                      {item.ok ? text("通过", "Pass") : text("待处理", "Pending")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
              <strong className="block text-sm">
                {text("当前批次摘要", "Current batch summary")}
              </strong>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {text("文件", "File")}
                  </p>
                  <p className="mt-1 text-sm">{filename || "--"}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {text("大小", "Size")}
                  </p>
                  <p className="mt-1 text-sm">{formatBytes(fileSize)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {text("字段数", "Columns")}
                  </p>
                  <p className="mt-1 text-sm">{headers.length || 0}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {text("预览行数", "Preview rows")}
                  </p>
                  <p className="mt-1 text-sm">{rows.length || 0}</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </TaskSection>

      <TaskSection
        id="import-preview"
        title={t("pages.admin.data_import.copy048", undefined, "字段预览")}
        description={text(
          "预览区只展示关键前几行，帮助你确认列结构和样本值是否正确，而不是替代完整数据浏览。",
          "Preview focuses on schema and sample values, not full browsing."
        )}
        action={
          <ExportButton
            onClick={() =>
              exportToCsv({
                filename: buildExportFilename("import_preview"),
                header: headers,
                rows,
              })
            }
            disabled={!previewReady}
          />
        }
      >
        {previewReady ? (
          <Card variant="glass" className="border-border/70 p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border/70 bg-card/70">
                  <tr>
                    {headers.map((head) => (
                      <th key={head} className="px-4 py-3 font-semibold">
                        {head || "-"}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr
                      key={`${rowIndex}-${row.join("-")}`}
                      className="border-t border-border/50"
                    >
                      {headers.map((_, index) => (
                        <td key={`${rowIndex}-${index}`} className="px-4 py-3 text-muted-foreground">
                          {row[index] || "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <EmptyStateCard
            icon={<FileSpreadsheet className="h-6 w-6" />}
            title={t("pages.admin.data_import.copy049", undefined, "暂无预览数据")}
            description={text(
              "选择文件后，这里会展示解析出来的字段与前 40 行样本。",
              "Parsed headers and sample rows will appear here."
            )}
          />
        )}
      </TaskSection>

      <TaskSection
        id="import-history"
        title={t("pages.admin.data_import.copy050", undefined, "导入历史")}
        description={text(
          "历史区负责复盘和追责，所以每条记录都保留状态、操作者、备注和日志动作，而不是只保留一个文件名。",
          "History records support review, accountability, and log download."
        )}
        action={
          <div className="flex flex-wrap gap-2">
            <ExportButton
              onClick={() =>
                exportToCsv({
                  filename: buildExportFilename("import_history"),
                  header: [
                    t("pages.admin.data_import.copy027", undefined, "批次编号"),
                    t("pages.admin.data_import.copy028", undefined, "文件名"),
                    t("pages.admin.alerts.copy017", undefined, "状态"),
                    t("pages.admin.data_import.copy029", undefined, "导入人"),
                    t("pages.admin.data_import.copy030", undefined, "导入时间"),
                  ],
                  rows: history.map((item) => [
                    item.id,
                    item.filename,
                    localizeStatus(toCanonicalStatus(item.status)),
                    item.importedBy,
                    item.importedAt,
                  ]),
                })
              }
              disabled={!history.length}
            />
            <Button
              variant="outline"
              onClick={exportHistoryWorkbook}
              disabled={!history.length}
            >
              <Download className="h-4 w-4" />
              {t("pages.admin.data_import.copy051", undefined, "导出台账")}
            </Button>
          </div>
        }
      >
        {loading ? (
          <Card variant="glass" className="border-border/70 p-6">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              {t("pages.admin.data_import.copy052", undefined, "正在加载导入历史")}
            </div>
          </Card>
        ) : null}

        {!loading && !history.length ? (
          <EmptyStateCard
            icon={<History className="h-6 w-6" />}
            title={text("还没有导入历史", "No import history yet")}
            description={text(
              "完成第一笔导入后，这里会保留状态、日志和复核动作。",
              "Submitted batches will show status, logs, and review actions here."
            )}
          />
        ) : null}

        {!loading ? (
          <div className="space-y-4">
            {history.map((item) => {
              const normalizedStatus = toCanonicalStatus(item.status);
              return (
                <Card key={item.id} variant="glass" className="border-border/70">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-lg">{item.filename}</strong>
                        <Badge
                          variant={
                            normalizedStatus === "SUCCESS"
                              ? "success"
                              : normalizedStatus === "FAILED"
                                ? "destructive"
                                : "warning"
                          }
                        >
                          {localizeStatus(normalizedStatus)}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>{item.id}</span>
                        <span>{item.importedBy}</span>
                        <span>{item.importedAt}</span>
                        <span>{formatBytes(item.size)}</span>
                        <span>{item.rows} rows</span>
                      </div>
                      {expandedId === item.id ? (
                        <div className="rounded-2xl border border-border/70 bg-background/55 p-4 text-sm leading-6 text-muted-foreground">
                          <p>
                            {t("pages.admin.data_import.copy058", undefined, "备注")}：
                            {item.note || t("pages.admin.data_import.copy059", undefined, "无")}
                          </p>
                          <p className="mt-2">
                            {t("pages.admin.data_import.copy060", undefined, "错误详情")}：
                            {item.errorDetails ||
                              t("pages.admin.data_import.copy059", undefined, "无")}
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setExpandedId((prev) => (prev === item.id ? null : item.id))
                        }
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {expandedId === item.id
                          ? t("pages.admin.data_import.copy053", undefined, "收起详情")
                          : t("pages.admin.data_import.copy054", undefined, "查看详情")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEditState({
                            id: item.id,
                            filename: item.filename,
                            status: normalizedStatus,
                            note: item.note ?? "",
                            errorDetails: item.errorDetails ?? "",
                          })
                        }
                      >
                        {t("pages.admin.data_import.copy055", undefined, "编辑")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadLog(item)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {t("pages.admin.data_import.copy056", undefined, "下载日志")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDeleteState(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t("pages.admin.data_import.copy057", undefined, "删除")}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : null}
      </TaskSection>

      {editState ? (
        <Modal
          title={t("pages.admin.data_import.copy061", undefined, "编辑导入记录")}
          onClose={() => setEditState(null)}
          onConfirm={saveEdit}
          confirmLabel={t("pages.admin.data_import.copy062", undefined, "保存")}
          closeLabel={t("pages.admin.data_import.copy063", undefined, "关闭")}
          cancelLabel={t("pages.admin.data_import.copy064", undefined, "取消")}
        >
          <p className="mb-4 text-sm text-muted-foreground">{editState.filename}</p>
          <select
            className="mb-3 w-full rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-primary/40"
            value={editState.status}
            onChange={(event) =>
              setEditState((current) =>
                current
                  ? {
                      ...current,
                      status: event.target.value as CanonicalImportStatus,
                    }
                  : current,
              )
            }
          >
            <option value="SUCCESS">{localizeStatus("SUCCESS")}</option>
            <option value="PARTIAL_SUCCESS">
              {localizeStatus("PARTIAL_SUCCESS")}
            </option>
            <option value="FAILED">{localizeStatus("FAILED")}</option>
          </select>
          <textarea
            className="mb-3 min-h-[92px] w-full rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-primary/40"
            value={editState.note}
            onChange={(event) =>
              setEditState((current) =>
                current ? { ...current, note: event.target.value } : current,
              )
            }
            placeholder={t("pages.admin.data_import.copy031", undefined, "备注")}
          />
          {editState.status !== "SUCCESS" ? (
            <textarea
              className="min-h-[92px] w-full rounded-2xl border border-warning/30 bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-warning"
              value={editState.errorDetails}
              onChange={(event) =>
                setEditState((current) =>
                  current
                    ? { ...current, errorDetails: event.target.value }
                    : current,
                )
              }
              placeholder={t("pages.admin.data_import.copy045", undefined, "错误说明")}
            />
          ) : null}
        </Modal>
      ) : null}

      {deleteState ? (
        <Modal
          title={t("pages.admin.data_import.copy065", undefined, "删除导入记录")}
          onClose={() => setDeleteState(null)}
          onConfirm={confirmDelete}
          confirmLabel={t("pages.admin.data_import.copy057", undefined, "删除")}
          closeLabel={t("pages.admin.data_import.copy063", undefined, "关闭")}
          cancelLabel={t("pages.admin.data_import.copy064", undefined, "取消")}
          danger
        >
          <p className="text-sm leading-7 text-muted-foreground">
            {t("pages.admin.data_import.copy066", undefined, "将删除以下记录")}{" "}
            <span className="text-foreground">{deleteState.filename}</span> (
            {deleteState.id}).{" "}
            {t("pages.admin.data_import.copy067", undefined, "此操作不可撤销。")}
          </p>
        </Modal>
      ) : null}

      {toast ? (
        <div className={`floating-toast ${toast.tone}`}>{toast.message}</div>
      ) : null}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
  onConfirm,
  confirmLabel,
  closeLabel,
  cancelLabel,
  danger = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  closeLabel: string;
  cancelLabel: string;
  danger?: boolean;
}) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.currentTarget === event.target) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(3,9,18,0.72)] px-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-xl rounded-[28px] border border-border/70 bg-popover p-6 shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-border/70 px-3 py-1 text-sm text-muted-foreground"
          >
            {closeLabel}
          </button>
        </div>

        {children}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={danger ? "destructive" : "default"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
