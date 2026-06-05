"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/app/components/Layout/BackButton";
import Card from "@/app/components/Layout/Card";
import PageLoadFallback from "@/app/components/Layout/PageLoadFallback";
import { PlatformAuthError, requestPlatformJson } from "@/lib/dashboard-client";
import { clearAuthSession } from "@/lib/auth-session";
import type { WheelHubRecord } from "@/types/platform";
import { useAdminGuard } from "../hooks/useAdminGuard";
import { useLocale } from "@/app/components/Locale/LocaleProvider";
import { Pagination, TableSkeleton, EmptyState } from "@/app/components/ui/Pagination";

type ToastState = {
  message: string;
  type: "success" | "error";
};

const SAMPLE_WHEELS: WheelHubRecord[] = [
  {
    id: "WHL-2025-0201-01",
    model: "V1.5-T06",
    batch: "2025-Q1-003",
    timestamp: "2025-02-01 11:45",
    status: "PASS",
  },
  {
    id: "WHL-2025-0201-02",
    model: "V2.0-T09",
    batch: "2025-Q1-004",
    timestamp: "2025-02-01 12:10",
    status: "FAIL",
  },
  {
    id: "WHL-2025-0202-01",
    model: "V1.5-T06",
    batch: "2025-Q1-003",
    timestamp: "2025-02-02 09:30",
    status: "PASS",
  },
  {
    id: "WHL-2025-0203-01",
    model: "V3.0-T12",
    batch: "2025-Q1-007",
    timestamp: "2025-02-03 14:15",
    status: "PASS",
  },
  {
    id: "WHL-2025-0205-01",
    model: "V2.0-T09",
    batch: "2025-Q1-004",
    timestamp: "2025-02-05 16:42",
    status: "FAIL",
  },
  {
    id: "WHL-2025-0207-01",
    model: "V1.5-T06",
    batch: "2025-Q1-005",
    timestamp: "2025-02-07 08:20",
    status: "PASS",
  },
  {
    id: "WHL-2025-0208-01",
    model: "V3.0-T12",
    batch: "2025-Q1-007",
    timestamp: "2025-02-08 10:55",
    status: "PASS",
  },
  {
    id: "WHL-2025-0210-01",
    model: "V2.0-T09",
    batch: "2025-Q1-006",
    timestamp: "2025-02-10 13:18",
    status: "PASS",
  },
  {
    id: "WHL-2025-0212-01",
    model: "V1.5-T06",
    batch: "2025-Q1-005",
    timestamp: "2025-02-12 15:05",
    status: "FAIL",
  },
  {
    id: "WHL-2025-0214-01",
    model: "V3.0-T12",
    batch: "2025-Q1-008",
    timestamp: "2025-02-14 09:42",
    status: "PASS",
  },
  {
    id: "WHL-2025-0216-01",
    model: "V2.0-T09",
    batch: "2025-Q1-006",
    timestamp: "2025-02-16 11:30",
    status: "PASS",
  },
  {
    id: "WHL-2025-0218-01",
    model: "V1.5-T06",
    batch: "2025-Q1-005",
    timestamp: "2025-02-18 14:22",
    status: "PASS",
  },
];

