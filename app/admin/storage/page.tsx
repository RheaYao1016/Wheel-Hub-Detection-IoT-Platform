"use client";

import { useMemo } from "react";
import Card from "../../components/Layout/Card";
import { useAdminGuard } from "../hooks/useAdminGuard";

type StorageRecord = {
  id: string;
  batch: string;
  location: string;
  quantity: number;
  updatedAt: string;
};

const SAMPLE_STORAGE: StorageRecord[] = [
  { id: "STOCK-001", batch: "20250311-A", location: "A-101", quantity: 24, updatedAt: "2025-03-11 09:00" },
  { id: "STOCK-002", batch: "20250311-B", location: "A-103", quantity: 16, updatedAt: "2025-03-11 09:20" },
  { id: "STOCK-003", batch: "20250311-C", location: "B-204", quantity: 32, updatedAt: "2025-03-11 09:45" },
  { id: "STOCK-004", batch: "20250311-D", location: "B-205", quantity: 18, updatedAt: "2025-03-11 10:05" }
];

export default function StorageListPage() {
  const ready = useAdminGuard();
  const records = useMemo(() => SAMPLE_STORAGE, []);

  if (!ready) {
    return null;
  }

  return (
    <div className="page-shell pt-0 pb-10 space-y-6">
      <div className="flex flex-col gap-2">
        <span className="text-xs text-[var(--text-secondary)]">管理员后台 / 入库记录</span>
        <h1 className="text-2xl font-semibold text-white md:text-3xl">入库批次与库位</h1>
        <p className="text-sm text-[var(--text-secondary)]">关注本周入库批次及库位占用，便于物流调度</p>
      </div>

      <Card>
        <div className="overflow-auto">
          <table className="min-w-full border-collapse text-sm text-[rgba(232,243,255,0.9)]">
            <thead>
              <tr className="bg-[rgba(91,189,247,0.08)] text-xs uppercase tracking-[0.08em] text-[rgba(232,243,255,0.7)]">
                <th className="px-3 py-2 text-left">记录编号</th>
                <th className="px-3 py-2 text-left">批次</th>
                <th className="px-3 py-2 text-left">库位</th>
                <th className="px-3 py-2 text-left">数量</th>
                <th className="px-3 py-2 text-left">更新时间</th>
              </tr>
            </thead>
            <tbody>
              {records.map((item) => (
                <tr key={item.id} className="border-b border-[rgba(255,255,255,0.05)]">
                  <td className="px-3 py-3 font-mono text-xs text-white">{item.id}</td>
                  <td className="px-3 py-3">{item.batch}</td>
                  <td className="px-3 py-3">{item.location}</td>
                  <td className="px-3 py-3">{item.quantity}</td>
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
