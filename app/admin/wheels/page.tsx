"use client";

import { useMemo } from "react";
import Card from "../../components/Layout/Card";
import { useAdminGuard } from "../hooks/useAdminGuard";
import BackButton from "../../components/Layout/BackButton";
import ExportButton from "@/app/components/Controls/ExportButton";
import { buildExportFilename, exportToCsv } from "@/app/utils/export";

type WheelRecord = {
  id: string;
  diameter: string;
  width: string;
  boltPattern: string;
  updatedAt: string;
};

const SAMPLE_WHEELS: WheelRecord[] = [
  { id: "WH-2025-0001", diameter: "18\"", width: "7.5\"", boltPattern: "5x114.3", updatedAt: "2025-03-11 08:35" },
  { id: "WH-2025-0002", diameter: "19\"", width: "8\"", boltPattern: "5x112", updatedAt: "2025-03-11 08:48" },
  { id: "WH-2025-0003", diameter: "20\"", width: "8.5\"", boltPattern: "5x120", updatedAt: "2025-03-11 09:15" },
  { id: "WH-2025-0004", diameter: "17\"", width: "7\"", boltPattern: "5x100", updatedAt: "2025-03-11 09:42" },
  { id: "WH-2025-0005", diameter: "18\"", width: "8\"", boltPattern: "5x114.3", updatedAt: "2025-03-11 10:02" }
];

export default function WheelListPage() {
  const ready = useAdminGuard();
  const records = useMemo(() => SAMPLE_WHEELS, []);

  const handleExport = () => {
    if (!records.length) {
      return;
    }
    exportToCsv({
      filename: buildExportFilename("wheels"),
      header: ["编号", "直径", "轮辋宽度", "孔距", "更新时间"],
      rows: records.map((item) => [item.id, item.diameter, item.width, item.boltPattern, item.updatedAt])
    });
  };

  if (!ready) {
    return null;
  }

  return (
    <div className="page-shell pt-0 pb-10 space-y-6">
      <BackButton fallbackHref="/admin" />
      <div className="flex flex-col gap-2">
        <span className="text-xs text-[var(--text-secondary)]">管理员后台 / 轮毂明细</span>
        <h1 className="text-2xl font-semibold text-white md:text-3xl">轮毂信息总览</h1>
        <p className="text-sm text-[var(--text-secondary)]">查看当前库内轮毂规格与更新时间</p>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">轮毂列表</h2>
          <ExportButton onClick={handleExport} disabled={!records.length} />
        </div>
        <div className="overflow-auto">
          <table className="min-w-full border-collapse text-sm text-[rgba(232,243,255,0.9)]">
            <thead>
              <tr className="bg-[rgba(91,189,247,0.08)] text-xs uppercase tracking-[0.08em] text-[rgba(232,243,255,0.7)]">
                <th className="px-3 py-2 text-left">编号</th>
                <th className="px-3 py-2 text-left">直径</th>
                <th className="px-3 py-2 text-left">轮辋宽度</th>
                <th className="px-3 py-2 text-left">孔距</th>
                <th className="px-3 py-2 text-left">更新时间</th>
              </tr>
            </thead>
            <tbody>
              {records.map((item) => (
                <tr key={item.id} className="border-b border-[rgba(255,255,255,0.05)]">
                  <td className="px-3 py-3 font-mono text-xs text-white">{item.id}</td>
                  <td className="px-3 py-3">{item.diameter}</td>
                  <td className="px-3 py-3">{item.width}</td>
                  <td className="px-3 py-3">{item.boltPattern}</td>
                  <td className="px-3 py-3 text-[var(--text-secondary)]">{item.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
