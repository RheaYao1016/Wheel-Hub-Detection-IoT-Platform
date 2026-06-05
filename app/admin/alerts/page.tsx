"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "../../components/Layout/BackButton";
import Card from "../../components/Layout/Card";
import PageLoadFallback from "../../components/Layout/PageLoadFallback";
import ExportButton from "@/app/components/Controls/ExportButton";
import { buildExportFilename, exportToCsv } from "@/app/utils/export";
import { PlatformAuthError, requestPlatformJson } from "@/lib/dashboard-client";
import { clearAuthSession } from "@/lib/auth-session";
import type { AlertLevel, AlertRecord, AlertStatus } from "@/types/alerts";
import { useAdminGuard } from "../hooks/useAdminGuard";
import { useLocale } from "@/app/components/Locale/LocaleProvider";
import { Pagination, TableSkeleton, EmptyState } from "@/app/components/ui/Pagination";

type ToastState = {
  message: string;
  type: "success" | "error";
};

type CanonicalAlertLevel = "HIGH" | "MEDIUM" | "LOW";
type CanonicalAlertStatus = "PENDING" | "READ" | "DISPATCHED" | "IGNORED";

const SAMPLE_ALERTS: AlertRecord[] = [
  {
    id: "AL-2025-0311-01",
    timestamp: "2025-03-11 08:42:11",
    station: "ST-01",
    level: "HIGH",
    description: "Radial runout reached 0.32mm, above the 0.25mm threshold.",
    status: "PENDING",
  },
  {
    id: "AL-2025-0311-02",
    timestamp: "2025-03-11 09:07:18",
    station: "ST-02",
    level: "MEDIUM",
    description: "Camera exposure drift detected. Verify illumination module.",
    status: "PENDING",
  },
  {
    id: "AL-2025-0311-03",
    timestamp: "2025-03-11 09:25:54",
    station: "ST-03",
    level: "LOW",
    description: "Buffer queue is close to threshold; cleanup is recommended.",
    status: "PENDING",
  },
  {
    id: "AL-2025-0311-04",
    timestamp: "2025-03-11 10:12:33",
    station: "ST-01",
    level: "HIGH",
    description: "Surface defect score exceeded 0.85 threshold on Line A.",
    status: "PENDING",
  },
  {
    id: "AL-2025-0311-05",
    timestamp: "2025-03-11 10:45:22",
    station: "ST-04",
    level: "MEDIUM",
    description: "Temperature anomaly detected in sensor array B.",
    status: "READ",
  },
  {
    id: "AL-2025-0311-06",
    timestamp: "2025-03-11 11:03:17",
    station: "ST-02",
    level: "LOW",
    description: "Network latency spike observed in data pipeline.",
    status: "DISPATCHED",
  },
];

const levelMap: Record<string, CanonicalAlertLevel> = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  高: "HIGH",
  中: "MEDIUM",
  低: "LOW",
};

const statusMap: Record<string, CanonicalAlertStatus> = {
  PENDING: "PENDING",
  READ: "READ",
  DISPATCHED: "DISPATCHED",
  IGNORED: "IGNORED",
  待处理: "PENDING",
  已读: "READ",
  已派发: "DISPATCHED",
  已忽略: "IGNORED",
};

const backendStatusMap: Record<CanonicalAlertStatus, string> = {
  PENDING: "待处理",
  READ: "已读",
  DISPATCHED: "已派发",
  IGNORED: "已忽略",
};

function normalizeLevel(value: AlertLevel): CanonicalAlertLevel {
  return levelMap[value] ?? "LOW";
}

function normalizeStatus(value: AlertStatus): CanonicalAlertStatus {
  return statusMap[value] ?? "PENDING";
}

