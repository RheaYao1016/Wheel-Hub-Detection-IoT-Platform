"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import WorkflowSteps, {
  type WorkflowStep,
} from "../components/Layout/WorkflowSteps";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import ModelViewer from "../components/ThreeViewer/ModelViewer";
import { fetchPlatformData } from "@/lib/dashboard-client";
import { useSessionGuard } from "../hooks/useSessionGuard";
import type { DigitalTwinSnapshot, MonitorSnapshot } from "@/types/platform";
import { useLocale } from "../components/Locale/LocaleProvider";

export default function OperationsPage() {
  const ready = useSessionGuard(["admin", "user"]);
  const { text, t } = useLocale();
  const [monitor, setMonitor] = useState<MonitorSnapshot | null>(null);
  const [twin, setTwin] = useState<DigitalTwinSnapshot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const load = async () => {
      try {
        const [monitorData, twinData] = await Promise.all([
          fetchPlatformData<MonitorSnapshot>(
            "/dashboard/monitor",
            "/api/monitor",
          ),
          fetchPlatformData<DigitalTwinSnapshot>(
            "/dashboard/digital-twin",
            "/api/digital-twin",
          ),
        ]);
        if (!active) return;
        setMonitor(monitorData);
        setTwin(twinData);
        setError("");
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        setError(t("pages.operations.copy001"));
      }
    };

    load();
    const timer = window.setInterval(load, 15000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [ready, text]);

  const summaryCards = useMemo(() => {
    const onlineCameras =
      monitor?.cameras.filter((camera) => camera.status === "在线").length ?? 0;
    const highAlerts = monitor?.alerts.length ?? 0;
    const stableSensors =
      twin?.sensors.filter((sensor) => sensor.status === "正常").length ?? 0;
    const mappedDevices = twin?.devices.length ?? 0;

    return [
      {
        label: t("pages.operations.copy002"),
        value: `${onlineCameras}/${monitor?.cameras.length ?? 0}`,
        note: t("pages.operations.copy003"),
      },
      {
        label: t("pages.monitor.copy018"),
        value: `${highAlerts}`,
        note: t("pages.operations.copy004"),
      },
      {
        label: t("pages.operations.copy005"),
        value: `${stableSensors}/${twin?.sensors.length ?? 0}`,
        note: t("pages.operations.copy006"),
      },
      {
        label: t("pages.digital_twin.copy018"),
        value: `${mappedDevices}`,
        note: t("pages.operations.copy007"),
      },
    ];
  }, [monitor, twin, text]);

  const hasLoaded = Boolean(monitor && twin);

  const workflowSteps = useMemo<WorkflowStep[]>(() => {
    const alertCount = monitor?.alerts.length ?? 0;
    const sensorCount = twin?.sensors.length ?? 0;

    return [
      {
        id: "ops-overview",
        title: t("pages.operations.copy008"),
        detail: t("pages.operations.copy009"),
        state: hasLoaded ? "done" : "active",
      },
      {
        id: "ops-monitor",
        title: text("进入监控域", "Go to monitoring"),
        detail: alertCount
          ? text(
              `有 ${alertCount} 条告警待处理`,
              `${alertCount} alerts to inspect`,
            )
          : text("当前没有告警积压", "No alert backlog"),
        state: alertCount ? "active" : hasLoaded ? "done" : "upcoming",
      },
      {
        id: "ops-twin",
        title: text("进入数字孪生域", "Go to digital twin"),
        detail: sensorCount
          ? text(
              `已映射 ${sensorCount} 个传感器`,
              `${sensorCount} sensors mapped`,
            )
          : text("传感器映射待完成", "Sensor map pending"),
        state: sensorCount ? "active" : "upcoming",
      },
      {
        id: "ops-governance",
        title: t("pages.operations.copy010"),
        detail: t("pages.operations.copy011"),
        state: "upcoming",
      },
    ];
  }, [hasLoaded, monitor?.alerts.length, twin?.sensors.length, text]);

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/visualize"
        title={text("正在加载现场中台", "Loading Operations Hub")}
        description={text(
          "正在准备监控域与数字孪生域总览布局...",
          "Preparing monitoring and digital twin overview layout...",
        )}
      />
    );
  }

  return (
    <div className="enterprise-shell operations-shell">
      <BackButton fallbackHref="/visualize" />

      <WorkflowSteps
        title={text("现场中台流程", "Operations Flow")}
        subtitle={text(
          "先看中台总览，再按问题类型进入监控域或数字孪生域执行。",
          "Use one hub, then branch into monitor or digital twin for execution.",
        )}
        steps={workflowSteps}
      />

      <div className="quick-jump-strip">
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("ops-summary")}
        >
          {text("概览", "Summary")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("ops-domains")}
        >
          {text("域卡片", "Domain Cards")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("ops-governance")}
        >
          {text("治理规则", "Governance Rules")}
        </button>
      </div>

      <section className="enterprise-hero" id="ops-hero">
        <div>
          <span className="eyebrow">{text("现场中台", "Operations Hub")}</span>
          <h1>{text("监控域与数字孪生域的统一入口", "Unified entry for monitor and digital twin")}</h1>
          <p>
            {text(
              "本页用于明确边界与查看最新状态。视频墙、告警处置、三维场景操作与传感器映射等细节，仍保留在各自专业页面中，避免信息重复。",
              "This page defines boundaries and latest status. Detailed video walls, alert handling, 3D scene operations, and sensor maps remain in their dedicated domain pages to avoid duplicate information.",
            )}
          </p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>{text("监控通道", "Monitoring channels")}</span>
            <strong>
              {hasLoaded ? String(monitor?.cameras.length ?? 0) : "--"}
            </strong>
          </div>
          <div>
            <span>{text("孪生传感器", "Twin sensors")}</span>
            <strong>
              {hasLoaded ? String(twin?.sensors.length ?? 0) : "--"}
            </strong>
          </div>
          <div>
            <span>{text("已映射设备", "Mapped devices")}</span>
            <strong>
              {hasLoaded ? String(twin?.devices.length ?? 0) : "--"}
            </strong>
          </div>
        </div>
      </section>

      {error ? (
        <div className="empty-state">
          <span>!</span>
          {error}
        </div>
      ) : null}

      <section id="ops-summary" className="operations-summary-grid">
        {summaryCards.map((item) => (
          <Card key={item.label} className="operations-summary-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.note}</p>
          </Card>
        ))}
      </section>

      <section id="ops-domains" className="operations-grid">
        <Card className="operations-card">
          <div className="workspace-capability-top">
            <div>
              <span className="panel-kicker">
                {text("实时监控", "Live Monitoring")}
              </span>
              <h2>{text("监控域", "Monitoring domain")}</h2>
            </div>
            <span className="status-chip status-success">
              {hasLoaded
                ? text("视频 / 告警 / 巡检", "Video / Alerts / Patrol")
                : text("加载中", "Loading")}
            </span>
          </div>
          <div className="workspace-capability-meta">
            <div>
              <span>{text("设备数", "Devices")}</span>
              <strong>
                {hasLoaded ? String(monitor?.devices.length ?? 0) : "--"}
              </strong>
            </div>
            <div>
              <span>{text("最新告警", "Latest alerts")}</span>
              <strong>
                {hasLoaded ? String(monitor?.alerts.length ?? 0) : "--"}
              </strong>
            </div>
          </div>
          <div className="workspace-preview-list">
            {(monitor?.alerts ?? []).slice(0, 3).map((alert) => (
              <div key={alert.id} className="workspace-preview-item">
                <strong>{alert.title}</strong>
                <span>
                  {alert.station} / {alert.detail}
                </span>
              </div>
            ))}
          </div>
          <div className="enterprise-note-card">
            <strong>
              {text("实时处置动作保留在监控页面", "Keep real-time actions in monitoring page")}
            </strong>
            <span>
              {text(
                "视频墙、告警流和巡检动作应继续放在监控页执行，以保持现场处置聚焦。",
                "Camera walls, alert streams, and patrol actions should remain in monitoring page to preserve operational focus.",
              )}
            </span>
          </div>
          <div className="workspace-capability-actions">
            <Link href="/monitor" className="enterprise-primary-button">
              {text("打开监控详情", "Open Monitoring Details")}
            </Link>
          </div>
        </Card>

        <Card className="operations-card">
          <div className="workspace-capability-top">
            <div>
              <span className="panel-kicker">
                {text("数字孪生", "Digital Twin")}
              </span>
              <h2>{text("数字孪生域", "Digital twin domain")}</h2>
            </div>
            <span className="status-chip status-success">
              {hasLoaded
                ? text("三维 / 工艺 / 传感器", "3D / Process / Sensors")
                : text("加载中", "Loading")}
            </span>
          </div>
          <div className="operations-twin-stage">
            <ModelViewer />
          </div>
          <div className="workspace-capability-meta">
            <div>
              <span>{text("工艺步骤", "Process steps")}</span>
              <strong>
                {hasLoaded ? String(twin?.flowSteps.length ?? 0) : "--"}
              </strong>
            </div>
            <div>
              <span>{text("关键传感器", "Key sensors")}</span>
              <strong>
                {hasLoaded ? String(twin?.sensors.length ?? 0) : "--"}
              </strong>
            </div>
          </div>
          <div className="workspace-preview-list">
            {(twin?.sensors ?? []).slice(0, 3).map((sensor) => (
              <div key={sensor.label} className="workspace-preview-item">
                <strong>{sensor.label}</strong>
                <span>
                  {sensor.value}
                  {sensor.unit} / {sensor.status}
                </span>
              </div>
            ))}
          </div>
          <div className="workspace-capability-actions">
            <Link href="/digital-twin" className="enterprise-primary-button">
              {text("打开孪生详情", "Open Twin Details")}
            </Link>
          </div>
        </Card>
      </section>

      <section id="ops-governance" className="operations-grid">
        <Card className="operations-card">
          <div className="workspace-capability-top">
            <div>
              <span className="panel-kicker">{text("边界归属", "Ownership")}</span>
              <h2>{text("数据归属规则", "Data ownership rules")}</h2>
            </div>
          </div>
          <div className="enterprise-highlight-list">
            <div>
              <strong>
                {text("监控域负责即时响应", "Monitoring handles immediate response")}
              </strong>
              <p>
                {text(
                  "摄像头、告警流和现场巡检属于监控域，不应在其他页面重复承载。",
                  "Cameras, alert streams, and inspection patrol belong to monitoring and should not be duplicated elsewhere.",
                )}
              </p>
            </div>
            <div>
              <strong>
                {text(
                  "数字孪生域负责空间与工艺映射",
                  "Digital twin handles space and process mapping",
                )}
              </strong>
              <p>
                {text(
                  "三维布局、传感器点位和工艺流程属于数字孪生域，应集中维护在该域内。",
                  "3D layout, sensor points, and process flows belong to twin and should remain concentrated there.",
                )}
              </p>
            </div>
          </div>
        </Card>

        <Card className="operations-card">
          <div className="workspace-capability-top">
            <div>
              <span className="panel-kicker">{text("建议路径", "Suggested Flow")}</span>
              <h2>{text("推荐排查路径", "Recommended review path")}</h2>
            </div>
          </div>
          <div className="workspace-preview-list">
            <div className="workspace-preview-item">
              <strong>{text("先看指挥中心", "Start at command center")}</strong>
              <span>
                {text(
                  "先识别产能、质量或工单层面的异常。",
                  "Identify throughput, quality, or work-order anomalies.",
                )}
              </span>
            </div>
            <div className="workspace-preview-item">
              <strong>{text("再进入现场中台", "Then enter operations hub")}</strong>
              <span>
                {text(
                  "再根据问题类型选择进入监控域或数字孪生域。",
                  "Choose monitoring or digital twin based on issue type.",
                )}
              </span>
            </div>
            <div className="workspace-preview-item">
              <strong>{text("最后到运营后台闭环", "Close loop in admin")}</strong>
              <span>
                {text(
                  "在运营后台完成派发、导入治理、同步和策略动作的收口。",
                  "Use admin for assignment, import governance, sync, and policy actions.",
                )}
              </span>
            </div>
          </div>
          <div className="workspace-capability-actions">
            <Link href="/admin" className="enterprise-secondary-button">
              {text("前往运营治理", "Go to Admin Governance")}
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
