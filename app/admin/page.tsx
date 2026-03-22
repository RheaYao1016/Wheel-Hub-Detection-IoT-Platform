"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactECharts from "echarts-for-react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import LineChart from "../components/Charts/LineChart";
import PieChart from "../components/Charts/PieChart";
import type { AdminSnapshot } from "@/types/platform";

type ToastState = {
  message: string;
  type: "success" | "error";
};

const TOAST_DURATION = 2600;

export default function AdminDashboard() {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [error, setError] = useState("");
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const storedRole = typeof window !== "undefined" ? window.localStorage.getItem("role") : null;
    if (storedRole !== "admin") {
      router.replace("/login");
      return;
    }

    let active = true;
    const load = async () => {
      try {
        const response = await fetch("/api/admin", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("后台数据加载失败");
        }
        const payload = (await response.json()) as AdminSnapshot;
        if (!active) return;
        setSnapshot(payload);
      } catch (requestError) {
        if (!active) return;
        console.error(requestError);
        setError("管理员后台数据暂时不可用。");
      }
    };

    load();
    const timer = window.setInterval(load, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [router]);

  const showToast = useCallback((message: string, type: ToastState["type"]) => {
    setToast({ message, type });
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, TOAST_DURATION);
  }, []);

  const handleSync = useCallback(async () => {
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggeredAt: new Date().toISOString() }),
      });
      showToast(response.ok ? "数据同步完成" : "数据同步失败", response.ok ? "success" : "error");
    } catch (requestError) {
      console.error(requestError);
      showToast("同步过程发生异常", "error");
    }
  }, [showToast]);

  const sizeOption = {
    grid: { left: 86, right: 26, top: 18, bottom: 18 },
    tooltip: {
      trigger: "item",
      formatter: ({ name, value }: { name: string; value: number }) => `${name}<br/>${value} 件`,
      backgroundColor: "rgba(5, 23, 45, 0.92)",
      borderWidth: 0,
      textStyle: { color: "#e8f3ff" },
    },
    xAxis: {
      type: "value",
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.08)", type: "dashed" } },
      axisLabel: { color: "rgba(166,192,220,0.8)" },
      axisLine: { show: false },
      axisTick: { show: false },
    },
    yAxis: {
      type: "category",
      data: snapshot?.topSizes.map((item) => item.name) ?? [],
      axisLabel: { color: "#ffffff", fontWeight: 600 },
      axisTick: { show: false },
      axisLine: { show: false },
    },
    series: [
      {
        type: "bar",
        data:
          snapshot?.topSizes.map((item, index) => ({
            value: item.value,
            itemStyle: {
              borderRadius: [0, 12, 12, 0],
              color: index % 2 === 0 ? "#5bbdf7" : "#51d3c3",
            },
          })) ?? [],
        barWidth: 18,
        label: { show: true, position: "right", color: "#ffffff", formatter: "{c}" },
      },
    ],
  } as const;

  if (!snapshot && !error) {
    return <div className="page-shell"><div className="loading-state">正在初始化管理员后台...</div></div>;
  }

  return (
    <>
      <BackButton fallbackHref="/visualize" />
      <div className="page-shell admin-shell pt-0 pb-10">
        <section className="admin-header">
          <div>
            <span className="eyebrow">Operations Cockpit / Admin Control</span>
            <h1>{snapshot?.overview.title ?? "管理员运营后台"}</h1>
            <p>{snapshot?.overview.description ?? "统一查看导入、告警、设备利用率与质量指标。"} </p>
          </div>
          <div className="admin-actions">
            <button type="button" onClick={() => router.push("/admin/data-import")}>
              数据导入
            </button>
            <button type="button" className="secondary" onClick={handleSync}>
              数据同步
            </button>
            <button type="button" className="danger" onClick={() => router.push("/admin/alerts")}>
              风险告警
            </button>
          </div>
        </section>

        {error ? <div className="empty-state"><span>!</span>{error}</div> : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {snapshot?.metrics.map((metric) => (
            <Card key={metric.label} className="admin-kpi-card" onClick={() => router.push(metric.label.includes("预警") ? "/admin/alerts" : "/admin")}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <div>
                <em className={`trend-${metric.trend}`}>{metric.delta}</em>
                <small>{metric.note}</small>
              </div>
            </Card>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Card className="chart-card xl:col-span-7">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">Operations Trend</span>
                <h2>检测量趋势</h2>
              </div>
            </div>
            <div className="chart-body">{snapshot ? <LineChart data={snapshot.trend} /> : <div className="loading-state">趋势加载中...</div>}</div>
          </Card>

          <Card className="chart-card xl:col-span-5">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">Quality Health</span>
                <h2>质量分布</h2>
              </div>
            </div>
            <div className="chart-body">{snapshot ? <PieChart title="质量分布" data={snapshot.quality} /> : <div className="loading-state">图表加载中...</div>}</div>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Card className="xl:col-span-6">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">Top Sizes</span>
                <h2>尺寸 Top5</h2>
              </div>
            </div>
            <div className="h-[320px]">
              <ReactECharts style={{ height: "100%", width: "100%" }} option={sizeOption} />
            </div>
          </Card>

          <Card className="xl:col-span-6">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">Device Utilization</span>
                <h2>设备利用率与状态</h2>
              </div>
            </div>
            <div className="device-stack">
              {snapshot?.devices.map((device) => (
                <div key={device.name} className="device-item">
                  <div className="device-item-top">
                    <strong>{device.name}</strong>
                    <span className={`status-chip ${device.status === "运行中" ? "status-success" : device.status === "维护中" ? "status-warning" : "status-danger"}`}>
                      {device.status}
                    </span>
                  </div>
                  <div className="device-gauge">
                    <span style={{ width: `${device.utilization}%` }} />
                  </div>
                  <div className="device-item-meta">
                    <span>利用率 {device.utilization}%</span>
                    <span>运行 {device.runtimeHours}h</span>
                    <span>{device.note}</span>
                  </div>
                </div>
              )) ?? <div className="loading-state">设备利用率加载中...</div>}
            </div>
          </Card>
        </section>

        <Card>
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Alert Dispatch</span>
              <h2>告警派发中心</h2>
            </div>
          </div>
          <div className="alert-stack">
            {snapshot?.alerts.map((alert) => (
              <div key={alert.id} className="alert-item">
                <div className="alert-level">{alert.level}</div>
                <div>
                  <strong>{alert.title}</strong>
                  <span>
                    {alert.station} · {alert.timestamp}
                  </span>
                  <p>{alert.detail}</p>
                </div>
              </div>
            )) ?? <div className="loading-state">告警派发加载中...</div>}
          </div>
        </Card>
      </div>

      {toast ? (
        <div className={`floating-toast ${toast.type === "success" ? "success" : "error"}`}>
          {toast.message}
        </div>
      ) : null}
    </>
  );
}
