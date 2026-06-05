"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import WorkflowSteps, {
  type WorkflowStep,
} from "../components/Layout/WorkflowSteps";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import dynamic from "next/dynamic";
const ModelViewer = dynamic(() => import("../components/ThreeViewer/ModelViewer"), { ssr: false, loading: () => <div className="model-viewer-container"><div className="model-viewer-loading" role="status"><div className="model-viewer-spinner" /><span>加载3D模型中...</span></div></div> });
import { PlatformAuthError, fetchPlatformData } from "@/lib/dashboard-client";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
import type { DigitalTwinSnapshot, MonitorSnapshot } from "@/types/platform";

// ---------------------------------------------------------------------------
// Status resolution helpers (locale-aware)
// ---------------------------------------------------------------------------

/** Resolve camera status color based on canonical status values */
function resolveCameraStatus(status: string): "online" | "standby" | "offline" {
  const normalized = status.toLowerCase();
  if (normalized.includes("online") || normalized === "在线") return "online";
  if (normalized.includes("standby") || normalized.includes("待命") || normalized.includes("待机")) return "standby";
  return "offline";
}

/** Resolve sensor status color based on canonical status values */
function resolveSensorStatus(status: string): "good" | "warn" | "danger" {
  const normalized = status.toLowerCase();
  if (
    normalized.includes("warning") ||
    normalized.includes("alert") ||
    normalized.includes("risk") ||
    normalized.includes("预警")
  ) {
    return "danger";
  }
  if (normalized.includes("关注") || normalized.includes("attention")) return "warn";
  return "good";
}

