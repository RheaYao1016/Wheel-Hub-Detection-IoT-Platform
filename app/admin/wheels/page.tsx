"use client";

import { useMemo } from "react";
import Card from "../../components/Layout/Card";
import { useAdminGuard } from "../hooks/useAdminGuard";
import BackButton from "../../components/Layout/BackButton";
import ExportButton from "@/app/components/Controls/ExportButton";
import { buildExportFilename, exportToCsv } from "@/app/utils/export";
import { useLocale } from "@/app/components/Locale/LocaleProvider";

type WheelRecord = {
  id: string;
  diameter: string;
  width: string;
  boltPattern: string;
  updatedAt: string;
};

const SAMPLE_WHEELS: WheelRecord[] = [
  {
    id: "WH-2025-0001",
    diameter: '18"',
    width: '7.5"',
    boltPattern: "5x114.3",
    updatedAt: "2025-03-11 08:35",
  },
  {
    id: "WH-2025-0002",
    diameter: '19"',
    width: '8"',
    boltPattern: "5x112",
    updatedAt: "2025-03-11 08:48",
  },
  {
    id: "WH-2025-0003",
    diameter: '20"',
    width: '8.5"',
    boltPattern: "5x120",
    updatedAt: "2025-03-11 09:15",
  },
  {
    id: "WH-2025-0004",
    diameter: '17"',
    width: '7"',
    boltPattern: "5x100",
    updatedAt: "2025-03-11 09:42",
  },
  {
    id: "WH-2025-0005",
    diameter: '18"',
    width: '8"',
    boltPattern: "5x114.3",
    updatedAt: "2025-03-11 10:02",
  },
];

export default function WheelListPage() {
  const ready = useAdminGuard();
  const { text, t } = useLocale();
  const records = useMemo(() => SAMPLE_WHEELS, []);

  const handleExport = () => {
    if (!records.length) return;
    exportToCsv({
      filename: buildExportFilename("wheels"),
      header: [
        t("pages.admin.wheels.copy001"),
        t("pages.admin.wheels.copy002"),
        t("pages.admin.wheels.copy003"),
        t("pages.admin.wheels.copy004"),
        t("pages.admin.storage.copy004"),
      ],
      rows: records.map((item) => [
        item.id,
        item.diameter,
        item.width,
        item.boltPattern,
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
          <h1>{t("pages.admin.wheels.copy005")}</h1>
          <p>{t("pages.admin.wheels.copy006")}</p>
        </div>
      </div>

      <Card className="enterprise-main-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">
            {t("pages.admin.wheels.copy007")}
          </h2>
          <ExportButton onClick={handleExport} disabled={!records.length} />
        </div>
        <div className="overflow-auto rounded-2xl border border-[rgba(91,189,247,0.18)]">
          <table className="min-w-full border-collapse text-sm text-[rgba(232,243,255,0.9)]">
            <thead>
              <tr className="bg-[rgba(91,189,247,0.08)] text-xs uppercase tracking-[0.08em] text-[rgba(232,243,255,0.7)]">
                <th className="px-3 py-2 text-left">
                  {t("pages.admin.wheels.copy001")}
                </th>
                <th className="px-3 py-2 text-left">
                  {t("pages.admin.wheels.copy002")}
                </th>
                <th className="px-3 py-2 text-left">
                  {t("pages.admin.wheels.copy003")}
                </th>
                <th className="px-3 py-2 text-left">
                  {t("pages.admin.wheels.copy004")}
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
                  <td className="px-3 py-3">{item.diameter}</td>
                  <td className="px-3 py-3">{item.width}</td>
                  <td className="px-3 py-3">{item.boltPattern}</td>
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
