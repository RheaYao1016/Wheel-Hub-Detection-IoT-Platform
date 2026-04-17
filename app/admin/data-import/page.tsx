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
import BackButton from "../../components/Layout/BackButton";
import Card from "../../components/Layout/Card";
import WorkflowSteps, {
  type WorkflowStep,
} from "../../components/Layout/WorkflowSteps";
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
import { useAdminGuard } from "../hooks/useAdminGuard";
import { useLocale } from "../../components/Locale/LocaleProvider";

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
        SUCCESS: t("pages.admin.data_import.copy001"),
        PARTIAL_SUCCESS: t("pages.admin.data_import.copy002"),
        FAILED: t("pages.admin.data_import.copy003"),
      })[value],
    [text],
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
        data.items.map((item) => ({
          ...item,
          status: toCanonicalStatus(item.status),
        })),
      );
    } catch (error) {
      if (error instanceof PlatformAuthError) {
        handleAuthError();
        return;
      }
      console.error(error);
      showToast(t("pages.admin.data_import.copy004"), "error");
    } finally {
      setLoading(false);
    }
  }, [handleAuthError, showToast, text]);

  useEffect(() => {
    if (!ready) return;
    setImporter(window.localStorage.getItem("admin_user") || "Admin");
    loadHistory();
  }, [loadHistory, ready]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const previewReady = useMemo(() => rows.length > 0, [rows]);

  const workflowSteps = useMemo<WorkflowStep[]>(() => {
    const hasHistory = history.length > 0;
    return [
      {
        id: "upload",
        title: t("pages.admin.data_import.copy005"),
        detail: filename
          ? t("pages.admin.data_import.copy006", { p1: filename })
          : t("pages.admin.data_import.copy007"),
        state: filename ? "done" : "active",
      },
      {
        id: "validate",
        title: t("pages.admin.data_import.copy008"),
        detail: previewReady
          ? t("pages.admin.data_import.copy009", { p1: rows.length })
          : t("pages.admin.data_import.copy010"),
        state: previewReady ? "done" : filename ? "active" : "upcoming",
      },
      {
        id: "submit",
        title: t("pages.admin.data_import.copy011"),
        detail: submitting
          ? t("pages.admin.data_import.copy012")
          : t("pages.admin.data_import.copy013"),
        state: submitting ? "active" : previewReady ? "active" : "upcoming",
      },
      {
        id: "history",
        title: t("pages.admin.data_import.copy014"),
        detail: hasHistory
          ? t("pages.admin.data_import.copy015", { p1: history.length })
          : t("pages.admin.data_import.copy016"),
        state: hasHistory ? "done" : "upcoming",
      },
    ];
  }, [filename, history.length, previewReady, rows.length, submitting, text]);

  const handleFile = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
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
        showToast(t("pages.admin.data_import.copy017"), "error");
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
    if (!previewReady || submitting) return;

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
      showToast(t("pages.admin.data_import.copy018"));
    } catch (error) {
      if (error instanceof PlatformAuthError) {
        handleAuthError();
        return;
      }
      console.error(error);
      showToast(t("pages.admin.data_import.copy019"), "error");
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
      showToast(t("pages.admin.data_import.copy020"));
    } catch (error) {
      if (error instanceof PlatformAuthError) {
        handleAuthError();
        return;
      }
      console.error(error);
      showToast(t("pages.admin.data_import.copy021"), "error");
    }
  };

  const saveEdit = async () => {
    if (!editState) return;
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
      showToast(t("pages.admin.data_import.copy022"));
    } catch (error) {
      if (error instanceof PlatformAuthError) {
        handleAuthError();
        return;
      }
      console.error(error);
      showToast(t("pages.admin.data_import.copy023"), "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteState) return;
    try {
      await requestPlatformJson(
        `/admin/imports/${deleteState.id}`,
        `/api/imports/${deleteState.id}`,
        { method: "DELETE" },
      );
      setDeleteState(null);
      await loadHistory();
      showToast(t("pages.admin.data_import.copy024"));
    } catch (error) {
      if (error instanceof PlatformAuthError) {
        handleAuthError();
        return;
      }
      console.error(error);
      showToast(t("pages.admin.data_import.copy025"), "error");
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
    showToast(t("pages.admin.data_import.copy026"));
  };

  const exportHistoryWorkbook = async () => {
    await exportToXlsx({
      filename: buildExportFilename("import_history", "xlsx"),
      sheets: [
        {
          name: "history",
          header: [
            t("pages.admin.data_import.copy027"),
            t("pages.admin.data_import.copy028"),
            t("pages.admin.alerts.copy017"),
            t("pages.admin.data_import.copy029"),
            t("pages.admin.data_import.copy030"),
            t("pages.admin.data_import.copy031"),
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
  };

  if (!ready) {
    return null;
  }

  return (
    <div className="page-shell space-y-6 pb-10 pt-0">
      <BackButton fallbackHref="/admin" />

      <div className="enterprise-hero">
        <div>
          <span className="eyebrow">{t("pages.admin.alerts.copy021")}</span>
          <h1>{t("pages.admin.data_import.copy032")}</h1>
          <p>{t("pages.admin.data_import.copy033")}</p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>{t("pages.admin.data_import.copy034")}</span>
            <strong>{rows.length}</strong>
          </div>
          <div>
            <span>{t("pages.admin.data_import.copy035")}</span>
            <strong>{history.length}</strong>
          </div>
        </div>
      </div>

      <WorkflowSteps
        title={t("pages.admin.data_import.copy036")}
        subtitle={t("pages.admin.data_import.copy037")}
        steps={workflowSteps}
      />

      <Card>
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">
              {t("pages.admin.data_import.copy038")}
            </span>
            <h2>{t("pages.admin.data_import.copy039")}</h2>
          </div>
          <button
            type="button"
            className="enterprise-secondary-button"
            onClick={exportImportTemplate}
          >
            {t("pages.admin.data_import.copy040")}
          </button>
        </div>
        <p className="panel-caption">{t("pages.admin.data_import.copy041")}</p>
      </Card>

      <Card id="import-create">
        <div className="grid gap-6 md:grid-cols-2">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-[rgba(91,189,247,0.45)] bg-[rgba(91,189,247,0.08)] px-6 py-8 text-center">
            <input
              hidden
              type="file"
              accept=".csv,text/csv,.txt"
              onChange={(event) => handleFile(event.target.files)}
            />
            <strong className="text-white">
              {t("pages.admin.data_import.copy042")}
            </strong>
            <span className="text-xs text-[var(--text-secondary)]">
              {t("pages.admin.data_import.copy043")}
            </span>
            {filename ? (
              <span className="text-xs text-[var(--accent)]">
                {filename} / {(fileSize / 1024).toFixed(1)} KB
              </span>
            ) : null}
          </label>

          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="rounded-2xl border border-[rgba(91,189,247,0.25)] bg-transparent px-4 py-3"
                value={importer}
                onChange={(event) => setImporter(event.target.value)}
                placeholder={t("pages.admin.data_import.copy029")}
              />
              <select
                className="rounded-2xl border border-[rgba(91,189,247,0.25)] bg-transparent px-4 py-3"
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
            </div>

            <input
              className="w-full rounded-2xl border border-[rgba(91,189,247,0.25)] bg-transparent px-4 py-3"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={t("pages.admin.data_import.copy044")}
            />

            {status !== "SUCCESS" ? (
              <textarea
                className="min-h-[92px] w-full rounded-2xl border border-[rgba(255,107,129,0.25)] bg-transparent px-4 py-3"
                value={errorDetails}
                onChange={(event) => setErrorDetails(event.target.value)}
                placeholder={t("pages.admin.data_import.copy045")}
              />
            ) : null}

            <button
              type="button"
              disabled={!previewReady || submitting}
              onClick={handleImport}
              className="enterprise-primary-button w-full justify-center"
            >
              {submitting
                ? t("pages.admin.data_import.copy046")
                : t("pages.admin.data_import.copy047")}
            </button>
          </div>
        </div>
      </Card>

      <Card id="import-preview">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">
            {t("pages.admin.data_import.copy048")}
          </h2>
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
        </div>

        {previewReady ? (
          <div className="overflow-x-auto rounded-2xl border border-[rgba(91,189,247,0.18)] bg-[#0a1b31]/85">
            <table className="min-w-full text-left text-sm text-[rgba(232,243,255,0.88)]">
              <thead className="bg-[rgba(91,189,247,0.12)]">
                <tr>
                  {headers.map((head) => (
                    <th key={head} className="px-4 py-3">
                      {head || "-"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr
                    key={`${rowIndex}-${row.join("-")}`}
                    className="border-t border-[rgba(91,189,247,0.12)]"
                  >
                    {headers.map((_, index) => (
                      <td key={`${rowIndex}-${index}`} className="px-4 py-3">
                        {row[index] || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <span>+</span>
            {t("pages.admin.data_import.copy049")}
          </div>
        )}
      </Card>

      <Card id="import-history">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">
            {t("pages.admin.data_import.copy050")}
          </h2>
          <div className="flex gap-2">
            <ExportButton
              onClick={() =>
                exportToCsv({
                  filename: buildExportFilename("import_history"),
                  header: [
                    t("pages.admin.data_import.copy027"),
                    t("pages.admin.data_import.copy028"),
                    t("pages.admin.alerts.copy017"),
                    t("pages.admin.data_import.copy029"),
                    t("pages.admin.data_import.copy030"),
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
            <button
              type="button"
              className="enterprise-secondary-button"
              onClick={exportHistoryWorkbook}
              disabled={!history.length}
            >
              {t("pages.admin.data_import.copy051")}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            {t("pages.admin.data_import.copy052")}
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-[rgba(91,189,247,0.15)] bg-[rgba(7,19,39,0.7)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <strong className="text-white">{item.filename}</strong>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      {item.id} / {item.importedBy} / {item.importedAt}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`status-pill ${
                        toCanonicalStatus(item.status) === "SUCCESS"
                          ? "status-success"
                          : toCanonicalStatus(item.status) === "FAILED"
                            ? "status-danger"
                            : "status-warning"
                      }`}
                    >
                      {localizeStatus(toCanonicalStatus(item.status))}
                    </span>
                    <button
                      type="button"
                      className="enterprise-secondary-button px-4 py-2 text-xs"
                      onClick={() =>
                        setExpandedId((prev) =>
                          prev === item.id ? null : item.id,
                        )
                      }
                    >
                      {expandedId === item.id
                        ? t("pages.admin.data_import.copy053")
                        : t("pages.admin.data_import.copy054")}
                    </button>
                    <button
                      type="button"
                      className="enterprise-secondary-button px-4 py-2 text-xs"
                      onClick={() =>
                        setEditState({
                          id: item.id,
                          filename: item.filename,
                          status: toCanonicalStatus(item.status),
                          note: item.note ?? "",
                          errorDetails: item.errorDetails ?? "",
                        })
                      }
                    >
                      {t("pages.admin.data_import.copy055")}
                    </button>
                    <button
                      type="button"
                      className="enterprise-secondary-button px-4 py-2 text-xs"
                      onClick={() => handleDownloadLog(item)}
                    >
                      {t("pages.admin.data_import.copy056")}
                    </button>
                    <button
                      type="button"
                      className="rounded-full border border-[rgba(255,107,129,0.35)] px-4 py-2 text-xs text-[#ff9aa2]"
                      onClick={() => setDeleteState(item)}
                    >
                      {t("pages.admin.data_import.copy057")}
                    </button>
                  </div>
                </div>

                {expandedId === item.id ? (
                  <div className="mt-4 rounded-2xl bg-[rgba(255,255,255,0.03)] p-4 text-sm text-[var(--text-secondary)]">
                    <p>
                      {t("pages.admin.data_import.copy058")}
                      {item.note || t("pages.admin.data_import.copy059")}
                    </p>
                    <p className="mt-2">
                      {t("pages.admin.data_import.copy060")}
                      {item.errorDetails ||
                        t("pages.admin.data_import.copy059")}
                    </p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>

      {editState ? (
        <Modal
          title={t("pages.admin.data_import.copy061")}
          onClose={() => setEditState(null)}
          onConfirm={saveEdit}
          confirmLabel={t("pages.admin.data_import.copy062")}
          closeLabel={t("pages.admin.data_import.copy063")}
          cancelLabel={t("pages.admin.data_import.copy064")}
        >
          <p className="mb-4 text-sm text-[var(--text-secondary)]">
            {editState.filename}
          </p>
          <select
            className="mb-3 w-full rounded-2xl border border-[rgba(91,189,247,0.25)] bg-transparent px-4 py-3"
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
            className="mb-3 min-h-[92px] w-full rounded-2xl border border-[rgba(91,189,247,0.25)] bg-transparent px-4 py-3"
            value={editState.note}
            onChange={(event) =>
              setEditState((current) =>
                current ? { ...current, note: event.target.value } : current,
              )
            }
            placeholder={t("pages.admin.data_import.copy031")}
          />
          {editState.status !== "SUCCESS" ? (
            <textarea
              className="min-h-[92px] w-full rounded-2xl border border-[rgba(255,107,129,0.25)] bg-transparent px-4 py-3"
              value={editState.errorDetails}
              onChange={(event) =>
                setEditState((current) =>
                  current
                    ? { ...current, errorDetails: event.target.value }
                    : current,
                )
              }
              placeholder={t("pages.admin.data_import.copy045")}
            />
          ) : null}
        </Modal>
      ) : null}

      {deleteState ? (
        <Modal
          title={t("pages.admin.data_import.copy065")}
          onClose={() => setDeleteState(null)}
          onConfirm={confirmDelete}
          confirmLabel={t("pages.admin.data_import.copy057")}
          closeLabel={t("pages.admin.data_import.copy063")}
          cancelLabel={t("pages.admin.data_import.copy064")}
          danger
        >
          <p className="text-sm leading-7 text-[var(--text-secondary)]">
            {t("pages.admin.data_import.copy066")}{" "}
            <span className="text-white">{deleteState.filename}</span> (
            {deleteState.id}). {t("pages.admin.data_import.copy067")}
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
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(3,9,18,0.72)] px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-[28px] border border-[rgba(91,189,247,0.18)] bg-[var(--panel-bg-strong)] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.45)]">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[rgba(91,189,247,0.22)] px-3 py-1 text-sm text-[var(--text-secondary)]"
          >
            {closeLabel}
          </button>
        </div>

        {children}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="enterprise-secondary-button px-5 py-2"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={
              danger
                ? "rounded-full bg-[linear-gradient(90deg,rgba(255,107,129,0.96),rgba(225,71,108,0.96))] px-5 py-2 text-sm font-semibold text-white"
                : "enterprise-primary-button px-5 py-2"
            }
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
