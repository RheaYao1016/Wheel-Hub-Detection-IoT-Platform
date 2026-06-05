"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "../../components/Layout/BackButton";
import Card from "../../components/Layout/Card";
import PageLoadFallback from "../../components/Layout/PageLoadFallback";
import { PlatformAuthError, requestPlatformJson } from "@/lib/dashboard-client";
import { clearAuthSession } from "@/lib/auth-session";
import type { DiskMetric } from "@/types/platform";
import { useAdminGuard } from "../hooks/useAdminGuard";
import { useLocale } from "@/app/components/Locale/LocaleProvider";
import { TableSkeleton, EmptyState } from "@/app/components/ui/Pagination";

type ToastState = {
  message: string;
  type: "success" | "error";
};

const SAMPLE_METRICS: DiskMetric[] = [
  {
    mount: "/data",
    total: 2000,
    used: 1200,
    free: 800,
    usage: 60,
    status: "healthy",
  },
  {
    mount: "/backups",
    total: 1000,
    used: 850,
    free: 150,
    usage: 85,
    status: "warning",
  },
  {
    mount: "/tmp",
    total: 500,
    used: 480,
    free: 20,
    usage: 96,
    status: "critical",
  },
  {
    mount: "/images",
    total: 3000,
    used: 900,
    free: 2100,
    usage: 30,
    status: "healthy",
  },
  {
    mount: "/logs",
    total: 1000,
    used: 400,
    free: 600,
    usage: 40,
    status: "healthy",
  },
];

