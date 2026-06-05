"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import WorkflowSteps, {
  type WorkflowStep,
} from "../components/Layout/WorkflowSteps";
import CoreFlowHeader, {
  type CoreFlowMetric,
  type CoreFlowStage,
} from "../components/Layout/CoreFlowHeader";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import { PlatformAuthError, fetchPlatformData } from "@/lib/dashboard-client";
import { clearAuthSession } from "@/lib/auth-session";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
import type { MonitorSnapshot, AlertSnapshot } from "@/types/platform";

// -- Color tone helpers --

function resolveAlertTone(level: string, index: number) {
  const normalized = level.toLowerCase();
  if (
    normalized.includes("critical") ||
    normalized.includes("high") ||
    normalized.includes("p1") ||
    normalized.includes("高")
  ) {
    return "status-danger";
  }
  if (
    normalized.includes("low") ||
    normalized.includes("p3") ||
    normalized.includes("低")
  ) {
    return "status-success";
  }
  if (index === 0) {
    return "status-danger";
  }
  return "status-warning";
}

function resolveDeviceTone(temperature: number) {
  if (temperature >= 68) return "status-danger";
  if (temperature >= 58) return "status-warning";
  return "status-success";
}

function resolveAlertIcon(level: string): string {
  const normalized = level.toLowerCase();
  if (
    normalized.includes("critical") ||
    normalized.includes("high") ||
    normalized.includes("p1") ||
    normalized.includes("高")
  ) {
    return "⚠";
  }
  if (
    normalized.includes("low") ||
    normalized.includes("p3") ||
    normalized.includes("低")
  ) {
    return "ℹ";
  }
  return "⚡";
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  if (isNaN(diffMs) || diffMs < 0) return timestamp;

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) {
    return `${diffSec}秒前`;
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin}分钟前`;
  }
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr}小时前`;
  }
  return timestamp;
}

// -- Skeleton loader component --

function AlertSkeleton() {
  return (
    <div className="alert-item" aria-busy="true">
      <div className="alert-level status-chip status-warning" style={{ opacity: 0.4 }}>
        ---
      </div>
      <div style={{ opacity: 0.4 }}>
        <strong className="skeleton-text" style={{ width: "60%" }}>&nbsp;</strong>
        <span className="skeleton-text" style={{ width: "40%" }}>&nbsp;</span>
        <p className="skeleton-text" style={{ width: "80%" }}>&nbsp;</p>
      </div>
    </div>
  );
}

function DeviceSkeleton() {
  return (
    <div className="device-item" aria-busy="true" style={{ opacity: 0.4 }}>
      <div className="device-item-top">
        <strong className="skeleton-text" style={{ width: "50%" }}>&nbsp;</strong>
        <span className="status-chip status-warning">&nbsp;</span>
      </div>
      <div className="device-gauge">
        <span style={{ width: "0%" }} />
      </div>
      <div className="device-item-meta">
        <span className="skeleton-text" style={{ width: "30%" }}>&nbsp;</span>
        <span className="skeleton-text" style={{ width: "25%" }}>&nbsp;</span>
      </div>
    </div>
  );
}

function CameraSkeleton() {
  return (
    <div className="camera-card" aria-busy="true">
      <div
        style={{
          width: "100%",
          height: "100%",
          minHeight: "16rem",
          background:
            "linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 75%)",
          backgroundSize: "200% 100%",
          animation: "skeletonShimmer 1.5s ease-in-out infinite",
        }}
      />
      <div className="camera-overlay">
        <div>
          <strong className="skeleton-text" style={{ width: "80px" }}>&nbsp;</strong>
          <span className="skeleton-text" style={{ width: "60px" }}>&nbsp;</span>
        </div>
        <button type="button" disabled style={{ opacity: 0.5 }}>
          ---
        </button>
      </div>
    </div>
  );
}

// -- Main page component --

