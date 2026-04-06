"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import { PlatformAuthError, fetchPlatformData, requestPlatformJson } from "@/lib/dashboard-client";
import { clearAuthSession } from "@/lib/auth-session";
import { useAdminGuard } from "./hooks/useAdminGuard";
import type { AdminSnapshot } from "@/types/platform";

type ToastState = {
  message: string;
  type: "success" | "error";
};

const TOAST_DURATION = 2600;

export default function AdminDashboard() {
  const router = useRouter();
  const ready = useAdminGuard();
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [error, setError] = useState("");
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const load = async () => {
      try {
        const payload = await fetchPlatformData<AdminSnapshot>("/dashboard/admin", "/api/admin");
        if (!active) return;
        setSnapshot(payload);
        setError("");
      } catch (requestError) {
        if (!active) return;
        if (requestError instanceof PlatformAuthError) {
          clearAuthSession();
          router.replace("/login");
          return;
        }
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
  }, [ready, router]);

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
      await requestPlatformJson<{ success?: boolean; message?: string }>("/dashboard/sync", "/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggeredAt: new Date().toISOString() }),
      });
      showToast("数据同步完成", "success");
    } catch (requestError) {
      if (requestError instanceof PlatformAuthError) {
        clearAuthSession();
        router.replace("/login");
        return;
      }
      console.error(requestError);
      showToast("同步过程中发生异常", "error");
    }
  }, [router, showToast]);

  const governanceCards = useMemo(() => {
    if (!snapshot) return [];

    const highAlerts = snapshot.alerts.filter((alert) => alert.level === "高").length;
    const maintenanceDevices = snapshot.devices.filter((device) => device.status === "维护中").length;
    const stableMetrics = snapshot.metrics.filter((metric) => metric.trend === "stable").length;

    return [
      { label: "高优先告警", value: `${highAlerts}`, note: "建议前往告警页完成派发和闭环" },
      { label: "维护窗口设备", value: `${maintenanceDevices}`, note: "用于安排保养、巡检与节拍腾挪" },
      { label: "需管理跟进项", value: `${stableMetrics}`, note: "适合作为班前会和日报汇总入口" },
    ];
  }, [snapshot]);

  if (!snapshot && !error) {
    if (!ready) {
      return (
        <PageLoadFallback
          fallbackHref="/visualize"
          title="Loading Admin Console"
          description="Preparing governance, alerts, and import management layout..."
        />
      );
    }

    return (
      <div className="page-shell">
        <div className="loading-state">正在初始化管理员后台...</div>
      </div>
    );
  }

  return (
    <>
      <BackButton fallbackHref="/visualize" />
      <div className="page-shell admin-shell pt-0 pb-10">
        <section className="admin-header">
          <div>
            <span className="eyebrow">Operations Cockpit / Admin Control</span>
            <h1>{snapshot?.overview.title ?? "运营后台"}</h1>
            <p>{snapshot?.overview.description ?? "聚焦管理动作、数据治理和异常调度，不重复占用现场看板的信息位置。"}</p>
          </div>
          <div className="admin-actions">
            <button type="button" onClick={() => router.push("/admin/data-import")}>
              导入管理
            </button>
            <button type="button" className="secondary" onClick={handleSync}>
              数据同步
            </button>
            <button type="button" className="danger" onClick={() => router.push("/admin/alerts")}>
              风险告警
            </button>
          </div>
        </section>

        {error ? (
          <div className="empty-state">
            <span>!</span>
            {error}
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {snapshot?.metrics.map((metric) => (
            <Card
              key={metric.label}
              className="admin-kpi-card"
              onClick={() => router.push(metric.label.includes("预警") ? "/admin/alerts" : "/admin")}
            >
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
          <Card className="xl:col-span-5">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">Governance Focus</span>
                <h2>后台治理重点</h2>
              </div>
            </div>
            <div className="enterprise-highlight-list">
              {governanceCards.map((item) => (
                <div key={item.label}>
                  <strong>
                    {item.label} · {item.value}
                  </strong>
                  <p>{item.note}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="xl:col-span-7">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">Action Routing</span>
                <h2>管理动作分发台</h2>
              </div>
            </div>
            <div className="enterprise-highlight-list">
              <div>
                <strong>导入与数据治理</strong>
                <p>数据上传、导入记录和字段治理统一进入导入管理页，避免在多个页面重复展示相同批次信息。</p>
              </div>
              <div>
                <strong>异常派发与闭环</strong>
                <p>高优先告警统一由后台完成指派、追踪和闭环；现场页只做感知，不承担管理动作。</p>
              </div>
              <div>
                <strong>角色与权限管理</strong>
                <p>后台侧强调动作入口和责任归属，适合管理员做日常运营编排和数据同步确认。</p>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Card className="xl:col-span-6">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">Priority Alerts</span>
                <h2>待管理告警</h2>
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
              )) ?? <div className="loading-state">告警派发列表加载中...</div>}
            </div>
          </Card>

          <Card className="xl:col-span-6">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">Resource Watch</span>
                <h2>资源与设备安排</h2>
              </div>
            </div>
            <div className="device-stack">
              {snapshot?.devices.map((device) => (
                <div key={device.name} className="device-item">
                  <div className="device-item-top">
                    <strong>{device.name}</strong>
                    <span
                      className={`status-chip ${
                        device.status === "运行中" ? "status-success" : device.status === "维护中" ? "status-warning" : "status-danger"
                      }`}
                    >
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
              )) ?? <div className="loading-state">资源状态加载中...</div>}
            </div>
          </Card>
        </section>
      </div>

      {toast ? <div className={`floating-toast ${toast.type === "success" ? "success" : "error"}`}>{toast.message}</div> : null}
    </>
  );
}
