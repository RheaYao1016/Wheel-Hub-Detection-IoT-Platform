"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "@/app/components/Layout/BackButton";
import Card from "@/app/components/Layout/Card";
import PageLoadFallback from "@/app/components/Layout/PageLoadFallback";
import { PlatformAuthError, requestPlatformJson } from "@/lib/dashboard-client";
import { clearAuthSession } from "@/lib/auth-session";
import type { InspectionRecord } from "@/types/platform";
import { useAdminGuard } from "../hooks/useAdminGuard";
import { useLocale } from "@/app/components/Locale/LocaleProvider";
import { Pagination, TableSkeleton, EmptyState } from "@/app/components/ui/Pagination";
import ExportButton from "@/app/components/Controls/ExportButton";
import { buildExportFilename, exportToCsv } from "@/app/utils/export";

type ToastState = {
  message: string;
  type: "success" | "error";
};

const SAMPLE_RECORDS: InspectionRecord[] = [
  {
    id: "INSP-2025-0301-01",
    timestamp: "2025-03-01 09:00",
    wheelId: "WHL-2025-0201-01",
    operator: "张工",
    station: "ST-01",
    result: "PASS",
    radialRunout: 0.12,
    lateralRunout: 0.08,
    conicity: 0.5,
    score: 0.95,
    remarks: "",
  },
  {
    id: "INSP-2025-0301-02",
    timestamp: "2025-03-01 09:15",
    wheelId: "WHL-2025-0201-02",
    operator: "李工",
    station: "ST-02",
    result: "FAIL",
    radialRunout: 0.32,
    lateralRunout: 0.22,
    conicity: 0.8,
    score: 0.45,
    remarks: "Runout out of tolerance",
  },
  {
    id: "INSP-2025-0302-01",
    timestamp: "2025-03-02 10:30",
    wheelId: "WHL-2025-0202-01",
    operator: "王工",
    station: "ST-01",
    result: "PASS",
    radialRunout: 0.09,
    lateralRunout: 0.05,
    conicity: 0.4,
    score: 0.98,
    remarks: "",
  },
  {
    id: "INSP-2025-0303-01",
    timestamp: "2025-03-03 14:20",
    wheelId: "WHL-2025-0203-01",
    operator: "张工",
    station: "ST-03",
    result: "PASS",
    radialRunout: 0.15,
    lateralRunout: 0.10,
    conicity: 0.6,
    score: 0.88,
    remarks: "",
  },
  {
    id: "INSP-2025-0305-01",
    timestamp: "2025-03-05 16:50",
    wheelId: "WHL-2025-0205-01",
    operator: "李工",
    station: "ST-02",
    result: "FAIL",
    radialRunout: 0.28,
    lateralRunout: 0.18,
    conicity: 0.7,
    score: 0.52,
    remarks: "Surface defect detected",
  },
  {
    id: "INSP-2025-0307-01",
    timestamp: "2025-03-07 08:15",
    wheelId: "WHL-2025-0207-01",
    operator: "王工",
    station: "ST-01",
    result: "PASS",
    radialRunout: 0.10,
    lateralRunout: 0.06,
    conicity: 0.3,
    score: 0.96,
    remarks: "",
  },
  {
    id: "INSP-2025-0308-01",
    timestamp: "2025-03-08 11:00",
    wheelId: "WHL-2025-0208-01",
    operator: "张工",
    station: "ST-03",
    result: "PASS",
    radialRunout: 0.14,
    lateralRunout: 0.09,
    conicity: 0.5,
    score: 0.92,
    remarks: "",
  },
  {
    id: "INSP-2025-0310-01",
    timestamp: "2025-03-10 13:30",
    wheelId: "WHL-2025-0210-01",
    operator: "李工",
    station: "ST-02",
    result: "PASS",
    radialRunout: 0.11,
    lateralRunout: 0.07,
    conicity: 0.4,
    score: 0.94,
    remarks: "",
  },
  {
    id: "INSP-2025-0312-01",
    timestamp: "2025-03-12 15:10",
    wheelId: "WHL-2025-0212-01",
    operator: "王工",
    station: "ST-01",
    result: "FAIL",
    radialRunout: 0.25,
    lateralRunout: 0.16,
    conicity: 0.7,
    score: 0.58,
    remarks: "Edge wear detected",
  },
  {
    id: "INSP-2025-0314-01",
    timestamp: "2025-03-14 09:50",
    wheelId: "WHL-2025-0214-01",
    operator: "张工",
    station: "ST-03",
    result: "PASS",
    radialRunout: 0.08,
    lateralRunout: 0.04,
    conicity: 0.3,
    score: 0.99,
    remarks: "",
  },
];