export default function StoragePage() {
  const router = useRouter();
  const ready = useAdminGuard();
  const { t } = useLocale();
  const [metrics, setMetrics] = useState<DiskMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "healthy" | "warning" | "critical">("ALL");
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<number>();

  const showToast = useCallback((message: string, type: ToastState["type"]) => {
    setToast({ message, type });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await requestPlatformJson<DiskMetric[]>(
        "/admin/storage/disk",
        "",
      );
      setMetrics(data);
    } catch (error) {
      if (error instanceof PlatformAuthError) {
        clearAuthSession();
        router.replace("/login");
        return;
      }
      console.error("load disk metrics failed", error);
      setMetrics(SAMPLE_METRICS);
      showToast(t("pages.admin.storage.copy014"), "error");
    } finally {
      setLoading(false);
    }
  }, [router, showToast, t]);

  useEffect(() => {
    if (!ready) return;
    loadMetrics();
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [loadMetrics, ready]);

  const totalStorage = useMemo(
    () => metrics.reduce((sum, m) => sum + m.total, 0),
    [metrics],
  );

  const totalUsed = useMemo(
    () => metrics.reduce((sum, m) => sum + m.used, 0),
    [metrics],
  );

  // Filter and search metrics
  const filteredMetrics = useMemo(() => {
    return metrics.filter((m) => {
      const searchMatch = !searchTerm.trim() ||
        m.mount.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = statusFilter === "ALL" || m.status === statusFilter;
      return searchMatch && statusMatch;
    });
  }, [metrics, searchTerm, statusFilter]);

  const criticalCount = useMemo(
    () => metrics.filter((m) => m.status === "critical").length,
    [metrics],
  );

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/admin"
        title={t("pages.admin.storage.copy015")}
        description={t("pages.admin.storage.copy016")}
      />
    );
  }

  return (
    <div className="page-shell space-y-6 pb-10 pt-0">
      <BackButton fallbackHref="/admin" />
      <div className="enterprise-hero">
        <div>
          <span className="eyebrow">{t("pages.admin.storage.copy017")}</span>
          <h1>{t("pages.admin.storage.copy001")}</h1>
          <p>{t("pages.admin.storage.copy002")}</p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>{t("pages.admin.storage.copy018")}</span>
            <strong>{(totalStorage / 1024).toFixed(2)} TB</strong>
          </div>
          <div>
            <span>{t("pages.admin.storage.copy019")}</span>
            <strong>{(totalUsed / 1024).toFixed(2)} TB</strong>
          </div>
          <div>
            <span>{t("pages.admin.storage.copy020")}</span>
            <strong>{criticalCount}</strong>
          </div>
        </div>
      </div>

      <Card className="enterprise-main-card">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">{t("pages.admin.storage.copy021")}</span>
            <h2>{t("pages.admin.storage.copy003")}</h2>
          </div>
          <button
            type="button"
            className="enterprise-secondary-button"
            onClick={loadMetrics}
          >
            {t("pages.admin.storage.copy004")}
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="search-input-wrapper">
            <span className="search-input-icon">{"\u{1F50D}"}</span>
            <input
              type="text"
              className="search-input"
              placeholder={t("pages.admin.storage.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={t("pages.admin.storage.searchAria")}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            {t("pages.admin.storage.statusLabel")}
            <select
              className="rounded-xl border border-[var(--ring-strong)] bg-[color-mix(in_srgb,var(--surface-elevated)_92%,transparent)] px-3 py-2 text-[var(--text-primary)] shadow-[var(--shadow-xs)] transition-colors duration-200 hover:border-[var(--accent)] focus:border-[var(--accent)] focus:outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="ALL">{t("pages.admin.storage.statusAll")}</option>
              <option value="healthy">{t("pages.admin.storage.statusHealthy")}</option>
              <option value="warning">{t("pages.admin.storage.statusWarning")}</option>
              <option value="critical">{t("pages.admin.storage.statusCritical")}</option>
            </select>
          </label>
        </div>

        {loading ? (
          <TableSkeleton rows={4} columns={6} />
        ) : filteredMetrics.length === 0 ? (
          <EmptyState
            title={t("pages.admin.storage.copy022")}
            description={searchTerm || statusFilter !== "ALL" ? t("pages.admin.storage.tryAdjustSearch") : undefined}
            action={
              searchTerm || statusFilter !== "ALL" ? (
                <button
                  type="button"
                  className="enterprise-secondary-button"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("ALL");
                  }}
                >
                  {t("pages.admin.storage.copy023")}
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
                    <th>{t("pages.admin.storage.copy005")}</th>
                    <th>{t("pages.admin.storage.copy006")}</th>
                    <th>{t("pages.admin.storage.copy007")}</th>
                    <th>{t("pages.admin.storage.copy008")}</th>
                    <th>{t("pages.admin.storage.copy009")}</th>
                    <th className="text-right">{t("pages.admin.storage.copy010")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMetrics.map((metric) => (
                    <tr key={metric.mount}>
                      <td className="font-medium font-mono text-sm">
                        {metric.mount}
                      </td>
                      <td className="cell-muted">{metric.total} GB</td>
                      <td className="cell-muted">{metric.used} GB</td>
                      <td className="cell-muted">{metric.free} GB</td>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="h-2 flex-1 rounded-full bg-[var(--panel-bg)]">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                metric.status === "critical"
                                  ? "bg-[var(--danger)]"
                                  : metric.status === "warning"
                                    ? "bg-[var(--warning)]"
                                    : "bg-[var(--accent)]"
                              }`}
                              style={{
                                width: `${Math.min(metric.usage ?? 0, 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-sm font-medium tabular-nums">
                            {metric.usage}%
                          </span>
                        </div>
                      </td>
                      <td className="text-right">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            metric.status === "critical"
                              ? "bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]"
                              : metric.status === "warning"
                                ? "bg-[color-mix(in_srgb,var(--warning)_18%,transparent)] text-[color:#b77900]"
                                : "bg-[color-mix(in_srgb,#2ecc71_14%,transparent)] text-[#2ecc71]"
                          }`}
                        >
                          {metric.status === "critical"
                            ? t("pages.admin.storage.copy013")
                            : metric.status === "warning"
                              ? t("pages.admin.storage.copy012")
                              : t("pages.admin.storage.copy011")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