/** Format relative time string for "last updated" display */
function formatLastUpdated(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 5000) return "just now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(timestamp).toLocaleTimeString();
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function OperationsPage() {
  const ready = useSessionGuard(["admin", "user"]);
  const { t, text } = useLocale();

  // Data state
  const [monitor, setMonitor] = useState<MonitorSnapshot | null>(null);
  const [twin, setTwin] = useState<DigitalTwinSnapshot | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [refreshCount, setRefreshCount] = useState(0);

  // Display state
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Update elapsed time display every second
  useEffect(() => {
    if (!lastUpdated) return;
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - lastUpdated);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lastUpdated]);

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------

  const loadSnapshot = useCallback(async () => {
    setIsLoading(true);
    try {
      const [monitorData, twinData] = await Promise.all([
        fetchPlatformData<MonitorSnapshot>("/dashboard/monitor", "/api/monitor"),
        fetchPlatformData<DigitalTwinSnapshot>(
          "/dashboard/digital-twin",
          "/api/digital-twin",
        ),
      ]);
      setMonitor(monitorData);
      setTwin(twinData);
      setError("");
      setLastUpdated(Date.now());
    } catch (loadError) {
      if (loadError instanceof PlatformAuthError) {
        // Auth errors should bubble up and redirect
        throw loadError;
      }
      console.error("[Operations] Data load failed:", loadError);
      setError(t("pages.operations.copy001"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Initial load + auto-refresh interval
  useEffect(() => {
    if (!ready) return;

    let active = true;

    const load = async () => {
      try {
        await loadSnapshot();
      } catch {
        if (!active) return;
        // Already handled in loadSnapshot
      }
    };

    load();

    // Auto-refresh every 15 seconds
    const timer = window.setInterval(load, 15000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [ready, loadSnapshot]);

  // Manual refresh
  const handleManualRefresh = useCallback(() => {
    setRefreshCount((c) => c + 1);
    loadSnapshot();
  }, [loadSnapshot]);

  // -----------------------------------------------------------------------
  // Computed data
  // -----------------------------------------------------------------------

  const onlineCameras = useMemo(
    () =>
      monitor?.cameras.filter(
        (camera) => resolveCameraStatus(camera.status) === "online",
      ).length ?? 0,
    [monitor],
  );

  const totalCameras = monitor?.cameras.length ?? 0;

  const highAlerts = monitor?.alerts.length ?? 0;

  const stableSensors = useMemo(
    () =>
      twin?.sensors.filter(
        (sensor) => resolveSensorStatus(sensor.status) === "good",
      ).length ?? 0,
    [twin],
  );

  const totalSensors = twin?.sensors.length ?? 0;

  const mappedDevices = twin?.devices.length ?? 0;

  const hasLoaded = Boolean(monitor && twin);

  // Summary cards
  const summaryCards = useMemo(() => {
    return [
      {
        label: t("pages.operations.copy002"),
        value: `${onlineCameras}/${totalCameras}`,
        note: t("pages.operations.copy003"),
        status: "online" as const,
      },
      {
        label: t("pages.monitor.copy018"),
        value: `${highAlerts}`,
        note: t("pages.operations.copy004"),
        status: highAlerts > 0 ? ("danger" as const) : ("success" as const),
      },
      {
        label: t("pages.operations.copy005"),
        value: `${stableSensors}/${totalSensors}`,
        note: t("pages.operations.copy006"),
        status: "success" as const,
      },
      {
        label: t("pages.digital_twin.copy018"),
        value: `${mappedDevices}`,
        note: t("pages.operations.copy007"),
        status: "info" as const,
      },
    ];
  }, [onlineCameras, totalCameras, highAlerts, stableSensors, totalSensors, mappedDevices, t]);

  // Workflow steps
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
        title: t("pages.home.copy025"),
        detail: alertCount
          ? text(
              `有 ${alertCount} 条告警待处理`,
              `${alertCount} alerts to inspect`,
            )
          : t("pages.operations.noAlertsBacklog"),
        state: alertCount ? "active" : hasLoaded ? "done" : "upcoming",
      },
      {
        id: "ops-twin",
        title: t("pages.home.copy026"),
        detail: sensorCount
          ? text(
              `已映射 ${sensorCount} 个传感器`,
              `${sensorCount} sensors mapped`,
            )
          : t("pages.operations.sensorMapPending"),
        state: sensorCount ? "active" : "upcoming",
      },
      {
        id: "ops-governance",
        title: t("pages.operations.copy010"),
        detail: t("pages.operations.copy011"),
        state: "upcoming",
      },
    ];
  }, [hasLoaded, monitor?.alerts.length, twin?.sensors.length, t, text]);

  // Scroll helper
  const scrollToSection = useCallback((id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/visualize"
        title={t("pages.operations.loading")}
        description={t("pages.operations.loadingDesc")}
      />
    );
  }

  return (
    <div className="enterprise-shell operations-shell">
      {/* Top bar with back button and refresh */}
      <div className="operations-top-bar">
        <BackButton fallbackHref="/visualize" />
        <div className="operations-top-bar-right">
          {lastUpdated > 0 && (
            <span className="operations-last-updated">
              {t("pages.operations.lastUpdated")} {formatLastUpdated(lastUpdated)}
            </span>
          )}
          <button
            type="button"
            className="enterprise-secondary-button operations-refresh-button"
            onClick={handleManualRefresh}
            disabled={isLoading}
            title={t("common.refresh")}
          >
            <span className={isLoading ? "refresh-spin" : ""}>↻</span>
          </button>
        </div>
      </div>

      {/* Workflow Steps */}
      <WorkflowSteps
        title={t("pages.operations.flowTitle")}
        subtitle={t("pages.operations.flowSubtitle")}
        steps={workflowSteps}
      />

      {/* Quick jump strip */}
      <div className="quick-jump-strip">
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("ops-summary")}
        >
          {t("pages.operations.quickJumpSummary")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("ops-domains")}
        >
          {t("pages.operations.quickJumpDomains")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("ops-governance")}
        >
          {t("pages.operations.quickJumpGovernance")}
        </button>
      </div>

      {/* Hero section */}
      <section className="enterprise-hero" id="ops-hero">
        <div>
          <span className="eyebrow">{t("pages.operations.heroTitle")}</span>
          <h1>{t("pages.operations.heroHeading")}</h1>
          <p>{t("pages.operations.heroDesc")}</p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>{t("pages.operations.monitoringChannels")}</span>
            <strong>
              {hasLoaded ? String(totalCameras) : "--"}
            </strong>
          </div>
          <div>
            <span>{t("pages.operations.twinSensors")}</span>
            <strong>
              {hasLoaded ? String(totalSensors) : "--"}
            </strong>
          </div>
          <div>
            <span>{t("pages.operations.mappedDevices")}</span>
            <strong>
              {hasLoaded ? String(mappedDevices) : "--"}
            </strong>
          </div>
        </div>
      </section>

      {/* Error state */}
      {error ? (
        <div className="empty-state error-state">
          <span className="error-icon">!</span>
          <p>{error}</p>
          <button
            type="button"
            className="enterprise-primary-button"
            onClick={handleManualRefresh}
          >
            {t("common.refresh")}
          </button>
        </div>
      ) : null}

      {/* Summary cards */}
      <section id="ops-summary" className="operations-summary-grid">
        {summaryCards.map((item, index) => (
          <Card key={`${item.label}-${index}`} className="operations-summary-card">
            <div className="operations-summary-card-header">
              <span>{item.label}</span>
              <span className={`operations-status-dot operations-status-${item.status}`} />
            </div>
            <strong className="operations-summary-card-value">{item.value}</strong>
            <p>{item.note}</p>
          </Card>
        ))}
      </section>

      {/* Domain cards */}
      <section id="ops-domains" className="operations-grid">
        {/* Monitoring Domain Card */}
        <Card className="operations-card">
          <div className="workspace-capability-top">
            <div>
              <span className="panel-kicker">
                {t("pages.operations.monitoringDomain")}
              </span>
              <h2>{t("pages.operations.monitoringDomain")}</h2>
            </div>
            <span
              className={`status-chip ${
                highAlerts > 0 ? "status-danger" : "status-success"
              }`}
            >
              {hasLoaded
                ? t("pages.operations.monitoringContent")
                : t("pages.operations.loadingLabel")}
            </span>
          </div>
          <div className="workspace-capability-meta">
            <div>
              <span>{t("pages.operations.devices")}</span>
              <strong>{hasLoaded ? String(monitor?.devices.length ?? 0) : "--"}</strong>
            </div>
            <div>
              <span>{t("pages.operations.latestAlerts")}</span>
              <strong>{hasLoaded ? String(highAlerts) : "--"}</strong>
            </div>
          </div>

          {/* Alert preview list */}
          <div className="workspace-preview-list">
            {hasLoaded && (monitor?.alerts ?? []).length > 0 ? (
              (monitor?.alerts ?? []).slice(0, 3).map((alert) => (
                <div key={alert.id} className="workspace-preview-item">
                  <strong>{alert.title}</strong>
                  <span>
                    {alert.station} / {alert.detail}
                  </span>
                </div>
              ))
            ) : (
              <div className="workspace-preview-item workspace-preview-empty">
                <span>{t("pages.operations.noAlertsBacklog")}</span>
              </div>
            )}
          </div>

          <div className="enterprise-note-card">
            <strong>{t("pages.operations.keepRealTimeActions")}</strong>
            <span>{t("pages.operations.realTimeActionsDesc")}</span>
          </div>
          <div className="workspace-capability-actions">
            <Link href="/monitor" className="enterprise-primary-button">
              {t("pages.operations.openMonitorDetails")}
            </Link>
          </div>
        </Card>

        {/* Digital Twin Domain Card */}
        <Card className="operations-card">
          <div className="workspace-capability-top">
            <div>
              <span className="panel-kicker">
                {t("pages.digital_twin.copy002")}
              </span>
              <h2>{t("pages.operations.digitalTwinDomain")}</h2>
            </div>
            <span className="status-chip status-success">
              {hasLoaded
                ? t("pages.operations.twinContent")
                : t("pages.operations.loadingLabel")}
            </span>
          </div>

          {/* 3D Model viewer stage */}
          <div className="operations-twin-stage">
            {hasLoaded ? (
              <ModelViewer />
            ) : (
              <div className="operations-twin-loading">
                <div className="loading-spinner" />
                <span>{t("pages.operations.loadingLabel")}</span>
              </div>
            )}
          </div>

          <div className="workspace-capability-meta">
            <div>
              <span>{t("pages.operations.processSteps")}</span>
              <strong>{hasLoaded ? String(twin?.flowSteps.length ?? 0) : "--"}</strong>
            </div>
            <div>
              <span>{t("pages.operations.keySensors")}</span>
              <strong>{hasLoaded ? String(totalSensors) : "--"}</strong>
            </div>
          </div>

          {/* Sensor preview list */}
          <div className="workspace-preview-list">
            {hasLoaded && (twin?.sensors ?? []).length > 0 ? (
              (twin?.sensors ?? []).slice(0, 3).map((sensor) => {
                const sensorStatus = resolveSensorStatus(sensor.status);
                return (
                  <div key={sensor.label} className="workspace-preview-item">
                    <div className="workspace-preview-item-header">
                      <strong>{sensor.label}</strong>
                      <span
                        className={`operations-sensor-badge operations-sensor-${sensorStatus}`}
                      >
                        {sensor.status}
                      </span>
                    </div>
                    <span>
                      {sensor.value}
                      {sensor.unit}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="workspace-preview-item workspace-preview-empty">
                <span>{t("pages.operations.sensorMapPending")}</span>
              </div>
            )}
          </div>
          <div className="workspace-capability-actions">
            <Link href="/digital-twin" className="enterprise-primary-button">
              {t("pages.operations.openTwinDetails")}
            </Link>
          </div>
        </Card>
      </section>

      {/* Governance section */}
      <section id="ops-governance" className="operations-grid">
        <Card className="operations-card">
          <div className="workspace-capability-top">
            <div>
              <span className="panel-kicker">{t("pages.operations.ownership")}</span>
              <h2>{t("pages.operations.dataOwnershipRules")}</h2>
            </div>
          </div>
          <div className="enterprise-highlight-list">
            <div>
              <strong>{t("pages.operations.monitoringResponse")}</strong>
              <p>{t("pages.operations.monitoringResponseDesc")}</p>
            </div>
            <div>
              <strong>{t("pages.operations.twinSpaceProcess")}</strong>
              <p>{t("pages.operations.twinSpaceProcessDesc")}</p>
            </div>
          </div>
        </Card>

        <Card className="operations-card">
          <div className="workspace-capability-top">
            <div>
              <span className="panel-kicker">{t("pages.operations.suggestedFlow")}</span>
              <h2>{t("pages.operations.recommendedPath")}</h2>
            </div>
          </div>
          <div className="workspace-preview-list">
            <div className="workspace-preview-item">
              <strong>{t("pages.operations.startCommandCenter")}</strong>
              <span>{t("pages.operations.startCommandCenterDesc")}</span>
            </div>
            <div className="workspace-preview-item">
              <strong>{t("pages.operations.enterOperationsHub")}</strong>
              <span>{t("pages.operations.enterOperationsHubDesc")}</span>
            </div>
            <div className="workspace-preview-item">
              <strong>{t("pages.operations.closeLoopAdmin")}</strong>
              <span>{t("pages.operations.closeLoopAdminDesc")}</span>
            </div>
          </div>
          <div className="workspace-capability-actions">
            <Link href="/admin" className="enterprise-secondary-button">
              {t("pages.operations.goToAdminGovernance")}
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
