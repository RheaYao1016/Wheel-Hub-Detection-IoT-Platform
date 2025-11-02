"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../../components/Layout/Card";
import { useAdminGuard } from "../hooks/useAdminGuard";

type AlertLevel = "高" | "中" | "低";

type AlertStatus = "待处理" | "已读" | "已派发" | "已忽略";

type AlertRecord = {
  id: string;
  timestamp: string;
  station: string;
  level: AlertLevel;
  description: string;
  status: AlertStatus;
};

type ToastState = {
  message: string;
  type: "success" | "error";
};

const SAMPLE_ALERTS: AlertRecord[] = [
  { id: "AL-2025-0311-01", timestamp: "2025-03-11 08:42:11", station: "ST-01", level: "高", description: "圆跳动超限 0.32mm，超出±0.25mm 阈值", status: "待处理" },
  { id: "AL-2025-0311-02", timestamp: "2025-03-11 09:07:18", station: "ST-02", level: "中", description: "视觉相机曝光漂移，请检查光源", status: "待处理" },
  { id: "AL-2025-0311-03", timestamp: "2025-03-11 09:25:54", station: "ST-03", level: "低", description: "缓存队列接近阈值，建议清理历史数据", status: "待处理" },
  { id: "AL-2025-0311-04", timestamp: "2025-03-11 09:36:10", station: "ST-02", level: "中", description: "PLC 与上位机通讯重试 3 次", status: "待处理" },
  { id: "AL-2025-0311-05", timestamp: "2025-03-11 09:48:27", station: "ST-04", level: "高", description: "孔距偏差超限 0.18mm", status: "待处理" },
  { id: "AL-2025-0311-06", timestamp: "2025-03-11 10:05:03", station: "ST-05", level: "低", description: "边缘计算节点 CPU 占用 82%", status: "待处理" }
];

export default function AlertsPage() {
  const router = useRouter();
  const ready = useAdminGuard();
  const [records, setRecords] = useState<AlertRecord[]>(SAMPLE_ALERTS);
  const [levelFilter, setLevelFilter] = useState<"ALL" | AlertLevel>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | AlertStatus>("ALL");
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<number>();

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const levelPass = levelFilter === "ALL" || item.level === levelFilter;
      const statusPass = statusFilter === "ALL" || item.status === statusFilter;
      return levelPass && statusPass;
    });
  }, [records, levelFilter, statusFilter]);

  const updateStatus = (id: string, status: AlertStatus) => {
    setRecords((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  const handleAction = async (id: string, status: AlertStatus) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 480));
      updateStatus(id, status);
      showToast(`${id} 已${status}`, "success");
    } catch (error) {
      console.error(error);
      showToast("操作失败，请稍后重试", "error");
    }
  };

  if (!ready) {
    return null;
  }

  const pendingCount = records.filter((item) => item.status === "待处理").length;

  return (
    <div className="page-shell pt-0 pb-10 space-y-6">
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="w-fit rounded-xl border border-[rgba(91,189,247,0.3)] bg-[rgba(20,52,85,0.7)] px-4 py-1.5 text-sm text-[rgba(232,243,255,0.9)] transition hover:border-[rgba(91,189,247,0.6)] hover:text-white"
          onClick={() => router.push("/admin")}
        >
          ← 返回
        </button>
        <span className="text-xs text-[var(--text-secondary)]">管理员后台 / 风险告警</span>
        <h1 className="text-2xl font-semibold text-white md:text-3xl">风险告警列表</h1>
        <p className="text-sm text-[var(--text-secondary)]">查看实时告警并派发到具体工位</p>
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
            <span className="text-sm text-[var(--text-secondary)]">快捷操作</span>
            <p className="text-xs text-[rgba(232,243,255,0.8)]">将列表导出或派发工位负责人</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-[rgba(91,189,247,0.3)] px-4 py-2 text-xs text-white transition hover:border-[rgba(91,189,247,0.5)]"
            onClick={() => showToast("已导出 CSV（示例）", "success")}
          >
            导出
          </button>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-white">筛选</span>
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
        </div>

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
              {filteredRecords.map((alert) => (
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
                  <td className="px-3 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-full border border-[rgba(91,189,247,0.3)] px-3 py-1 text-xs text-white hover:border-[rgba(91,189,247,0.5)]"
                        onClick={() => handleAction(alert.id, "已读")}
                      >
                        设为已读
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-[rgba(166,192,220,0.3)] px-3 py-1 text-xs text-[rgba(232,243,255,0.85)] hover:border-[rgba(166,192,220,0.5)]"
                        onClick={() => handleAction(alert.id, "已忽略")}
                      >
                        忽略
                      </button>
                      <button
                        type="button"
                        className="rounded-full bg-gradient-to-r from-[#5bbdf7] to-[#4f82f4] px-3 py-1 text-xs font-semibold text-[#041629] hover:opacity-90"
                        onClick={() => handleAction(alert.id, "已派发")}
                      >
                        派发工位
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredRecords.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-[var(--text-secondary)]">暂无符合筛选条件的告警记录。</div>
          )}
        </div>
      </Card>

      {toast && (
        <div
          className={`fixed bottom-8 right-8 z-50 min-w-[220px] rounded-2xl px-4 py-3 text-sm font-semibold shadow-[0_16px_40px_rgba(0,0,0,0.35)] ${
            toast.type === "success" ? "bg-[rgba(46,201,119,0.18)] text-[#2ec977]" : "bg-[rgba(255,90,90,0.22)] text-[#ff6b81]"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
