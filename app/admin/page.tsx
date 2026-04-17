"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import WorkflowSteps, {
  type WorkflowStep,
} from "../components/Layout/WorkflowSteps";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import {
  PlatformAuthError,
  fetchPlatformData,
  requestPlatformJson,
} from "@/lib/dashboard-client";
import { clearAuthSession } from "@/lib/auth-session";
import { useAdminGuard } from "./hooks/useAdminGuard";
import type { AdminSnapshot } from "@/types/platform";
import { useLocale } from "../components/Locale/LocaleProvider";

type ToastState = {
  message: string;
  type: "success" | "error";
};

const TOAST_DURATION = 2600;

export default function AdminDashboard() {
  const router = useRouter();
  const ready = useAdminGuard();
  const { text, t } = useLocale();
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [error, setError] = useState("");
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const load = async () => {
      try {
        const payload = await fetchPlatformData<AdminSnapshot>(
          "/dashboard/admin",
          "/api/admin",
        );
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
        setError(
          text(
            "运营后台数据暂时不可用，请稍后重试。",
            "Admin data is temporarily unavailable.",
          ),
        );
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
  }, [ready, router, text]);

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
      await requestPlatformJson<{ success?: boolean; message?: string }>(
        "/dashboard/sync",
        "/api/sync",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ triggeredAt: new Date().toISOString() }),
        },
      );
      showToast(text("平台同步已完成。", "Platform sync completed."), "success");
    } catch (requestError) {
      if (requestError instanceof PlatformAuthError) {
        clearAuthSession();
        router.replace("/login");
        return;
      }
      console.error(requestError);
      showToast(text("同步失败，请重试。", "Sync failed. Please retry."), "error");
    }
  }, [router, showToast, text]);

  const governanceCards = useMemo(() => {
    if (!snapshot) return [];

    const queuedAlerts = snapshot.alerts.length;
    const maintenanceDevices = snapshot.devices.filter((device) =>
      String(device.status).toLowerCase().includes("maint"),
    ).length;
    const watchMetrics = snapshot.metrics.filter(
      (metric) => metric.trend !== "up",
    ).length;

    return [
      {
        label: t("pages.admin.copy001"),
        value: `${queuedAlerts}`,
        note: t("pages.admin.copy002"),
      },
      {
        label: t("pages.admin.copy003"),
        value: `${maintenanceDevices}`,
        note: t("pages.admin.copy004"),
      },
      {
        label: t("pages.admin.copy005"),
        value: `${watchMetrics}`,
        note: t("pages.admin.copy006"),
      },
    ];
  }, [snapshot, text]);

  const workflowSteps = useMemo<WorkflowStep[]>(() => {
    const queuedAlerts = snapshot?.alerts.length ?? 0;
    const hasSyncPressure =
      snapshot?.metrics.some((metric) => metric.trend !== "up") ?? false;

    return [
      {
        id: "admin-overview",
        title: t("pages.admin.copy007"),
        detail: t("pages.admin.copy008"),
        state: "active",
      },
      {
        id: "admin-alerts",
        title: t("pages.admin.copy009"),
        detail: queuedAlerts
          ? t("pages.admin.copy010", { p1: queuedAlerts })
          : t("pages.admin.copy011"),
        state: queuedAlerts ? "active" : "done",
        onClick: () => router.push("/admin/alerts"),
      },
      {
        id: "admin-import",
        title: t("pages.admin.copy012"),
        detail: t("pages.admin.copy013"),
        state: "upcoming",
        onClick: () => router.push("/admin/data-import"),
      },
      {
        id: "admin-sync",
        title: t("pages.admin.copy014"),
        detail: hasSyncPressure
          ? t("pages.admin.copy015")
          : t("pages.admin.copy016"),
        state: hasSyncPressure ? "active" : "upcoming",
      },
    ];
  }, [router, snapshot, text]);

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!snapshot && !error) {
    if (!ready) {
      return (
        <PageLoadFallback
          fallbackHref="/visualize"
          title={text("正在加载运营后台", "Loading Admin Console")}
          description={text(
            "正在准备治理、告警与导入管理布局...",
            "Preparing governance, alerts, and import management layout...",
          )}
        />
      );
    }

    return (
      <div className="page-shell">
        <div className="loading-state">
          {text("正在加载运营后台...", "Loading admin console...")}
        </div>
      </div>
    );
  }

  return (
    <>
      <BackButton fallbackHref="/visualize" />
      <div className="page-shell admin-shell pt-0 pb-10">
        <WorkflowSteps
          title={text("运营后台流程", "Admin Flow")}
          subtitle={text(
            "按此顺序执行治理动作，可保持现场运营稳定。",
            "Run governance in this order to keep operations stable.",
          )}
          steps={workflowSteps}
        />

        <div className="quick-jump-strip">
          <button
            type="button"
            className="enterprise-secondary-button"
            onClick={() => scrollToSection("admin-governance")}
        >
            {text("治理重点", "Governance Focus")}
          </button>
          <button
            type="button"
            className="enterprise-secondary-button"
            onClick={() => scrollToSection("admin-alert-feed")}
        >
            {text("告警队列", "Alert Feed")}
          </button>
          <button
            type="button"
            className="enterprise-secondary-button"
            onClick={() => router.push("/admin/data-import")}
        >
            {text("打开数据导入", "Open Data Import")}
          </button>
        </div>

        <section className="admin-header">
          <div>
            <span className="eyebrow">
              {text("运营驾驶舱 / 后台控制", "Operations Cockpit / Admin Control")}
            </span>
            <h1>{snapshot?.overview.title ?? text("运营后台", "Admin Console")}</h1>
            <p>
              {snapshot?.overview.description ??
                text(
                  "在统一控制面中完成治理动作、数据运营与告警路由。",
                  "Manage governance actions, data operations, and alert routing from one control surface.",
                )}
            </p>
          </div>
          <div className="admin-actions">
            <button
              type="button"
              onClick={() => router.push("/admin/data-import")}
            >
              {text("数据导入", "Data Import")}
            </button>
            <button type="button" className="secondary" onClick={handleSync}>
              {text("同步平台", "Sync Platform")}
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => router.push("/admin/alerts")}
            >
              {text("告警中心", "Alert Center")}
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
              onClick={() =>
                router.push(
                  metric.label.includes("alert") || metric.label.includes("警")
                    ? "/admin/alerts"
                    : "/admin",
                )
              }
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
          <Card id="admin-governance" className="xl:col-span-5">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">
                  {text("治理重点", "Governance Focus")}
                </span>
                <h2>
                  {text(
                    "运营治理优先事项",
                    "Operational governance priorities",
                  )}
                </h2>
              </div>
            </div>
            <div className="enterprise-highlight-list">
              {governanceCards.map((item) => (
                <div key={item.label}>
                  <strong>
                    {item.label} / {item.value}
                  </strong>
                  <p>{item.note}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card id="admin-routing" className="xl:col-span-7">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">
                  {text("动作路由", "Action Routing")}
                </span>
                <h2>{text("控制路由图", "Control routing map")}</h2>
              </div>
            </div>
            <div className="enterprise-highlight-list">
              <div>
                <strong>{text("导入与数据治理", "Import and data governance")}</strong>
                <p>
                  {text(
                    "上传流程、导入历史和字段校验统一放在“数据导入”模块中，避免跨页面重复操作。",
                    "Upload pipelines, import history, and field validation stay in Data Import to avoid repeated operations across pages.",
                  )}
                </p>
              </div>
              <div>
                <strong>{text("告警派发与闭环", "Alert dispatch and closure")}</strong>
                <p>
                  {text(
                    "告警确认与派发应在告警中心完成，监控页面则继续专注于实时可视与现场响应。",
                    "Alert acknowledgement and dispatch should run in the alert center, while monitoring pages remain focused on real-time visibility.",
                  )}
                </p>
              </div>
              <div>
                <strong>{text("角色与责任", "Role and accountability")}</strong>
                <p>
                  {text(
                    "保持职责边界清晰：本页负责统筹决策，执行页面负责提供上下文与证据。",
                    "Keep ownership explicit: this page orchestrates decisions, while execution pages provide context and evidence.",
                  )}
                </p>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Card id="admin-alert-feed" className="xl:col-span-6">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">
                  {text("优先告警", "Priority Alerts")}
                </span>
                <h2>{text("待处理告警队列", "Pending alert queue")}</h2>
              </div>
            </div>
            <div className="alert-stack">
              {snapshot?.alerts.map((alert) => (
                <div key={alert.id} className="alert-item">
                  <div className="alert-level">{alert.level}</div>
                  <div>
                    <strong>{alert.title}</strong>
                    <span>
                      {alert.station} / {alert.timestamp}
                    </span>
                    <p>{alert.detail}</p>
                  </div>
                </div>
              )) ?? (
                <div className="loading-state">
                  {text("正在加载告警...", "Loading alerts...")}
                </div>
              )}
            </div>
          </Card>

          <Card id="admin-resource-watch" className="xl:col-span-6">
            <div className="panel-heading">
              <div>
                <span className="panel-kicker">
                  {text("资源观察", "Resource Watch")}
                </span>
                <h2>{text("设备与产能状态", "Device and capacity status")}</h2>
              </div>
            </div>
            <div className="device-stack">
              {snapshot?.devices.map((device) => (
                <div key={device.name} className="device-item">
                  <div className="device-item-top">
                    <strong>{device.name}</strong>
                    <span
                      className={`status-chip ${
                        String(device.status).toLowerCase().includes("run")
                          ? "status-success"
                          : String(device.status)
                                .toLowerCase()
                                .includes("maint")
                            ? "status-warning"
                            : "status-danger"
                      }`}
                    >
                      {device.status}
                    </span>
                  </div>
                  <div className="device-gauge">
                    <span style={{ width: `${device.utilization}%` }} />
                  </div>
                  <div className="device-item-meta">
                    <span>
                      {text("利用率", "Utilization")} {device.utilization}%
                    </span>
                    <span>
                      {text("运行时长", "Runtime")} {device.runtimeHours}h
                    </span>
                    <span>{device.note}</span>
                  </div>
                </div>
              )) ?? (
                <div className="loading-state">
                  {text("正在加载设备...", "Loading devices...")}
                </div>
              )}
            </div>
          </Card>
        </section>
      </div>

      {toast ? (
        <div
          className={`floating-toast ${toast.type === "success" ? "success" : "error"}`}
        >
          {toast.message}
        </div>
      ) : null}
    </>
  );
}
