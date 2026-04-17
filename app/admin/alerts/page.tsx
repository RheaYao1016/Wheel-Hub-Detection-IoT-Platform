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
  const [levelFilter, setLevelFilter] = useState<"ALL" | CanonicalAlertLevel>(
    "ALL",
  );
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | CanonicalAlertStatus
  >("ALL");
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
    [text],
  );

  const localizeStatus = useCallback(
    (status: CanonicalAlertStatus) =>
      ({
        PENDING: t("pages.admin.alerts.copy004"),
        READ: t("pages.admin.alerts.copy005"),
        DISPATCHED: t("pages.admin.alerts.copy006"),
        IGNORED: t("pages.admin.alerts.copy007"),
      })[status],
    [text],
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
  }, [levelFilter, localizeLevel, router, showToast, statusFilter, text]);

  useEffect(() => {
    if (!ready) return;
    loadAlerts();
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [loadAlerts, ready]);

  const pendingCount = useMemo(
    () =>
      records.filter((item) => normalizeStatus(item.status) === "PENDING")
        .length,
    [records],
  );

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
        setRecords((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status } : item)),
        );
        showToast(t("pages.admin.alerts.copy010"), "error");
      }
    },
    [router, showToast, text],
  );

  const handleExport = useCallback(() => {
    if (!records.length) {
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
      rows: records.map((alert) => [
        alert.id,
        alert.timestamp,
        alert.station,
        localizeLevel(normalizeLevel(alert.level)),
        alert.description,
        localizeStatus(normalizeStatus(alert.status)),
      ]),
    });
    showToast(t("pages.admin.alerts.copy018"), "success");
  }, [localizeLevel, localizeStatus, records, showToast, text]);

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
            <strong>{records.length}</strong>
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
          <ExportButton onClick={handleExport} disabled={!records.length} />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
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
          <div className="loading-state">{t("pages.admin.alerts.copy029")}</div>
        ) : (
          <div className="overflow-auto rounded-2xl border border-[var(--ring-soft)] bg-[color-mix(in_srgb,var(--panel-bg)_94%,var(--surface-elevated)_6%)] shadow-[var(--shadow-xs)]">
            <table className="min-w-full border-collapse text-sm text-[var(--text-primary)]">
              <thead>
                <tr className="bg-[color-mix(in_srgb,var(--accent)_10%,var(--surface-elevated)_90%)] text-xs uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                  <th className="px-3 py-2 text-left">
                    {t("pages.admin.alerts.copy012")}
                  </th>
                  <th className="px-3 py-2 text-left">
                    {t("pages.admin.alerts.copy013")}
                  </th>
                  <th className="px-3 py-2 text-left">
                    {t("pages.admin.alerts.copy014")}
                  </th>
                  <th className="px-3 py-2 text-left">
                    {t("pages.admin.alerts.copy015")}
                  </th>
                  <th className="px-3 py-2 text-left">
                    {t("pages.admin.alerts.copy016")}
                  </th>
                  <th className="px-3 py-2 text-left">
                    {t("pages.admin.alerts.copy017")}
                  </th>
                  <th className="px-3 py-2 text-right">
                    {t("pages.admin.alerts.copy030")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((alert) => {
                  const level = normalizeLevel(alert.level);
                  const status = normalizeStatus(alert.status);
                  return (
                    <tr
                      key={alert.id}
                      className="border-b border-[var(--ring-soft)] bg-transparent transition-colors duration-200 hover:bg-[color-mix(in_srgb,var(--accent)_4%,var(--surface-elevated)_96%)]"
                    >
                      <td className="px-3 py-3 font-mono text-xs font-semibold text-[var(--text-primary)]">
                        {alert.id}
                      </td>
                      <td className="px-3 py-3 text-[var(--text-muted)]">
                        {alert.timestamp}
                      </td>
                      <td className="px-3 py-3 font-medium text-[var(--text-primary)]">
                        {alert.station}
                      </td>
                      <td className="px-3 py-3">
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
                      <td className="px-3 py-3 text-[var(--text-muted)]">
                        {alert.description}
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex rounded-full border border-[var(--ring-soft)] bg-[color-mix(in_srgb,var(--surface-elevated)_86%,transparent)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]">
                          {localizeStatus(status)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
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
            {!records.length ? (
              <div className="empty-state">
                <span>!</span>
                {t("pages.admin.alerts.copy034")}
              </div>
            ) : null}
          </div>
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