export default function MonitorPage() {
  const router = useRouter();
  const ready = useSessionGuard(["admin", "user"]);
  const { text, t } = useLocale();
  const [snapshot, setSnapshot] = useState<MonitorSnapshot | null>(null);
  const [error, setError] = useState("");
  const [cameraToast, setCameraToast] = useState<string | null>(null);
  const [openedPreviews, setOpenedPreviews] = useState<Record<number, true>>({});
  const [activeAlertLevel, setActiveAlertLevel] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);
  const activeStreamsRef = useRef<Map<number, MediaStream>>(new Map());

  // Data loading
  const loadData = useCallback(async () => {
    try {
      const payload = await fetchPlatformData<MonitorSnapshot>(
        "/dashboard/monitor",
        "/api/monitor",
      );
      setSnapshot(payload);
      setError("");
      setIsLoading(false);
      setLastUpdated(new Date());
      setUpdateCount((prev) => prev + 1);
    } catch (requestError) {
      if (requestError instanceof PlatformAuthError) {
        clearAuthSession();
        router.replace("/login");
        return;
      }
      console.error(requestError);
      setError(t("pages.monitor.copy001"));
      setIsLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    if (!ready) return;

    let active = true;
    const currentStreams = activeStreamsRef.current;

    const load = async () => {
      await loadData();
    };

    load().catch(console.error);
    const timer = window.setInterval(load, 12000);

    return () => {
      active = false;
      window.clearInterval(timer);
      currentStreams.forEach((stream) => {
        stream.getTracks().forEach((track) => track.stop());
      });
      currentStreams.clear();
    };
  }, [ready, loadData]);

  // Camera toast auto-dismiss
  useEffect(() => {
    if (!cameraToast) return;
    const timer = window.setTimeout(() => setCameraToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [cameraToast]);

  // Alert level filter options
  const alertLevels = useMemo(() => {
    const levels = new Set<string>();
    snapshot?.alerts.forEach((alert) => levels.add(alert.level));
    return ["all", ...Array.from(levels)];
  }, [snapshot]);

  useEffect(() => {
    if (!alertLevels.includes(activeAlertLevel)) {
      setActiveAlertLevel("all");
    }
  }, [activeAlertLevel, alertLevels]);

  // Filtered alerts with sorting
  const filteredAlerts = useMemo(() => {
    if (!snapshot) return [];
    const alerts =
      activeAlertLevel === "all"
        ? snapshot.alerts
        : snapshot.alerts.filter((alert) => alert.level === activeAlertLevel);

    // Sort by severity: critical/high first, then medium, then low
    const severityOrder: Record<string, number> = {
      critical: 0,
      high: 1,
      高: 1,
      medium: 2,
      中: 2,
      low: 3,
      低: 3,
    };

    return [...alerts].sort((a, b) => {
      const aLevel = severityOrder[a.level.toLowerCase()] ?? 4;
      const bLevel = severityOrder[b.level.toLowerCase()] ?? 4;
      return aLevel - bLevel;
    });
  }, [activeAlertLevel, snapshot]);

  // Workflow steps
  const workflowSteps = useMemo<WorkflowStep[]>(() => {
    const hasSnapshot = Boolean(snapshot);
    const alertCount = snapshot?.alerts.length ?? 0;
    const deviceCount = snapshot?.devices.length ?? 0;

    return [
      {
        id: "monitor-step-overview",
        title: t("pages.monitor.copy002"),
        detail: hasSnapshot
          ? t("pages.monitor.copy003")
          : t("pages.monitor.copy004"),
        state: hasSnapshot ? "done" : "active",
      },
      {
        id: "monitor-step-cameras",
        title: t("pages.monitor.copy005"),
        detail:
          Object.keys(openedPreviews).length > 0
            ? t("pages.monitor.copy006", {
                p1: Object.keys(openedPreviews).length,
              })
            : t("pages.monitor.copy007"),
        state:
          Object.keys(openedPreviews).length > 0
            ? "done"
            : hasSnapshot
              ? "active"
              : "upcoming",
      },
      {
        id: "monitor-step-alerts",
        title: t("pages.monitor.copy008"),
        detail: alertCount
          ? t("pages.monitor.copy009", { p1: alertCount })
          : t("pages.monitor.copy010"),
        state: alertCount ? "active" : hasSnapshot ? "done" : "upcoming",
      },
      {
        id: "monitor-step-devices",
        title: t("pages.monitor.copy011"),
        detail: deviceCount
          ? t("pages.monitor.copy012", { p1: deviceCount })
          : t("pages.monitor.copy013"),
        state: deviceCount ? "active" : "upcoming",
      },
    ];
  }, [openedPreviews, snapshot, t]);

  // Core metrics
  const coreMetrics = useMemo<CoreFlowMetric[]>(() => {
    return [
      {
        label: t("pages.monitor.copy014"),
        value: String(snapshot?.cameras.length ?? 0),
        note: t("pages.monitor.copy015"),
      },
      {
        label: t("pages.monitor.copy016"),
        value: String(Object.keys(openedPreviews).length),
        note: t("pages.monitor.copy017"),
      },
      {
        label: t("pages.monitor.copy018"),
        value: String(snapshot?.alerts.length ?? 0),
        note: t("pages.monitor.copy019"),
      },
      {
        label: t("pages.monitor.copy020"),
        value: String(snapshot?.devices.length ?? 0),
        note: t("pages.monitor.copy021"),
      },
    ];
  }, [openedPreviews, snapshot, t]);

  // Core stages
  const coreStages = useMemo<CoreFlowStage[]>(() => {
    const hasSnapshot = Boolean(snapshot);
    const hasAlerts = (snapshot?.alerts.length ?? 0) > 0;
    const hasDevices = (snapshot?.devices.length ?? 0) > 0;

    return [
      {
        id: "monitor-core-observe",
        title: t("pages.monitor.copy022"),
        detail: hasSnapshot
          ? t("pages.monitor.copy023")
          : t("pages.monitor.copy024"),
        state: hasSnapshot ? "done" : "active",
      },
      {
        id: "monitor-core-diagnose",
        title: t("pages.monitor.copy025"),
        detail: hasAlerts
          ? t("pages.monitor.copy026")
          : t("pages.monitor.copy027"),
        state: hasAlerts ? "active" : hasSnapshot ? "done" : "upcoming",
      },
      {
        id: "monitor-core-act",
        title: t("pages.monitor.copy028"),
        detail: hasDevices
          ? t("pages.monitor.copy029")
          : t("pages.monitor.copy030"),
        state: hasDevices ? "active" : "upcoming",
      },
      {
        id: "monitor-core-close",
        title: t("pages.monitor.copy031"),
        detail: t("pages.monitor.copy032"),
        state: hasSnapshot ? "upcoming" : "upcoming",
      },
    ];
  }, [snapshot, t]);

  // Camera management
  const startCamera = async (index: number) => {
    const target = videoRefs.current[index];
    if (!target) return;

    // If stream already active for this camera, stop it
    if (activeStreamsRef.current.has(index)) {
      const existingStream = activeStreamsRef.current.get(index);
      existingStream?.getTracks().forEach((track) => track.stop());
      activeStreamsRef.current.delete(index);
      target.srcObject = null;
      setOpenedPreviews((previous) => {
        const next = { ...previous };
        delete next[index];
        return next;
      });
      setCameraToast(t("pages.monitor.cameraStreamStopped"));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      target.srcObject = stream;
      await target.play();
      activeStreamsRef.current.set(index, stream);
      setOpenedPreviews((previous) => ({ ...previous, [index]: true }));

      const title =
        snapshot?.cameras[index]?.title ??
        t("pages.monitor.copy033", { p1: index + 1 });
      setCameraToast(t("pages.monitor.copy034", { p1: title }));
    } catch (requestError) {
      console.error(requestError);
      setCameraToast(t("pages.monitor.copy035"));
    }
  };

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    const headerOffset = 80;
    const elementPosition = target.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  };

  // Alert count by severity for badge display
  const alertCountsByLevel = useMemo(() => {
    const counts: Record<string, number> = {};
    snapshot?.alerts.forEach((alert) => {
      counts[alert.level] = (counts[alert.level] || 0) + 1;
    });
    return counts;
  }, [snapshot]);

  // Device health summary
  const deviceHealthSummary = useMemo(() => {
    if (!snapshot?.devices.length) return null;
    const total = snapshot.devices.length;
    const healthy = snapshot.devices.filter(
      (d) => d.temperature < 58
    ).length;
    const warning = snapshot.devices.filter(
      (d) => d.temperature >= 58 && d.temperature < 68
    ).length;
    const critical = snapshot.devices.filter(
      (d) => d.temperature >= 68
    ).length;
    return { total, healthy, warning, critical };
  }, [snapshot]);

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/operations"
        title={t("pages.monitor.copy036")}
        description={t("pages.monitor.copy037")}
      />
    );
  }

  return (
    <div className="page-shell monitor-shell pt-0 pb-10">
      <BackButton fallbackHref="/operations" />

      <WorkflowSteps
        title={t("pages.monitor.copy038")}
        subtitle={t("pages.monitor.copy039")}
        steps={workflowSteps}
      />

      <div className="quick-jump-strip">
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("monitor-core")}
        >
          {t("pages.monitor.coreFlow")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("monitor-lanes")}
        >
          {t("pages.monitor.lanes")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("monitor-cameras")}
        >
          {t("pages.monitor.copy040")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("monitor-alerts")}
        >
          {t("pages.monitor.copy041")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("monitor-devices")}
        >
          {t("pages.monitor.copy042")}
        </button>
      </div>

      <CoreFlowHeader
        id="monitor-core"
        eyebrow={t("pages.monitor.copy043")}
        title={t("pages.monitor.copy044")}
        description={
          snapshot?.headline.description ?? t("pages.monitor.copy045")
        }
        metrics={coreMetrics}
        stages={coreStages}
        actions={
          <>
            <button
              type="button"
              className="enterprise-primary-button"
              onClick={() => scrollToSection("monitor-alerts")}
            >
              {t("pages.monitor.copy046")}
            </button>
            <button
              type="button"
              className="enterprise-secondary-button"
              onClick={() => scrollToSection("monitor-cameras")}
            >
              {t("pages.monitor.copy047")}
            </button>
            <button
              type="button"
              className="enterprise-secondary-button"
              onClick={() => router.push("/digital-twin")}
            >
              {t("pages.monitor.copy048")}
            </button>
          </>
        }
        sideNote={
          <div className="enterprise-highlight-list">
            <div>
              <strong>{t("pages.monitor.copy049")}</strong>
              <p>{t("pages.monitor.copy050")}</p>
            </div>
            <div>
              <strong>{t("pages.monitor.copy051")}</strong>
              <p>{t("pages.monitor.copy052")}</p>
            </div>
          </div>
        }
      />

      <section id="monitor-lanes" className="core-flow-lane-grid">
        <Card className="core-flow-lane-card">
          <span className="core-flow-lane-kicker">
            {t("pages.digital_twin.copy053")}
          </span>
          <h3>{t("pages.monitor.copy053")}</h3>
          <p>{t("pages.monitor.copy054")}</p>
          <div className="core-flow-lane-actions">
            <button
              type="button"
              className="enterprise-primary-button"
              onClick={() => scrollToSection("monitor-cameras")}
            >
              {t("pages.monitor.copy055")}
            </button>
          </div>
        </Card>

        <Card className="core-flow-lane-card">
          <span className="core-flow-lane-kicker">
            {t("pages.digital_twin.copy057")}
          </span>
          <h3>{t("pages.monitor.copy056")}</h3>
          <p>{t("pages.monitor.copy057")}</p>
          <div className="core-flow-lane-actions">
            <button
              type="button"
              className="enterprise-primary-button"
              onClick={() => scrollToSection("monitor-alerts")}
            >
              {t("pages.monitor.copy058")}
            </button>
          </div>
        </Card>

        <Card className="core-flow-lane-card">
          <span className="core-flow-lane-kicker">
            {t("pages.digital_twin.copy062")}
          </span>
          <h3>{t("pages.monitor.copy059")}</h3>
          <p>{t("pages.monitor.copy060")}</p>
          <div className="core-flow-lane-actions">
            <button
              type="button"
              className="enterprise-primary-button"
              onClick={() => scrollToSection("monitor-devices")}
            >
              {t("pages.digital_twin.copy065")}
            </button>
            <button
              type="button"
              className="enterprise-secondary-button"
              onClick={() => router.push("/digital-twin")}
            >
              {t("pages.home.copy026")}
            </button>
          </div>
        </Card>
      </section>

      {/* Error state */}
      {error ? (
        <div className="empty-state">
          <span>!</span>
          {error}
          <button
            type="button"
            className="enterprise-secondary-button"
            style={{ marginTop: "0.75rem" }}
            onClick={() => {
              setIsLoading(true);
              loadData();
            }}
          >
            {t("common.refresh")}
          </button>
        </div>
      ) : null}

      {/* Device health summary badge */}
      {deviceHealthSummary && (
        <div className="device-health-summary">
          <span className="device-health-label">
            {t("pages.monitor.deviceHealth")}:
          </span>
          <div className="device-health-badges">
            <span className="health-badge health-healthy">
              {deviceHealthSummary.healthy}/{deviceHealthSummary.total}{" "}
              {t("pages.monitor.healthy")}
            </span>
            {deviceHealthSummary.warning > 0 && (
              <span className="health-badge health-warning">
                {deviceHealthSummary.warning} {t("pages.monitor.warning")}
              </span>
            )}
            {deviceHealthSummary.critical > 0 && (
              <span className="health-badge health-critical">
                {deviceHealthSummary.critical} {t("pages.monitor.critical")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Camera wall */}
      <Card id="monitor-cameras">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">{t("pages.monitor.copy040")}</span>
            <h2>{t("pages.monitor.copy061")}</h2>
          </div>
          <span className="panel-caption">
            {t("pages.monitor.copy062")}
            {updateCount > 0 && (
              <span className="update-indicator">
                &middot; {updateCount} {t("pages.monitor.updates")}
              </span>
            )}
          </span>
        </div>

        <div className="camera-grid">
          {(snapshot?.cameras.length
            ? snapshot.cameras
            : isLoading
              ? new Array(4).fill(null)
              : new Array(0).fill(null)
          ).map((camera, index) => {
            if (!camera && isLoading) {
              return <CameraSkeleton key={`skeleton-${index}`} />;
            }

            const cameraLabel =
              camera?.title ??
              t("pages.monitor.copy033", { p1: index + 1 });
            const locationLabel =
              camera?.location ?? t("pages.monitor.copy063");
            const statusLabel = camera?.status ?? t("pages.monitor.copy064");
            const descLabel =
              camera?.description ?? t("pages.monitor.copy065");
            const isActive = openedPreviews[index];

            return (
              <div key={camera?.id ?? index} className="camera-card">
                <video
                  ref={(node) => {
                    videoRefs.current[index] = node;
                  }}
                  className="camera-frame"
                  muted
                  playsInline
                />
                <div
                  className={`camera-status-chip ${
                    isActive ? "camera-status-active" : ""
                  }`}
                >
                  {isActive && <span className="status-dot-live" />}
                  {statusLabel}
                </div>

                <div className="camera-overlay">
                  <div>
                    <strong>{cameraLabel}</strong>
                    <span>{locationLabel}</span>
                    <p>{descLabel}</p>
                  </div>
                  <button
                    type="button"
                    className={isActive ? "btn-camera-active" : ""}
                    onClick={() => startCamera(index)}
                    aria-label={
                      isActive
                        ? t("pages.monitor.stopCamera")
                        : t("pages.monitor.startCamera")
                    }
                  >
                    {isActive
                      ? t("pages.monitor.copy066")
                      : t("pages.monitor.copy067")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Alerts and Devices side by side */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Alert queue */}
        <Card id="monitor-alerts" className="xl:col-span-7">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">{t("pages.monitor.copy068")}</span>
              <h2>{t("pages.monitor.copy069")}</h2>
            </div>
            {snapshot?.alerts.length ? (
              <span className="alert-count-badge">
                {snapshot.alerts.length}
              </span>
            ) : null}
          </div>

          <div className="workspace-tabs" role="tablist">
            {alertLevels.map((level) => {
              const count =
                level === "all"
                  ? snapshot?.alerts.length ?? 0
                  : alertCountsByLevel[level] ?? 0;
              return (
                <button
                  key={level}
                  type="button"
                  role="tab"
                  aria-selected={activeAlertLevel === level}
                  className={`workspace-tab ${
                    activeAlertLevel === level ? "workspace-tab-active" : ""
                  }`}
                  onClick={() => setActiveAlertLevel(level)}
                >
                  {level === "all" ? t("pages.monitor.copy070") : level}
                  {count > 0 && <span className="tab-count">{count}</span>}
                </button>
              );
            })}
          </div>

          <div className="alert-stack mt-4" role="tabpanel">
            {isLoading && !snapshot ? (
              <>
                <AlertSkeleton />
                <AlertSkeleton />
                <AlertSkeleton />
              </>
            ) : filteredAlerts.length ? (
              filteredAlerts.map((alert: AlertSnapshot, index: number) => (
                <div
                  key={alert.id}
                  className={`alert-item ${
                    index === 0 ? "alert-item-first" : ""
                  }`}
                >
                  <div
                    className={`alert-level status-chip ${resolveAlertTone(
                      alert.level,
                      index,
                    )}`}
                    title={alert.level}
                  >
                    <span className="alert-icon">
                      {resolveAlertIcon(alert.level)}
                    </span>
                    {alert.level}
                  </div>
                  <div className="alert-content">
                    <strong>{alert.title}</strong>
                    <span className="alert-meta">
                      {alert.station} /{" "}
                      <time dateTime={alert.timestamp}>
                        {formatRelativeTime(alert.timestamp)}
                      </time>
                    </span>
                    <p>{alert.detail}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="loading-state">
                {snapshot
                  ? t("pages.monitor.noAlerts")
                  : t("pages.monitor.copy071")}
              </div>
            )}
          </div>
        </Card>

        {/* Device status */}
        <Card id="monitor-devices" className="xl:col-span-5">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">{t("pages.monitor.copy072")}</span>
              <h2>{t("pages.monitor.copy073")}</h2>
            </div>
          </div>
          <div className="device-stack">
            {isLoading && !snapshot ? (
              <>
                <DeviceSkeleton />
                <DeviceSkeleton />
                <DeviceSkeleton />
              </>
            ) : snapshot?.devices.length ? (
              snapshot.devices.map((device) => (
                <div key={device.name} className="device-item">
                  <div className="device-item-top">
                    <strong>{device.name}</strong>
                    <span
                      className={`status-chip ${resolveDeviceTone(
                        device.temperature,
                      )}`}
                    >
                      {device.temperature >= 68 && (
                        <span className="status-pulse" />
                      )}
                      {device.status}
                    </span>
                  </div>
                  <div className="device-gauge">
                    <span
                      style={{
                        width: `${device.utilization}%`,
                        background:
                          device.utilization > 90
                            ? "linear-gradient(90deg, #f59e0b, #ef4444)"
                            : device.utilization > 70
                              ? "linear-gradient(90deg, #3b82f6, #f59e0b)"
                              : "linear-gradient(90deg, var(--accent), var(--accent-strong))",
                      }}
                    />
                  </div>
                  <div className="device-item-meta">
                    <span>
                      {t("pages.digital_twin.copy083")} {device.utilization}%
                    </span>
                    <span>
                      {t("pages.digital_twin.copy084")} {device.temperature}°C
                    </span>
                    <span>{device.note}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="loading-state">
                {snapshot
                  ? t("pages.monitor.noDevices")
                  : t("pages.monitor.copy074")}
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* Last updated timestamp */}
      {lastUpdated && (
        <div className="last-updated-bar">
          <span className="update-dot" />
          {t("pages.monitor.lastUpdated")}{" "}
          {lastUpdated.toLocaleTimeString()}
          {updateCount > 0 && (
            <span>
              &middot; {t("pages.monitor.autoRefreshCount", { p1: updateCount })}
            </span>
          )}
        </div>
      )}

      {/* Toast notification */}
      {cameraToast ? (
        <div className="floating-toast success" role="status" aria-live="polite">
          <span className="toast-icon">✓</span>
          {cameraToast}
        </div>
      ) : null}
    </div>
  );
}