export default function WheelsPage() {
  const router = useRouter();
  const ready = useAdminGuard();
  const { t } = useLocale();
  const [records, setRecords] = useState<WheelHubRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PASS" | "FAIL">("ALL");
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

  const loadWheels = useCallback(async () => {
    setLoading(true);
    try {
      const data = await requestPlatformJson<WheelHubRecord[]>(
        "/admin/wheels",
        "",
      );
      setRecords(data);
    } catch (error) {
      if (error instanceof PlatformAuthError) {
        clearAuthSession();
        router.replace("/login");
        return;
      }
      console.error("load wheels failed", error);
      setRecords(SAMPLE_WHEELS);
      showToast(t("pages.admin.wheels.copy012"), "error");
    } finally {
      setLoading(false);
    }
  }, [router, showToast, t]);

  useEffect(() => {
    if (!ready) return;
    loadWheels();
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [loadWheels, ready]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm]);

  const failCount = useMemo(
    () => records.filter((r) => r.status === "FAIL").length,
    [records],
  );

  // Filter and search records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const searchMatch = !searchTerm.trim() ||
        r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.batch.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.timestamp.toLowerCase().includes(searchTerm.toLowerCase());
      const statusMatch = statusFilter === "ALL" || r.status === statusFilter;
      return searchMatch && statusMatch;
    });
  }, [records, searchTerm, statusFilter]);

  // Paginate
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize);

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/admin"
        title={t("pages.admin.wheels.copy013")}
        description={t("pages.admin.wheels.copy014")}
      />
    );
  }

  return (
    <div className="page-shell space-y-6 pb-10 pt-0">
      <BackButton fallbackHref="/admin" />
      <div className="enterprise-hero">
        <div>
          <span className="eyebrow">{t("pages.admin.wheels.copy015")}</span>
          <h1>{t("pages.admin.wheels.copy001")}</h1>
          <p>{t("pages.admin.wheels.copy002")}</p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>{t("pages.admin.wheels.copy016")}</span>
            <strong>{filteredRecords.length}</strong>
          </div>
          <div>
            <span>{t("pages.admin.wheels.copy017")}</span>
            <strong>{failCount}</strong>
          </div>
        </div>
      </div>

      <Card className="enterprise-main-card">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">{t("pages.admin.wheels.copy018")}</span>
            <h2>{t("pages.admin.wheels.copy003")}</h2>
          </div>
          <button
            type="button"
            className="enterprise-secondary-button"
            onClick={loadWheels}
          >
            {t("pages.admin.wheels.copy004")}
          </button>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="search-input-wrapper">
            <span className="search-input-icon">{"\u{1F50D}"}</span>
            <input
              type="text"
              className="search-input"
              placeholder={t("pages.admin.wheels.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={t("pages.admin.wheels.searchAria")}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            {t("pages.admin.wheels.copy009")}
            <select
              className="rounded-xl border border-[var(--ring-strong)] bg-[color-mix(in_srgb,var(--surface-elevated)_92%,transparent)] px-3 py-2 text-[var(--text-primary)] shadow-[var(--shadow-xs)] transition-colors duration-200 hover:border-[var(--accent)] focus:border-[var(--accent)] focus:outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            >
              <option value="ALL">{t("pages.admin.wheels.copy019")}</option>
              <option value="PASS">{t("pages.admin.wheels.copy020")}</option>
              <option value="FAIL">{t("pages.admin.wheels.copy021")}</option>
            </select>
          </label>
        </div>

        {loading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : filteredRecords.length === 0 ? (
          <EmptyState
            title={t("pages.admin.wheels.copy022")}
            description={searchTerm || statusFilter !== "ALL" ? t("pages.admin.wheels.tryAdjustSearch") : undefined}
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
                  {t("pages.admin.wheels.copy023")}
                </button>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="table-wrapper-responsive">
              <div className="overflow-auto rounded-2xl border border-[var(--ring-soft)] bg-[color-mix(in_srgb,var(--panel-bg)_94%,var(--surface-elevated)_6%)] shadow-[var(--shadow-xs)]">
                <table className="table-enhanced">
                  <thead>
                    <tr>
                      <th>{t("pages.admin.wheels.copy005")}</th>
                      <th>{t("pages.admin.wheels.copy006")}</th>
                      <th>{t("pages.admin.wheels.copy007")}</th>
                      <th>{t("pages.admin.wheels.copy008")}</th>
                      <th>{t("pages.admin.wheels.copy009")}</th>
                      <th className="text-right">{t("pages.admin.wheels.copy010")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.map((wheel) => (
                      <tr key={wheel.id}>
                        <td className="cell-mono">{wheel.id}</td>
                        <td className="font-medium">{wheel.model}</td>
                        <td className="cell-muted">{wheel.batch}</td>
                        <td className="cell-muted">{wheel.timestamp}</td>
                        <td>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              wheel.status === "FAIL"
                                ? "bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]"
                                : "bg-[color-mix(in_srgb,#2ecc71_14%,transparent)] text-[#2ecc71]"
                            }`}
                          >
                            {wheel.status === "FAIL"
                              ? t("pages.admin.wheels.copy011")
                              : t("pages.admin.wheels.copy020")}
                          </span>
                        </td>
                        <td>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="enterprise-secondary-button px-3 py-1 text-xs"
                            >
                              {t("pages.admin.wheels.copy010")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {filteredRecords.length > pageSize && (
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
          </>
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
