"use client";

import { useMemo } from "react";
import Card from "../../components/Layout/Card";
import { useAdminGuard } from "../hooks/useAdminGuard";
import BackButton from "../../components/Layout/BackButton";
import ExportButton from "@/app/components/Controls/ExportButton";
import { buildExportFilename, exportToCsv } from "@/app/utils/export";
import { useLocale } from "@/app/components/Locale/LocaleProvider";

type StorageRecord = {
  id: string;
  batch: string;
  location: string;
  quantity: number;
  updatedAt: string;
};

const SAMPLE_STORAGE: StorageRecord[] = [
  {
    id: "STOCK-001",
    batch: "20250311-A",
    location: "A-101",
    quantity: 24,
    updatedAt: "2025-03-11 09:00",
  },
  {
    id: "STOCK-002",
    batch: "20250311-B",
    location: "A-103",
    quantity: 16,
    updatedAt: "2025-03-11 09:20",
  },
  {
    id: "STOCK-003",
    batch: "20250311-C",
    location: "B-204",
    quantity: 32,
    updatedAt: "2025-03-11 09:45",
  },
  {
    id: "STOCK-004",
    batch: "20250311-D",
    location: "B-205",
    quantity: 18,
    updatedAt: "2025-03-11 10:05",
  },
];

export default function StorageListPage() {
  const ready = useAdminGuard();
  const { text, t } = useLocale();
  const records = useMemo(() => SAMPLE_STORAGE, []);

  const handleExport = () => {
    if (!records.length) return;
    exportToCsv({
      filename: buildExportFilename("storage"),
      header: [
        t("pages.admin.inspections.copy001"),
        t("pages.admin.storage.copy001"),
        t("pages.admin.storage.copy002"),
        t("pages.admin.storage.copy003"),
        t("pages.admin.storage.copy004"),
      ],
      rows: records.map((item) => [
        item.id,
        item.batch,
        item.location,
        item.quantity,
        item.updatedAt,
      ]),
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
          <h1>{t("pages.admin.storage.copy005")}</h1>
          <p>{t("pages.admin.storage.copy006")}</p>
        </div>
      </div>

      <Card className="enterprise-main-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">
            {t("pages.admin.storage.copy007")}
          </h2>
          <ExportButton onClick={handleExport} disabled={!records.length} />
        </div>
        <div className="overflow-auto rounded-2xl border border-[rgba(91,189,247,0.18)]">
          <table className="min-w-full border-collapse text-sm text-[rgba(232,243,255,0.9)]">
            <thead>
              <tr className="bg-[rgba(91,189,247,0.08)] text-xs uppercase tracking-[0.08em] text-[rgba(232,243,255,0.7)]">
                <th className="px-3 py-2 text-left">
                  {t("pages.admin.inspections.copy001")}
                </th>
                <th className="px-3 py-2 text-left">
                  {t("pages.admin.storage.copy001")}
                </th>
                <th className="px-3 py-2 text-left">
                  {t("pages.admin.storage.copy002")}
                </th>
                <th className="px-3 py-2 text-left">
                  {t("pages.admin.storage.copy003")}
                </th>
                <th className="px-3 py-2 text-left">
                  {t("pages.admin.storage.copy004")}
                </th>
              </tr>
            </thead>
            <tbody>
              {records.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-[rgba(255,255,255,0.05)]"
                >
                  <td className="px-3 py-3 font-mono text-xs text-white">
                    {item.id}
                  </td>
                  <td className="px-3 py-3">{item.batch}</td>
                  <td className="px-3 py-3">{item.location}</td>
                  <td className="px-3 py-3">{item.quantity}</td>
                  <td className="px-3 py-3 text-[var(--text-secondary)]">
                    {item.updatedAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
