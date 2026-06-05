"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/app/components/Layout/BackButton";
import Card from "@/app/components/Layout/Card";
import PageLoadFallback from "@/app/components/Layout/PageLoadFallback";
import { PlatformAuthError, requestPlatformJson } from "@/lib/dashboard-client";
import { clearAuthSession } from "@/lib/auth-session";
import type {
  ImportProgress,
  ImportRecord,
  ImportStatus,
} from "@/types/imports";
import { useAdminGuard } from "../hooks/useAdminGuard";
import { useLocale } from "@/app/components/Locale/LocaleProvider";
import { Pagination, TableSkeleton, EmptyState } from "@/app/components/ui/Pagination";

type ToastState = {
  message: string;
  type: "success" | "error";
};

const SAMPLE_HISTORY: ImportRecord[] = [
  {
    id: "IM-2025-0301-01",
    filename: "hub-batch-01.zip",
    timestamp: "2025-03-01 09:22:11",
    status: "COMPLETED",
    processedFiles: 120,
    failedFiles: 3,
  },
  {
    id: "IM-2025-0303-02",
    filename: "hub-batch-02.zip",
    timestamp: "2025-03-03 14:07:45",
    status: "FAILED",
    processedFiles: 0,
    failedFiles: 15,
  },
  {
    id: "IM-2025-0305-03",
    filename: "hub-batch-03.zip",
    timestamp: "2025-03-05 10:44:22",
    status: "COMPLETED",
    processedFiles: 98,
    failedFiles: 0,
  },
  {
    id: "IM-2025-0308-04",
    filename: "hub-batch-04.zip",
    timestamp: "2025-03-08 16:31:09",
    status: "COMPLETED",
    processedFiles: 210,
    failedFiles: 7,
  },
  {
    id: "IM-2025-0310-05",
    filename: "hub-batch-05.zip",
    timestamp: "2025-03-10 08:15:33",
    status: "PROCESSING",
    processedFiles: 45,
    failedFiles: 0,
  },
  {
    id: "IM-2025-0312-06",
    filename: "hub-batch-06.zip",
    timestamp: "2025-03-12 11:52:18",
    status: "COMPLETED",
    processedFiles: 175,
    failedFiles: 2,
  },
];