export default function InspectionsPage() {
  const router = useRouter();
  const ready = useAdminGuard();
  const { t } = useLocale();
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [resultFilter, setResultFilter] = useState<"ALL" | "PASS" | "FAIL">("ALL");
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

  const loadInspections = useCallback(async () => {
    setLoading(true);
    try {
      const data = await requestPlatformJson<InspectionRecord[]>(
        "/admin/inspections",
        "",
      );
      setRecords(data);
    } catch (error) {
      if (error instanceof PlatformAuthError) {
        clearAuthSession();
        router.replace("/login");
        return;
      }
      console.error("load inspections failed", error);
      setRecords(SAMPLE_RECORDS);
      showToast(t("pages.admin.inspections.copy027"), "error");
    } finally {
      setLoading(false);
    }
  }, [router, showToast, t]);

  useEffect(() => {
    if (!ready) return;
    loadInspections();
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [loadInspections, ready]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [resultFilter, searchTerm]);

  const failRate = useMemo(() => {
    if (!records.length) return 0;
    const fails = records.filter((r) => r.result === "FAIL").length;
    return ((fails / records.length) * 100).toFixed(1);
  }, [records]);

  const avgScore = useMemo(() => {
    if (!records.length) return "0.00";
    const sum = records.reduce((acc, r) => acc + r.score, 0);
    return (sum / records.length).toFixed(2);
  }, [records]);

  // Filter and search records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const searchMatch = !searchTerm.trim() ||
        r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.wheelId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.station.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.timestamp.toLowerCase().includes(searchTerm.toLowerCase());
      const resultMatch = resultFilter === "ALL" || r.result === resultFilter;
      return searchMatch && resultMatch;
    });
  }, [records, searchTerm, resultFilter]);

  // Paginate
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize);

  const handleExport = useCallback(() => {
    if (!filteredRecords.length) {
      showToast(t("pages.admin.inspections.copy028"), "error");
      return;
    }
    exportToCsv({
      filename: buildExportFilename("inspections"),
      header: [t("pages.admin.inspections.copy012"), t("pages.admin.inspections.copy013"), t("pages.admin.inspections.copy014"), t("pages.admin.inspections.copy015"), t("pages.admin.inspections.copy016"), t("pages.admin.inspections.copy017"), t("pages.admin.inspections.copy031"), t("pages.admin.inspections.copy032"), t("pages.admin.inspections.copy033"), t("pages.admin.inspections.copy018"), t("pages.admin.inspections.copy034")],
      rows: filteredRecords.map((r) => [
        r.id,
        r.timestamp,
        r.wheelId,
        r.operator,
        r.station,
        r.result,
        r.radialRunout.toFixed(2),
        r.lateralRunout.toFixed(2),
        r.conicity.toFixed(2),
        r.score.toFixed(2),
        r.remarks || "",
      ]),
    });
    showToast(t("pages.admin.inspections.copy029"), "success");
  }, [filteredRecords, showToast, t]);

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/admin"
        title={t("pages.admin.inspections.copy001")}
        description={t("pages.admin.inspections.copy002")}
      />
    );
  }

  return (
    <div className="page-shell space-y-6 pb-10 pt-0">
      <BackButton fallbackHref="/admin" />
      <div className="enterprise-hero">
        <div>
          <span className="eyebrow">{t("pages.admin.inspections.copy003")}</span>
          <h1>{t("pages.admin.inspections.copy004")}</h1>
          <p>{t("pages.admin.inspections.copy005")}</p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>{t("pages.admin.inspections.copy006")}</span>
            <strong>{filteredRecords.length}</strong>
          </div>
          <div>
            <span>{t("pages.admin.inspections.copy007")}</span>
            <strong>{avgScore}</strong>
          </div>
          <div>
            <span>{t("pages.admin.inspections.copy008")}</span>
            <strong>{failRate}%</strong>
          </div>
        </div>
      </div>

      <Card className="enterprise-main-card">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">{t("pages.admin.inspections.copy009")}</span>
            <h2>{t("pages.admin.inspections.copy010")}</h2>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton onClick={handleExport} disabled={!filteredRecords.length} />
            <button
              type="button"
              className="enterprise-secondary-button"
              onClick={loadInspections}
            >
              {t("pages.admin.inspections.copy011")}
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="search-input-wrapper">
            <span className="search-input-icon">{"\u{1F50D}"}</span>
            <input
              type="text"
              className="search-input"
              placeholder={t("pages.admin.inspections.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={t("pages.admin.inspections.searchAria")}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            {t("pages.admin.inspections.copy017")}
            <select
              className="rounded-xl border border-[var(--ring-strong)] bg-[color-mix(in_srgb,var(--surface-elevated)_92%,transparent)] px-3 py-2 text-[var(--text-primary)] shadow-[var(--shadow-xs)] transition-colors duration-200 hover:border-[var(--accent)] focus:border-[var(--accent)] focus:outline-none"
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value as typeof resultFilter)}
            >
              <option value="ALL">{t("pages.admin.inspections.copy024")}</option>
              <option value="PASS">{t("pages.admin.inspections.copy025")}</option>
              <option value="FAIL">{t("pages.admin.inspections.copy026")}</option>
            </select>
          </label>
        </div>

        {loading ? (
          <TableSkeleton rows={5} columns={8} />
        ) : filteredRecords.length === 0 ? (
          <EmptyState
            title={t("pages.admin.inspections.copy023")}
            description={searchTerm || resultFilter !== "ALL" ? t("pages.admin.inspections.tryAdjustSearch") : undefined}
            action={
              searchTerm || resultFilter !== "ALL" ? (
                <button
                  type="button"
                  className="enterprise-secondary-button"
                  onClick={() => {
                    setSearchTerm("");
                    setResultFilter("ALL");
                  }}
                >
                  {t("pages.admin.inspections.copy030")}
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
                      <th>{t("pages.admin.inspections.copy012")}</th>
                      <th>{t("pages.admin.inspections.copy013")}</th>
                      <th>{t("pages.admin.inspections.copy014")}</th>
                      <th>{t("pages.admin.inspections.copy015")}</th>
                      <th>{t("pages.admin.inspections.copy016")}</th>
                      <th>{t("pages.admin.inspections.copy017")}</th>
                      <th>{t("pages.admin.inspections.copy018")}</th>
                      <th className="text-right">{t("pages.admin.inspections.copy019")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="cell-mono">{record.id}</td>
                        <td className="cell-muted">{record.timestamp}</td>
                        <td className="cell-mono">{record.wheelId}</td>
                        <td className="font-medium">{record.operator}</td>
                        <td>{record.station}</td>
                        <td>
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                              record.result === "FAIL"
                                ? "bg-[color-mix(in_srgb,var(--danger)_14%,transparent)] text-[var(--danger)]"
                                : "bg-[color-mix(in_srgb,#2ecc71_14%,transparent)] text-[#2ecc71]"
                            }`}
                          >
                            {record.result === "FAIL" ? t("pages.admin.inspections.copy021") : t("pages.admin.inspections.copy020")}
                          </span>
                        </td>
                        <td>
                          <span className="tabular-nums font-medium">
                            {record.score.toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="enterprise-secondary-button px-3 py-1 text-xs"
                            >
                              {t("pages.admin.inspections.copy022")}
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
