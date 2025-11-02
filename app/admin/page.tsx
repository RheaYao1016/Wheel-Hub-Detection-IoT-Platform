"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Card from "../components/Layout/Card";
import LineChart from "../components/Charts/LineChart";
import PieChart from "../components/Charts/PieChart";
import ReactECharts from "echarts-for-react";

type KpiMetric = {
  label: string;
  value: number;
  route: string;
  note: string;
  highlight?: boolean;
};

type ToastState = {
  message: string;
  type: "success" | "error";
};

type SessionState = { role: string } | null;

const KPI_METRICS: KpiMetric[] = [
  { label: "轮毂总数", value: 3100, route: "/admin/wheels", note: "总览明细" },
  { label: "今日检测", value: 210, route: "/admin/inspections", note: "实时统计" },
  { label: "本周入库", value: 392, route: "/admin/storage", note: "库位流转" },
  { label: "风险告警数目", value: 3, route: "/admin/alerts", note: "待处理", highlight: true }
];

const DONUT_DATA = [
  { name: "合格", value: 88 },
  { name: "不合格", value: 12 }
];

const BAR_DATA = {
  categories: ["17寸", "18寸", "19寸", "20寸", "21寸"],
  values: [320, 280, 240, 190, 160]
};

const BAR_CHART_OPTION = {
  grid: { left: 60, right: 24, top: 20, bottom: 40 },
  tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
  xAxis: { type: "value", splitLine: { show: false }, axisLabel: { color: "rgba(166,192,220,0.86)" } },
  yAxis: { type: "category", data: BAR_DATA.categories, axisLabel: { color: "#e8f3ff" } },
  series: [
    {
      type: "bar",
      data: BAR_DATA.values,
      barWidth: 18,
      itemStyle: {
        borderRadius: [0, 12, 12, 0],
        color: {
          type: "linear",
          x: 0,
          y: 0,
          x2: 1,
          y2: 0,
          colorStops: [
            { offset: 0, color: "#5bbdf7" },
            { offset: 1, color: "#4f82f4" }
          ]
        }
      }
    }
  ]
} as const;

const TOAST_DURATION = 2600;

export default function AdminDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<SessionState>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const trend = useMemo(buildTrend, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("role");
    if (stored === "admin") {
      setSession({ role: "admin" });
    } else {
      router.replace("/login");
    }
    return () => {
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, [router]);

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, TOAST_DURATION);
  }, []);

  const handleNavigate = useCallback(
    (route: string) => {
      router.push(route);
    },
    [router]
  );

  const handleSync = useCallback(async () => {
    if (typeof window === "undefined") return;
    const confirmed = window.confirm("确认同步数据吗？");
    if (!confirmed) return;
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggeredAt: new Date().toISOString() })
      });
      if (response.ok) {
        showToast("数据同步完成", "success");
      } else {
        showToast("数据同步失败", "error");
      }
    } catch (error) {
      console.error(error);
      showToast("同步过程出现异常", "error");
    }
  }, [showToast]);

  if (!session) {
    return null;
  }

  return (
    <>
      <AdminHome trend={trend} onNavigate={handleNavigate} onSync={handleSync} />
      {toast && (
        <div
          className={`fixed bottom-8 right-8 z-50 min-w-[220px] rounded-2xl px-4 py-3 text-sm font-semibold shadow-[0_16px_40px_rgba(0,0,0,0.35)] ${
            toast.type === "success" ? "bg-[rgba(46,201,119,0.18)] text-[#2ec977]" : "bg-[rgba(255,90,90,0.22)] text-[#ff6b81]"
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}

type AdminHomeProps = {
  trend: Array<{ name: string; value: number }>;
  onNavigate: (route: string) => void;
  onSync: () => void;
};

function AdminHome({ trend, onNavigate, onSync }: AdminHomeProps) {
  return (
    <div className="page-shell pt-0 pb-10">
      <div className="flex flex-col gap-2">
        <span className="text-xs text-[var(--text-secondary)]">管理员后台 / 数据概览</span>
        <h1 className="text-2xl font-semibold text-white md:text-3xl">管理员后台管理台</h1>
        <p className="text-sm text-[var(--text-secondary)]">状态纵览、数据分析与导入</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {KPI_METRICS.map((metric) => (
          <Card
            key={metric.label}
            className="flex flex-col items-center justify-center gap-2 py-6 text-center"
            onClick={() => onNavigate(metric.route)}
          >
            <span className="text-sm text-[var(--text-secondary)]">{metric.label}</span>
            <span className={`${metric.highlight ? "text-[#ffd166]" : "text-white"} text-3xl font-bold`}>{metric.value}</span>
            <span className="text-xs text-[var(--text-secondary)]">{metric.note}</span>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <Card className="col-span-1 md:col-span-7">
          <h2 className="mb-3 text-lg font-semibold text-white">每日检测量趋势</h2>
          <div className="h-[320px]">
            <LineChart data={trend} />
          </div>
        </Card>
        <Card className="col-span-1 space-y-4 md:col-span-5">
          <h2 className="text-lg font-semibold text-white">合格率占比 + 尺寸 Top5</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PieChart title="合格率" data={DONUT_DATA} />
            <div className="h-[260px]">
              <ReactECharts style={{ height: "100%" }} option={BAR_CHART_OPTION} />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold text-white">快速操作</h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full bg-gradient-to-r from-[#5bbdf7] to-[#4f82f4] px-6 py-2 text-sm font-semibold text-[#041629] shadow-[0_10px_24px_rgba(91,189,247,0.3)]"
            onClick={() => onNavigate("/admin/data-import")}
          >
            数据导入
          </button>
          <button
            type="button"
            className="rounded-full border border-[rgba(91,189,247,0.3)] bg-[rgba(91,189,247,0.08)] px-6 py-2 text-sm font-semibold text-white transition hover:border-[rgba(91,189,247,0.5)] hover:bg-[rgba(91,189,247,0.12)]"
            onClick={onSync}
          >
            数据同步
          </button>
          <button
            type="button"
            className="rounded-full bg-gradient-to-r from-[#ff6b81] to-[#f6556d] px-6 py-2 text-sm font-semibold text-[#041629] shadow-[0_10px_24px_rgba(255,107,129,0.3)]"
            onClick={() => onNavigate("/admin/alerts")}
          >
            风险告警
          </button>
        </div>
      </Card>
    </div>
  );
}

function buildTrend() {
  const labels = buildLabels();
  return labels.map((label) => ({ name: label, value: Math.round(260 + Math.random() * 140) }));
}

function buildLabels() {
  const labels: string[] = [];
  const now = new Date();
  for (let i = 29; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }
  return labels;
}
