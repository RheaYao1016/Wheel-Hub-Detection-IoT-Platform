"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BackButton from "../../components/Layout/BackButton";
import Card from "../../components/Layout/Card";
import ExportButton from "@/app/components/Controls/ExportButton";
import { buildExportFilename, exportToCsv } from "@/app/utils/export";
import { requestPlatformJson } from "@/lib/dashboard-client";
import type { AlertLevel, AlertRecord, AlertStatus } from "@/types/alerts";
import { useAdminGuard } from "../hooks/useAdminGuard";

type ToastState = {
  message: string;
  type: "success" | "error";
};

const SAMPLE_ALERTS: AlertRecord[] = [
  { id: "AL-2025-0311-01", timestamp: "2025-03-11 08:42:11", station: "ST-01", level: "高", description: "圆跳动超限 0.32mm，超出 0.25mm 阈值", status: "待处理" },
  { id: "AL-2025-0311-02", timestamp: "2025-03-11 09:07:18", station: "ST-02", level: "中", description: "视觉相机曝光漂移，请检查光源", status: "待处理" },
  { id: "AL-2025-0311-03", timestamp: "2025-03-11 09:25:54", station: "ST-03", level: "低", description: "缓存队列接近阈值，建议清理历史数据", status: "待处理" },
];

export default function AlertsPage() {
  const ready = useAdminGuard();
  const [records, setRecords] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<"ALL" | AlertLevel>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | AlertStatus>("ALL");
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<number>();

  const showToast = useCallback((message: string, type: ToastState["type"]) => {
    setToast({ message, type });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (levelFilter !== "ALL") params.set("level", levelFilter);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      const query = params.toString();

      const data = await requestPlatformJson<AlertRecord[]>(
        `/admin/alerts${query ? `?${query}` : ""}`,
        ""
      );
      setRecords(data);
    } catch (error) {
      console.error("load alerts failed", error);
      const fallback = SAMPLE_ALERTS.filter((item) => {
        const levelPass = levelFilter === "ALL" || item.level === levelFilter;
        const statusPass = statusFilter === "ALL" || item.status === statusFilter;
        return levelPass && statusPass;
      });
      setRecords(fallback);
      showToast("后端告警服务不可用，已回退到本地演示数据。", "error");
    } finally {
      setLoading(false);
    }
  }, [levelFilter, showToast, statusFilter]);

  useEffect(() => {
    if (!ready) return;
    loadAlerts();
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [loadAlerts, ready]);

  const pendingCount = useMemo(() => records.filter((item) => item.status === "待处理").length, [records]);

  const handleAction = useCallback(
    async (id: string, status: AlertStatus) => {
      try {
        await requestPlatformJson<AlertRecord>(
          `/admin/alerts/${id}`,
          "",
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          }
        );
        setRecords((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
        showToast(`告警 ${id} 已更新为“${status}”`, "success");
      } catch (error) {
        console.error("alert update failed", error);
        setRecords((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
        showToast("后端操作失败，已在本地演示状态下更新。", "error");
      }
    },
    [showToast]
  );

  const handleExport = useCallback(() => {
    if (!records.length) {
      showToast("当前没有可导出的告警记录", "error");
      return;
    }
    exportToCsv({
      filename: buildExportFilename("alerts"),
      header: ["告警编号", "时间", "工位", "级别", "描述", "状态"],
      rows: records.map((alert) => [alert.id, alert.timestamp, alert.station, alert.level, alert.description, alert.status]),
    });
    showToast(`已导出 ${records.length} 条告警记录`, "success");
  }, [records, showToast]);

  if (!ready) {
    return null;
  }

  return (
    <div className="page-shell pt-0 pb-10 space-y-6">
      <BackButton fallbackHref="/admin" />
      <div className="flex flex-col gap-2">
        <span className="text-xs text-[var(--text-secondary)]">管理员后台 / 风险告警</span>
        <h1 className="text-2xl font-semibold text-white md:text-3xl">风险告警中心</h1>
        <p className="text-sm text-[var(--text-secondary)]">支持告警筛选、派发、已读、忽略与导出，优先直连 Spring Boot 管理接口。</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="flex flex-col gap-1">
          <span className="text-sm text-[var(--text-secondary)]">告警总数</span>
          <span className="text-3xl font-semibold text-white">{records.length}</span>
        </Card>
        <Card className="flex flex-col gap-1">
          <span className="text-sm text-[var(--text-secondary)]">待处理</span>
          <span className="text-3xl font-semibold text-[#ffd166]">{pendingCount}</span>
        </Card>
        <Card className="flex items-center justify-between gap-3">
          <div>
            <span className="text-sm text-[var(--text-secondary)]">快捷导出</span>
            <p className="text-xs text-[rgba(232,243,255,0.8)]">支持导出当前筛选结果，方便汇报与留档。</p>
          </div>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[rgba(232,243,255,0.6)]">ops</span>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">告警记录</h2>
            <p className="text-xs text-[var(--text-secondary)]">当前列表 {records.length} 条</p>
          </div>
          <ExportButton onClick={handleExport} disabled={!records.length} />
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            级别
            <select
              className="rounded-md border border-[rgba(91,189,247,0.25)] bg-transparent px-2 py-1 text-xs text-white focus:border-[rgba(91,189,247,0.5)] focus:outline-none"
              value={levelFilter}
              onChange={(event) => setLevelFilter(event.target.value as "ALL" | AlertLevel)}
            >
              <option value="ALL">全部</option>
              <option value="高">高</option>
              <option value="中">中</option>
              <option value="低">低</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            状态
            <select
              className="rounded-md border border-[rgba(91,189,247,0.25)] bg-transparent px-2 py-1 text-xs text-white focus:border-[rgba(91,189,247,0.5)] focus:outline-none"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "ALL" | AlertStatus)}
            >
              <option value="ALL">全部</option>
              <option value="待处理">待处理</option>
              <option value="已读">已读</option>
              <option value="已派发">已派发</option>
              <option value="已忽略">已忽略</option>
            </select>
          </label>
          <button
            type="button"
            onClick={loadAlerts}
            className="rounded-full border border-[rgba(91,189,247,0.35)] px-3 py-1 text-xs text-white"
          >
            刷新
          </button>
        </div>

        {loading ? (
          <div className="loading-state">正在加载告警数据...</div>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full border-collapse text-sm text-[rgba(232,243,255,0.88)]">
              <thead>
                <tr className="bg-[rgba(91,189,247,0.08)] text-xs uppercase tracking-[0.08em] text-[rgba(232,243,255,0.7)]">
                  <th className="px-3 py-2 text-left">告警编号</th>
                  <th className="px-3 py-2 text-left">时间</th>
                  <th className="px-3 py-2 text-left">工位</th>
                  <th className="px-3 py-2 text-left">级别</th>
                  <th className="px-3 py-2 text-left">描述</th>
                  <th className="px-3 py-2 text-left">状态</th>
                  <th className="px-3 py-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map((alert) => (
                  <tr key={alert.id} className="border-b border-[rgba(255,255,255,0.05)]">
                    <td className="px-3 py-3 font-mono text-xs text-white">{alert.id}</td>
                    <td className="px-3 py-3">{alert.timestamp}</td>
                    <td className="px-3 py-3">{alert.station}</td>
                    <td className="px-3 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          alert.level === "高"
                            ? "bg-[rgba(255,90,90,0.2)] text-[#ff6b81]"
                            : alert.level === "中"
                            ? "bg-[rgba(255,209,102,0.2)] text-[#ffd166]"
                            : "bg-[rgba(81,211,195,0.18)] text-[#51d3c3]"
                        }`}
                      >
                        {alert.level}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[rgba(232,243,255,0.85)]">{alert.description}</td>
                    <td className="px-3 py-3 text-xs text-[var(--text-secondary)]">{alert.status}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button type="button" className="rounded-full border border-[rgba(91,189,247,0.3)] px-3 py-1 text-xs text-white" onClick={() => handleAction(alert.id, "已读")}>
                          设为已读
                        </button>
                        <button type="button" className="rounded-full border border-[rgba(166,192,220,0.3)] px-3 py-1 text-xs text-[rgba(232,243,255,0.85)]" onClick={() => handleAction(alert.id, "已忽略")}>
                          忽略
                        </button>
                        <button type="button" className="rounded-full bg-gradient-to-r from-[#5bbdf7] to-[#4f82f4] px-3 py-1 text-xs font-semibold text-[#041629]" onClick={() => handleAction(alert.id, "已派发")}>
                          派发工位
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!records.length && <div className="empty-state"><span>!</span>当前没有符合条件的告警记录。</div>}
          </div>
        )}
      </Card>

      {toast ? (
        <div className={`floating-toast ${toast.type === "success" ? "success" : "error"}`}>{toast.message}</div>
      ) : null}
    </div>
  );
}