export default function AlertsPage() {
  const router = useRouter();
  const ready = useAdminGuard();
  const { text, t } = useLocale();
  const [records, setRecords] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<"ALL" | CanonicalAlertLevel>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | CanonicalAlertStatus>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<number>();

  const showToast = useCallback((message: string, type: ToastState["type"]) => {
    setToast({ message, type });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const localizeLevel = useCallback(
    (level: CanonicalAlertLevel) =>
      ({
        HIGH: t("pages.admin.alerts.copy001"),
        MEDIUM: t("pages.admin.alerts.copy002"),
        LOW: t("pages.admin.alerts.copy003"),
      })[level],
    [t],
  );

  const localizeStatus = useCallback(
    (status: CanonicalAlertStatus) =>
      ({
        PENDING: t("pages.admin.alerts.copy004"),
        READ: t("pages.admin.alerts.copy005"),
        DISPATCHED: t("pages.admin.alerts.copy006"),
        IGNORED: t("pages.admin.alerts.copy007"),
      })[status],
    [t],
  );

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (levelFilter !== "ALL") {
        params.set("level", localizeLevel(levelFilter));
      }
      if (statusFilter !== "ALL") {
        params.set("status", backendStatusMap[statusFilter]);
      }
      const query = params.toString();

      const data = await requestPlatformJson<AlertRecord[]>(
        `/admin/alerts${query ? `?${query}` : ""}`,
        "",
      );
      setRecords(
        data.map((item) => ({
          ...item,
          level: normalizeLevel(item.level),
          status: normalizeStatus(item.status),
        })),
      );
    } catch (error) {
      if (error instanceof PlatformAuthError) {
        clearAuthSession();
        router.replace("/login");
        return;
      }
      console.error("load alerts failed", error);
      // Fallback to sample data with filters applied
      const fallback = SAMPLE_ALERTS.filter((item) => {
        const levelPass =
          levelFilter === "ALL" || normalizeLevel(item.level) === levelFilter;
        const statusPass =
          statusFilter === "ALL" ||
          normalizeStatus(item.status) === statusFilter;
        return levelPass && statusPass;
      });
      setRecords(fallback);
      showToast(t("pages.admin.alerts.copy008"), "error");
    } finally {
      setLoading(false);
    }
  }, [levelFilter, statusFilter, localizeLevel, router, showToast, t]);

  useEffect(() => {
    if (!ready) return;
    loadAlerts();
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [loadAlerts, ready]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [levelFilter, statusFilter, searchTerm]);

  const pendingCount = useMemo(
    () =>
      records.filter((item) => normalizeStatus(item.status) === "PENDING")
        .length,
    [records],
  );

  // Filter records based on search term
  const filteredRecords = useMemo(() => {
    if (!searchTerm.trim()) return records;
    const term = searchTerm.toLowerCase();
    return records.filter(
      (item) =>
        item.id.toLowerCase().includes(term) ||
        item.station.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.timestamp.toLowerCase().includes(term),
    );
  }, [records, searchTerm]);

  // Paginate filtered records
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize);

  const handleAction = useCallback(
    async (id: string, status: CanonicalAlertStatus) => {
      try {
        await requestPlatformJson<AlertRecord>(`/admin/alerts/${id}`, "", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: backendStatusMap[status] }),
        });
        setRecords((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status } : item)),
        );
        showToast(t("pages.admin.alerts.copy009"), "success");
      } catch (error) {
        if (error instanceof PlatformAuthError) {
          clearAuthSession();
          router.replace("/login");
          return;
        }
        console.error("alert update failed", error);
        // Still update local state for better UX
        setRecords((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status } : item)),
        );
        showToast(t("pages.admin.alerts.copy010"), "error");
      }
    },
    [router, showToast, t],
  );

  const handleExport = useCallback(() => {
    if (!filteredRecords.length) {
      showToast(t("pages.admin.alerts.copy011"), "error");
      return;
    }
    exportToCsv({
      filename: buildExportFilename("alerts"),
      header: [
        t("pages.admin.alerts.copy012"),
        t("pages.admin.alerts.copy013"),
        t("pages.admin.alerts.copy014"),
        t("pages.admin.alerts.copy015"),
        t("pages.admin.alerts.copy016"),
        t("pages.admin.alerts.copy017"),
      ],
      rows: filteredRecords.map((alert) => [
        alert.id,
        alert.timestamp,
        alert.station,
        localizeLevel(normalizeLevel(alert.level)),
        alert.description,
        localizeStatus(normalizeStatus(alert.status)),
      ]),
    });
    showToast(t("pages.admin.alerts.copy018"), "success");
  }, [localizeLevel, localizeStatus, filteredRecords, showToast, t]);

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/admin"
        title={t("pages.admin.alerts.copy019")}
        description={t("pages.admin.alerts.copy020")}
      />
    );
  }

  return (
    <div className="page-shell space-y-6 pb-10 pt-0">
      <BackButton fallbackHref="/admin" />
      <div className="enterprise-hero">
        <div>
          <span className="eyebrow">{t("pages.admin.alerts.copy021")}</span>
          <h1>{t("pages.admin.alerts.copy022")}</h1>
          <p>{t("pages.admin.alerts.copy023")}</p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>{t("pages.admin.alerts.copy024")}</span>
            <strong>{filteredRecords.length}</strong>
          </div>
          <div>
            <span>{t("pages.admin.alerts.copy004")}</span>
            <strong>{pendingCount}</strong>
          </div>
        </div>
      </div>

      <Card className="enterprise-main-card">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">
              {t("pages.admin.alerts.copy025")}
            </span>
            <h2>{t("pages.admin.alerts.copy026")}</h2>
          </div>
          <ExportButton onClick={handleExport} disabled={!filteredRecords.length} />
        </div>

        {/* Filters and Search */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="search-input-wrapper">
            <span className="search-input-icon">{"\u{1F50D}"}</span>
            <input
              type="text"
              className="search-input"
              placeholder={t("pages.admin.alerts.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={t("pages.admin.alerts.searchAria")}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            {t("pages.admin.alerts.copy015")}
            <select
              className="rounded-xl border border-[var(--ring-strong)] bg-[color-mix(in_srgb,var(--surface-elevated)_92%,transparent)] px-3 py-2 text-[var(--text-primary)] shadow-[var(--shadow-xs)] transition-colors duration-200 hover:border-[var(--accent)] focus:border-[var(--accent)] focus:outline-none"
              value={levelFilter}
              onChange={(event) =>
                setLevelFilter(
                  event.target.value as "ALL" | CanonicalAlertLevel,
                )
              }
            >
              <option value="ALL">{t("pages.admin.alerts.copy027")}</option>
              <option value="HIGH">{t("pages.admin.alerts.copy001")}</option>
              <option value="MEDIUM">{t("pages.admin.alerts.copy002")}</option>
              <option value="LOW">{t("pages.admin.alerts.copy003")}</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            {t("pages.admin.alerts.copy017")}
            <select
              className="rounded-xl border border-[var(--ring-strong)] bg-[color-mix(in_srgb,var(--surface-elevated)_92%,transparent)] px-3 py-2 text-[var(--text-primary)] shadow-[var(--shadow-xs)] transition-colors duration-200 hover:border-[var(--accent)] focus:border-[var(--accent)] focus:outline-none"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as "ALL" | CanonicalAlertStatus,
                )
              }
            >
              <option value="ALL">{t("pages.admin.alerts.copy027")}</option>
              <option value="PENDING">{t("pages.admin.alerts.copy004")}</option>
              <option value="READ">{t("pages.admin.alerts.copy005")}</option>
              <option value="DISPATCHED">
                {t("pages.admin.alerts.copy006")}
              </option>
              <option value="IGNORED">{t("pages.admin.alerts.copy007")}</option>
            </select>
          </label>
          <button
            type="button"
            onClick={loadAlerts}
            className="enterprise-secondary-button"
          >
            {t("pages.admin.alerts.copy028")}
          </button>
        </div>

        {loading ? (
          <TableSkeleton rows={5} columns={7} />
        ) : filteredRecords.length === 0 ? (
          <EmptyState
            title={t("pages.admin.alerts.copy034")}
            description={searchTerm ? t("pages.admin.alerts.tryAdjustSearch") : undefined}
            action={
              searchTerm || levelFilter !== "ALL" || statusFilter !== "ALL" ? (
                <button
                  type="button"
                  className="enterprise-secondary-button"
                  onClick={() => {
                    setSearchTerm("");
                    setLevelFilter("ALL");
                    setStatusFilter("ALL");
                  }}
                >
                  {t("pages.admin.alerts.clearFilter")}
                </button>
              ) : undefined
            }
          />
        ) : (
          <div className="table-wrapper-responsive">
            <div className="overflow-auto rounded-2xl border border-[var(--ring-soft)] bg-[color-mix(in_srgb,var(--panel-bg)_94%,var(--surface-elevated)_6%)] shadow-[var(--shadow-xs)]">
              <table className="table-enhanced">
                <thead>
                  <tr>
                    <th>{t("pages.admin.alerts.copy012")}</th>
                    <th>{t("pages.admin.alerts.copy013")}</th>
                    <th>{t("pages.admin.alerts.copy014")}</th>
                    <th>{t("pages.admin.alerts.copy015")}</th>
                    <th>{t("pages.admin.alerts.copy016")}</th>
                    <th>{t("pages.admin.alerts.copy017")}</th>
                    <th className="text-right">{t("pages.admin.alerts.copy030")}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRecords.map((alert) => {
                    const level = normalizeLevel(alert.level);
                    const status = normalizeStatus(alert.status);
                    return (
                      <tr
                        key={alert.id}
                      >
                        <td className="cell-mono">{alert.id}</td>
                        <td className="cell-muted">{alert.timestamp}</td>
                        <td className="font-medium">{alert.station}</td>
                        <td>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                              level === "HIGH"
                                ? "bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]"
                                : level === "MEDIUM"
                                  ? "bg-[color-mix(in_srgb,var(--warning)_18%,transparent)] text-[color:#b77900]"
                                  : "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-[var(--accent)]"
                            }`}
                          >
                            {localizeLevel(level)}
                          </span>
                        </td>
                        <td className="cell-muted max-w-xs truncate" title={alert.description}>
                          {alert.description}
                        </td>
                        <td>
                          <span className="inline-flex rounded-full border border-[var(--ring-soft)] bg-[color-mix(in_srgb,var(--surface-elevated)_86%,transparent)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                            {localizeStatus(status)}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              className="enterprise-secondary-button px-3 py-1 text-xs"
                              onClick={() => handleAction(alert.id, "READ")}
                            >
                              {t("pages.admin.alerts.copy031")}
                            </button>
                            <button
                              type="button"
                              className="enterprise-secondary-button px-3 py-1 text-xs"
                              onClick={() => handleAction(alert.id, "IGNORED")}
                            >
                              {t("pages.admin.alerts.copy032")}
                            </button>
                            <button
                              type="button"
                              className="enterprise-primary-button px-3 py-1 text-xs"
                              onClick={() => handleAction(alert.id, "DISPATCHED")}
                            >
                              {t("pages.admin.alerts.copy033")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredRecords.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredRecords.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        )}
      </Card>

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
