"use client";

import { useMemo } from "react";
import Card from "../../components/Layout/Card";
import { useAdminGuard } from "../hooks/useAdminGuard";
import BackButton from "../../components/Layout/BackButton";
import ExportButton from "@/app/components/Controls/ExportButton";
import { buildExportFilename, exportToCsv } from "@/app/utils/export";

type InspectionRecord = {
  id: string;
  wheelId: string;
  result: "PASS" | "FAIL";
  station: string;
  operator: string;
  finishedAt: string;
};

const SAMPLE_INSPECTIONS: InspectionRecord[] = [
  { id: "INSP-2025-3101", wheelId: "WH-2025-0001", result: "PASS", station: "ST-01", operator: "李雷", finishedAt: "2025-03-11 08:42" },
  { id: "INSP-2025-3102", wheelId: "WH-2025-0002", result: "PASS", station: "ST-02", operator: "韩梅梅", finishedAt: "2025-03-11 08:55" },
  { id: "INSP-2025-3103", wheelId: "WH-2025-0003", result: "FAIL", station: "ST-03", operator: "张伟", finishedAt: "2025-03-11 09:14" },
  { id: "INSP-2025-3104", wheelId: "WH-2025-0004", result: "PASS", station: "ST-02", operator: "刘洋", finishedAt: "2025-03-11 09:36" },
  { id: "INSP-2025-3105", wheelId: "WH-2025-0005", result: "PASS", station: "ST-01", operator: "赵敏", finishedAt: "2025-03-11 09:58" }
];

export default function InspectionListPage() {
  const ready = useAdminGuard();
  const records = useMemo(() => SAMPLE_INSPECTIONS, []);

  const handleExport = () => {
    if (!records.length) return;
    exportToCsv({
      filename: buildExportFilename("inspections"),
      header: ["记录编号", "轮毂编号", "结果", "工位", "操作员", "完成时间"],
      rows: records.map((item) => [item.id, item.wheelId, item.result, item.station, item.operator, item.finishedAt])
    });
  };

  if (!ready) {
    return null;
  }

  return (
    <div className="page-shell pt-0 pb-10 space-y-6">
      <BackButton fallbackHref="/admin" />
      <div className="flex flex-col gap-2">
        <span className="text-xs text-[var(--text-secondary)]">管理员后台 / 检测记录</span>
        <h1 className="text-2xl font-semibold text-white md:text-3xl">检测记录明细</h1>
        <p className="text-sm text-[var(--text-secondary)]">追踪检测结果与工位信息，支持快速复核</p>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">检测记录</h2>
          <ExportButton onClick={handleExport} disabled={!records.length} />
        </div>
        <div className="overflow-auto">
          <table className="min-w-full border-collapse text-sm text-[rgba(232,243,255,0.9)]">
            <thead>
              <tr className="bg-[rgba(91,189,247,0.08)] text-xs uppercase tracking-[0.08em] text-[rgba(232,243,255,0.7)]">
                <th className="px-3 py-2 text-left">记录编号</th>
                <th className="px-3 py-2 text-left">轮毂编号</th>
                <th className="px-3 py-2 text-left">结果</th>
                <th className="px-3 py-2 text-left">工位</th>
                <th className="px-3 py-2 text-left">操作员</th>
                <th className="px-3 py-2 text-left">完成时间</th>
              </tr>
            </thead>
            <tbody>
              {records.map((item) => (
                <tr key={item.id} className="border-b border-[rgba(255,255,255,0.05)]">
                  <td className="px-3 py-3 font-mono text-xs text-white">{item.id}</td>
                  <td className="px-3 py-3 font-mono text-xs text-white">{item.wheelId}</td>
                  <td className="px-3 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        item.result === "PASS" ? "bg-[rgba(46,201,119,0.18)] text-[#2ec977]" : "bg-[rgba(255,90,90,0.2)] text-[#ff6b81]"
                      }`}
                    >
                      {item.result}
                    </span>
                  </td>
                  <td className="px-3 py-3">{item.station}</td>
                  <td className="px-3 py-3">{item.operator}</td>
                  <td className="px-3 py-3 text-[var(--text-secondary)]">{item.finishedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