function ImportProgressModal({
  visible,
  progress,
  onClose,
  t,
}: {
  visible: boolean;
  progress: ImportProgress;
  onClose: () => void;
  t: ReturnType<typeof useLocale>["t"];
}) {
  if (!visible) return null;

  const total = (progress.processedFiles ?? 0) + (progress.failedFiles ?? 0);
  const percent = Math.min(
    100,
    Math.round((total / Math.max(1, progress.totalFiles ?? 0)) * 100),
  );

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="导入进度"
    >
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-kicker">{t("pages.admin.dataImport.copy034")}</div>
          <div className="modal-title">
            {progress.filename}{" "}
            <span className="modal-badge">{t(`pages.admin.dataImport.copy0${(progress.status === "PROCESSING" ? "32" : "33")}`)}</span>
          </div>
        </div>

        <div className="modal-body">
          <div className="progress-section">
            <div className="progress-bar">
              <div
                className="progress-bar-track"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="progress-stats">
              <span>{percent}%</span>
              <span>
                {progress.processedFiles} / {progress.totalFiles}
              </span>
            </div>
          </div>

          <div className="import-grid">
            <div className="import-card">
              <span className="import-label">{t("pages.admin.dataImport.copy028")}</span>
              <strong className="import-value">{progress.processedFiles}</strong>
            </div>
            <div className="import-card">
              <span className="import-label">{t("pages.admin.dataImport.copy029")}</span>
              <strong className="import-value">{progress.failedFiles}</strong>
            </div>
            <div className="import-card">
              <span className="import-label">{t("pages.admin.dataImport.copy009")}</span>
              <strong className="import-value">{progress.totalFiles}</strong>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="enterprise-secondary-button"
            onClick={onClose}
          >
            {t("pages.admin.dataImport.copy030")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DataImportPage() {
  const router = useRouter();
  const ready = useAdminGuard();
  const { t } = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState<ImportRecord[]>([]);
  const [currentImport, setCurrentImport] = useState<ImportProgress | null>(
    null,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [pollTimer, setPollTimer] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showModal, setShowModal] = useState(false);
  const toastTimerRef = useRef<number>();

  const showToast = useCallback((message: string, type: ToastState["type"]) => {
    setToast({ message, type });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const data = await requestPlatformJson<ImportRecord[]>(
        "/admin/imports/history",
        "",
      );
      setHistory(data);
    } catch (error) {
      if (error instanceof PlatformAuthError) {
        clearAuthSession();
        router.replace("/login");
        return;
      }
      console.error("load history failed", error);
      setHistory(SAMPLE_HISTORY);
      showToast(t("pages.admin.dataImport.copy011"), "error");
    }
  }, [router, showToast, t]);

  const pollImport = useCallback(
    async (taskId: string) => {
      if (pollTimer) {
        window.clearInterval(pollTimer);
      }
      const timer = window.setInterval(async () => {
        try {
          const progress = await requestPlatformJson<ImportProgress>(
            `/admin/imports/${taskId}`,
            "",
          );
          setCurrentImport(progress);
          if (progress.status !== "PROCESSING") {
            window.clearInterval(timer);
            setPollTimer(null);
            showToast(t("pages.admin.dataImport.copy035"), "success");
          }
        } catch {
          // polling errors are expected, keep polling
        }
      }, 1200);
      setPollTimer(timer);
    },
    [pollTimer, showToast, t],
  );

  useEffect(() => {
    if (!ready) return;
    loadHistory();
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      if (pollTimer) {
        window.clearInterval(pollTimer);
      }
    };
  }, [loadHistory, pollTimer, ready]);

  // Reset page when history changes
  useEffect(() => {
    setCurrentPage(1);
  }, [history.length]);

  const completedCount = useMemo(
    () => history.filter((item) => item.status === "COMPLETED").length,
    [history],
  );

  const totalProcessed = useMemo(
    () =>
      history
        .filter((item) => item.status === "COMPLETED")
        .reduce((sum, item) => sum + (item.processedFiles ?? 0), 0),
    [history],
  );

  // Paginated history
  const paginatedHistory = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return history.slice(start, start + pageSize);
  }, [history, currentPage, pageSize]);

  const totalPages = Math.ceil(history.length / pageSize);

  const handleUpload = useCallback(async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      showToast(t("pages.admin.dataImport.copy010"), "error");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const progress = await requestPlatformJson<ImportProgress>(
        "/admin/imports/upload",
        "",
        {
          method: "POST",
          body: formData,
        },
      );

      setCurrentImport(progress);
      setShowModal(true);

      if (progress.status === "PROCESSING" && progress.taskId) {
        pollImport(progress.taskId);
      } else {
        loadHistory();
      }
      showToast(t("pages.admin.dataImport.copy012"), "success");
    } catch (error) {
      if (error instanceof PlatformAuthError) {
        clearAuthSession();
        router.replace("/login");
        return;
      }
      console.error("import upload failed", error);
      showToast(t("pages.admin.dataImport.copy013"), "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }, [loadHistory, pollImport, router, showToast, t]);

  const handleRefreshHistory = useCallback(async () => {
    await loadHistory();
    showToast(t("pages.admin.dataImport.copy014"), "success");
  }, [loadHistory, showToast, t]);

  const handleViewProgress = useCallback((record: ImportRecord) => {
    setCurrentImport({
      taskId: record.id,
      filename: record.filename,
      status: record.status,
      processedFiles: record.processedFiles ?? 0,
      failedFiles: record.failedFiles ?? 0,
      totalFiles: (record.processedFiles ?? 0) + (record.failedFiles ?? 0),
      percentage: record.status === "COMPLETED" || record.status === "SUCCESS" ? 100 : 0,
      message: "",
    });
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
  }, []);

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/admin"
        title={t("pages.admin.dataImport.copy015")}
        description={t("pages.admin.dataImport.copy016")}
      />
    );
  }

  return (
    <div className="page-shell space-y-6 pb-10 pt-0">
      <BackButton fallbackHref="/admin" />
      <div className="enterprise-hero">
        <div>
          <span className="eyebrow">{t("pages.admin.dataImport.copy017")}</span>
          <h1>{t("pages.admin.dataImport.copy018")}</h1>
          <p>{t("pages.admin.dataImport.copy019")}</p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>{t("pages.admin.dataImport.copy020")}</span>
            <strong>{history.length}</strong>
          </div>
          <div>
            <span>{t("pages.admin.dataImport.copy021")}</span>
            <strong>{completedCount}</strong>
          </div>
          <div>
            <span>{t("pages.admin.dataImport.copy022")}</span>
            <strong>{totalProcessed}</strong>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <Card className="enterprise-main-card">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">
              {t("pages.admin.dataImport.copy023")}
            </span>
            <h2>{t("pages.admin.dataImport.copy024")}</h2>
          </div>
        </div>

        <div className="upload-area-wrapper">
          <div className="upload-zone">
            <div className="upload-zone-content">
              <div className="upload-icon" />
              <h3>{t("pages.admin.dataImport.copy025")}</h3>
              <p className="upload-description">
                {t("pages.admin.dataImport.copy026")}
              </p>
              <label className="enterprise-primary-button cursor-pointer">
                {uploading
                  ? t("pages.admin.dataImport.copy027")
                  : t("pages.admin.dataImport.copy001")}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,.csv,.json,.parquet"
                  disabled={uploading}
                  className="hidden-input"
                  onChange={handleUpload}
                />
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* History Section */}
      <Card className="enterprise-main-card">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">
              {t("pages.admin.dataImport.copy005")}
            </span>
            <h2>{t("pages.admin.dataImport.copy002")}</h2>
          </div>
          <button
            type="button"
            className="enterprise-secondary-button"
            onClick={handleRefreshHistory}
          >
            {t("pages.admin.dataImport.copy004")}
          </button>
        </div>

        {paginatedHistory.length === 0 ? (
          <EmptyState
            title={t("pages.admin.dataImport.copy015")}
            description={t("pages.admin.dataImport.copy036")}
            action={
              <button
                type="button"
                className="enterprise-primary-button"
                onClick={() => fileInputRef.current?.click()}
              >
                {t("pages.admin.dataImport.copy001")}
              </button>
            }
          />
        ) : (
          <div className="table-wrapper-responsive">
            <div className="overflow-auto rounded-2xl border border-[var(--ring-soft)] bg-[color-mix(in_srgb,var(--panel-bg)_94%,var(--surface-elevated)_6%)] shadow-[var(--shadow-xs)]">
              <table className="table-enhanced">
                <thead>
                  <tr>
                    <th>{t("pages.admin.dataImport.copy006")}</th>
                    <th>{t("pages.admin.dataImport.copy007")}</th>
                    <th>{t("pages.admin.dataImport.copy008")}</th>
                    <th>{t("pages.admin.dataImport.copy009")}</th>
                    <th>{t("pages.admin.dataImport.copy028")}</th>
                    <th>{t("pages.admin.dataImport.copy029")}</th>
                    <th className="text-right">
                      {t("pages.admin.dataImport.copy030")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistory.map((record) => (
                    <tr key={record.id}>
                      <td className="cell-mono">{record.id}</td>
                      <td className="font-medium">{record.filename}</td>
                      <td className="cell-muted">{record.timestamp}</td>
                      <td>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            record.status === "COMPLETED"
                              ? "bg-[color-mix(in_srgb,#2ecc71_14%,transparent)] text-[#2ecc71]"
                              : record.status === "PROCESSING"
                                ? "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]"
                                : "bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]"
                          }`}
                        >
                          {record.status === "COMPLETED"
                            ? t("pages.admin.dataImport.copy033")
                            : record.status === "PROCESSING"
                              ? t("pages.admin.dataImport.copy032")
                              : t("pages.admin.dataImport.copy031")}
                        </span>
                      </td>
                      <td className="font-medium">{record.processedFiles ?? 0}</td>
                      <td
                        className={`${(record.failedFiles ?? 0) > 0 ? "text-[var(--danger)] font-medium" : "cell-muted"}`}
                      >
                        {record.failedFiles ?? 0}
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="enterprise-secondary-button px-3 py-1 text-xs"
                            onClick={() => handleViewProgress(record)}
                          >
                            {t("pages.admin.dataImport.copy034")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {history.length > pageSize && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={history.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            pageSizeOptions={[5, 10, 20]}
          />
        )}
      </Card>

      {/* Progress Modal */}
      <ImportProgressModal
        visible={showModal}
        progress={
          currentImport ?? {
            taskId: "",
            filename: "",
            status: "PROCESSING",
            processedFiles: 0,
            failedFiles: 0,
            totalFiles: 0,
            percentage: 0,
            message: "",
          }
        }
        onClose={handleCloseModal}
        t={t}
      />

      {toast ? (
        <div
          className={`floating-toast ${toast.type === "success" ? "success" : "error"}`}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
