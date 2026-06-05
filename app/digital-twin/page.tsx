"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import dynamic from "next/dynamic";
const ModelViewer = dynamic(() => import("../components/ThreeViewer/ModelViewer"), { ssr: false, loading: () => <div className="model-viewer-container"><div className="model-viewer-loading" role="status"><div className="model-viewer-spinner" /><span>加载3D模型中...</span></div></div> });
import { PlatformAuthError, fetchPlatformData } from "@/lib/dashboard-client";
import { clearAuthSession } from "@/lib/auth-session";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
import type { DigitalTwinSnapshot } from "@/types/platform";

// -- Tone helpers --

function resolveSensorTone(status: string, value: number) {
  const normalized = status.toLowerCase();
  if (
    normalized.includes("warning") ||
    normalized.includes("alert") ||
    normalized.includes("risk") ||
    normalized.includes("预警") ||
    normalized.includes("异常")
  ) {
    return "danger";
  }
  if (Math.abs(value) > 80) {
    return "warn";
  }
  return "good";
}

function resolveDeviceTone(temperature: number) {
  if (temperature >= 68) return "status-danger";
  if (temperature >= 58) return "status-warning";
  return "status-success";
}

function resolveSensorIcon(status: string): string {
  const normalized = status.toLowerCase();
  if (
    normalized.includes("warning") ||
    normalized.includes("alert") ||
    normalized.includes("risk") ||
    normalized.includes("预警") ||
    normalized.includes("异常")
  ) {
    return "⚠";
  }
  if (normalized.includes("normal") || normalized.includes("正常")) {
    return "✓";
  }
  return "◉";
}

function formatSensorValue(value: number, unit: string): string {
  if (unit.includes("°")) {
    return `${value.toFixed(1)}${unit}`;
  }
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}k${unit}`;
  }
  return `${value.toFixed(2)}${unit}`;
}

// -- Skeleton loaders --

function SensorSkeleton() {
  return (
    <div className="sensor-tile" aria-busy="true" style={{ opacity: 0.4 }}>
      <div className="sensor-tile-top">
        <span className="skeleton-text" style={{ width: "60px" }}>&nbsp;</span>
        <em className="status-text good">&nbsp;</em>
      </div>
      <strong className="skeleton-text" style={{ width: "50px" }}>&nbsp;</strong>
      <div className="sensor-meta">
        <span className="skeleton-text" style={{ width: "40px" }}>&nbsp;</span>
        <span className="skeleton-text" style={{ width: "35px" }}>&nbsp;</span>
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

function FlowSkeleton() {
  return (
    <div className="twin-flow-item" aria-busy="true" style={{ opacity: 0.4 }}>
      <div className="twin-flow-index">--</div>
      <div>
        <strong className="skeleton-text" style={{ width: "80px" }}>&nbsp;</strong>
        <span className="skeleton-text" style={{ width: "60px" }}>&nbsp;</span>
      </div>
      <em className="skeleton-text" style={{ width: "30px" }}>&nbsp;</em>
    </div>
  );
}

// -- Main page --

export default function DigitalTwinPage() {
  const router = useRouter();
  const ready = useSessionGuard(["admin", "user"]);
  const { text, t } = useLocale();
  const [snapshot, setSnapshot] = useState<DigitalTwinSnapshot | null>(null);
  const [error, setError] = useState("");
  const [activeSensorStatus, setActiveSensorStatus] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [updateCount, setUpdateCount] = useState(0);

  // Data loading
  const loadData = useCallback(async () => {
    try {
      const payload = await fetchPlatformData<DigitalTwinSnapshot>(
        "/dashboard/digital-twin",
        "/api/digital-twin",
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
      setError(t("pages.digital_twin.copy001"));
      setIsLoading(false);
    }
  }, [router, t]);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const load = async () => {
      await loadData();
    };

    load().catch(console.error);
    const timer = window.setInterval(load, 15000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [ready, loadData]);

  // Sensor status filter options
  const sensorStatuses = useMemo(() => {
    const statuses = new Set<string>();
    snapshot?.sensors.forEach((sensor) => statuses.add(sensor.status));
    return ["all", ...Array.from(statuses)];
  }, [snapshot]);

  useEffect(() => {
    if (!sensorStatuses.includes(activeSensorStatus)) {
      setActiveSensorStatus("all");
    }
  }, [activeSensorStatus, sensorStatuses]);

  // Filtered sensors
  const filteredSensors = useMemo(() => {
    if (!snapshot) return [];
    const sensors =
      activeSensorStatus === "all"
        ? snapshot.sensors
        : snapshot.sensors.filter(
            (sensor) => sensor.status === activeSensorStatus,
          );

    // Sort: warnings first, then by absolute deviation
    return [...sensors].sort((a, b) => {
      const aTone = resolveSensorTone(a.status, a.value);
      const bTone = resolveSensorTone(b.status, b.value);
      const toneOrder = { danger: 0, warn: 1, good: 2 };
      const toneDiff = (toneOrder[aTone] ?? 2) - (toneOrder[bTone] ?? 2);
      if (toneDiff !== 0) return toneDiff;
      return Math.abs(b.value) - Math.abs(a.value);
    });
  }, [activeSensorStatus, snapshot]);

  // Sensor status counts
  const sensorStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    snapshot?.sensors.forEach((sensor) => {
      counts[sensor.status] = (counts[sensor.status] || 0) + 1;
    });
    return counts;
  }, [snapshot]);

  // Workflow steps
  const workflowSteps = useMemo<WorkflowStep[]>(() => {
    const hasSnapshot = Boolean(snapshot);
    const sensorCount = snapshot?.sensors.length ?? 0;
    const flowCount = snapshot?.flowSteps.length ?? 0;
    const deviceCount = snapshot?.devices.length ?? 0;

    return [
      {
        id: "twin-step-scene",
        title: t("pages.digital_twin.copy002"),
        detail: hasSnapshot
          ? t("pages.digital_twin.copy003")
          : t("pages.digital_twin.copy004"),
        state: hasSnapshot ? "done" : "active",
      },
      {
        id: "twin-step-sensors",
        title: t("pages.digital_twin.copy005"),
        detail: sensorCount
          ? t("pages.digital_twin.copy006", { p1: sensorCount })
          : t("pages.digital_twin.copy007"),
        state: sensorCount ? "active" : "upcoming",
      },
      {
        id: "twin-step-flow",
        title: t("pages.digital_twin.copy008"),
        detail: flowCount
          ? t("pages.digital_twin.copy009", { p1: flowCount })
          : t("pages.digital_twin.copy010"),
        state: flowCount ? "active" : "upcoming",
      },
      {
        id: "twin-step-devices",
        title: t("pages.digital_twin.copy011"),
        detail: deviceCount
          ? t("pages.digital_twin.copy012", { p1: deviceCount })
          : t("pages.digital_twin.copy013"),
        state: deviceCount ? "active" : "upcoming",
      },
    ];
  }, [snapshot, t]);

  // Core metrics
  const coreMetrics = useMemo<CoreFlowMetric[]>(() => {
    return [
      {
        label: t("pages.digital_twin.copy014"),
        value: String(snapshot?.sensors.length ?? 0),
        note: t("pages.digital_twin.copy015"),
      },
      {
        label: t("pages.digital_twin.copy016"),
        value: String(snapshot?.flowSteps.length ?? 0),
        note: t("pages.digital_twin.copy017"),
      },
      {
        label: t("pages.digital_twin.copy018"),
        value: String(snapshot?.devices.length ?? 0),
        note: t("pages.digital_twin.copy019"),
      },
      {
        label: t("pages.digital_twin.copy020"),
        value: String(snapshot?.alerts.length ?? 0),
        note: t("pages.digital_twin.copy021"),
      },
    ];
  }, [snapshot, t]);

  // Core stages
  const coreStages = useMemo<CoreFlowStage[]>(() => {
    const hasSnapshot = Boolean(snapshot);
    const hasSensors = (snapshot?.sensors.length ?? 0) > 0;
    const hasFlow = (snapshot?.flowSteps.length ?? 0) > 0;

    return [
      {
        id: "twin-core-observe",
        title: t("pages.digital_twin.copy022"),
        detail: hasSnapshot
          ? t("pages.digital_twin.copy023")
          : t("pages.digital_twin.copy024"),
        state: hasSnapshot ? "done" : "active",
      },
      {
        id: "twin-core-diagnose",
        title: t("pages.digital_twin.copy025"),
        detail: hasSensors
          ? t("pages.digital_twin.copy026")
          : t("pages.digital_twin.copy027"),
        state: hasSensors ? "active" : "upcoming",
      },
      {
        id: "twin-core-act",
        title: t("pages.digital_twin.copy028"),
        detail: hasFlow
          ? t("pages.digital_twin.copy029")
          : t("pages.digital_twin.copy030"),
        state: hasFlow ? "active" : "upcoming",
      },
      {
        id: "twin-core-close",
        title: t("pages.digital_twin.copy031"),
        detail: t("pages.digital_twin.copy032"),
        state: hasSnapshot ? "upcoming" : "upcoming",
      },
    ];
  }, [snapshot, t]);

  // Sensor health summary
  const sensorHealthSummary = useMemo(() => {
    if (!snapshot?.sensors.length) return null;
    const total = snapshot.sensors.length;
    const good = snapshot.sensors.filter(
      (s) => resolveSensorTone(s.status, s.value) === "good"
    ).length;
    const warn = snapshot.sensors.filter(
      (s) => resolveSensorTone(s.status, s.value) === "warn"
    ).length;
    const danger = snapshot.sensors.filter(
      (s) => resolveSensorTone(s.status, s.value) === "danger"
    ).length;
    return { total, good, warn, danger };
  }, [snapshot]);

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

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/operations"
        title={t("pages.digital_twin.copy033")}
        description={t("pages.digital_twin.copy034")}
      />
    );
  }

  return (
    <div className="page-shell twin-shell pt-0 pb-10">
      <BackButton fallbackHref="/operations" />

      <WorkflowSteps
        title={t("pages.digital_twin.copy035")}
        subtitle={t("pages.digital_twin.copy036")}
        steps={workflowSteps}
      />

      <div className="quick-jump-strip">
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("twin-core")}
        >
          {t("pages.digital_twin.coreFlow")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("twin-lanes")}
        >
          {t("pages.digital_twin.lanes")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("twin-scene")}
        >
          {t("pages.digital_twin.copy039")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("twin-sensors")}
        >
          {t("pages.digital_twin.copy040")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("twin-flow")}
        >
          {t("pages.digital_twin.copy041")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("twin-devices")}
        >
          {t("pages.digital_twin.copy042")}
        </button>
      </div>

      <CoreFlowHeader
        id="twin-core"
        eyebrow={
          snapshot?.summary.sceneLabel ?? t("pages.digital_twin.copy043")
        }
        title={snapshot?.summary.title ?? t("pages.digital_twin.copy044")}
        description={
          snapshot?.summary.description ?? t("pages.digital_twin.copy045")
        }
        metrics={coreMetrics}
        stages={coreStages}
        actions={
          <>
            <button
              type="button"
              className="enterprise-primary-button"
              onClick={() => scrollToSection("twin-sensors")}
            >
              {t("pages.digital_twin.copy046")}
            </button>
            <button
              type="button"
              className="enterprise-secondary-button"
              onClick={() => scrollToSection("twin-scene")}
            >
              {t("pages.digital_twin.copy047")}
            </button>
            <button
              type="button"
              className="enterprise-secondary-button"
              onClick={() => router.push("/monitor")}
            >
              {t("pages.digital_twin.copy048")}
            </button>
          </>
        }
        sideNote={
          <div className="enterprise-highlight-list">
            <div>
              <strong>{t("pages.digital_twin.copy049")}</strong>
              <p>{t("pages.digital_twin.copy050")}</p>
            </div>
            <div>
              <strong>{t("pages.digital_twin.copy051")}</strong>
              <p>{t("pages.digital_twin.copy052")}</p>
            </div>
          </div>
        }
      />

      <section id="twin-lanes" className="core-flow-lane-grid">
        <Card className="core-flow-lane-card">
          <span className="core-flow-lane-kicker">
            {t("pages.digital_twin.copy053")}
          </span>
          <h3>{t("pages.digital_twin.copy054")}</h3>
          <p>{t("pages.digital_twin.copy055")}</p>
          <div className="core-flow-lane-actions">
            <button
              type="button"
              className="enterprise-primary-button"
              onClick={() => scrollToSection("twin-scene")}
            >
              {t("pages.digital_twin.copy056")}
            </button>
          </div>
        </Card>

        <Card className="core-flow-lane-card">
          <span className="core-flow-lane-kicker">
            {t("pages.digital_twin.copy057")}
          </span>
          <h3>{t("pages.digital_twin.copy058")}</h3>
          <p>{t("pages.digital_twin.copy059")}</p>
          <div className="core-flow-lane-actions">
            <button
              type="button"
              className="enterprise-primary-button"
              onClick={() => scrollToSection("twin-sensors")}
            >
              {t("pages.digital_twin.copy060")}
            </button>
            <button
              type="button"
              className="enterprise-secondary-button"
              onClick={() => scrollToSection("twin-flow")}
            >
              {t("pages.digital_twin.copy061")}
            </button>
          </div>
        </Card>

        <Card className="core-flow-lane-card">
          <span className="core-flow-lane-kicker">
            {t("pages.digital_twin.copy062")}
          </span>
          <h3>{t("pages.digital_twin.copy063")}</h3>
          <p>{t("pages.digital_twin.copy064")}</p>
          <div className="core-flow-lane-actions">
            <button
              type="button"
              className="enterprise-primary-button"
              onClick={() => scrollToSection("twin-devices")}
            >
              {t("pages.digital_twin.copy065")}
            </button>
            <button
              type="button"
              className="enterprise-secondary-button"
              onClick={() => router.push("/monitor")}
            >
              {t("pages.digital_twin.copy066")}
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

      {/* Sensor health summary */}
      {sensorHealthSummary && (
        <div className="sensor-health-summary">
          <span className="sensor-health-label">
            {t("pages.digital_twin.sensorHealth")}:
          </span>
          <div className="sensor-health-badges">
            <span className="health-badge health-healthy">
              {sensorHealthSummary.good}/{sensorHealthSummary.total}{" "}
              {t("pages.digital_twin.healthy")}
            </span>
            {sensorHealthSummary.warn > 0 && (
              <span className="health-badge health-warning">
                {sensorHealthSummary.warn} {t("pages.digital_twin.warning")}
              </span>
            )}
            {sensorHealthSummary.danger > 0 && (
              <span className="health-badge health-critical">
                {sensorHealthSummary.danger} {t("pages.digital_twin.critical")}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3D Scene + Process Flow */}
      <section className="twin-hero-grid">
        <Card id="twin-scene" className="twin-stage-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {t("pages.digital_twin.copy067")}
              </span>
              <h2>{t("pages.digital_twin.copy068")}</h2>
            </div>
            <span className="status-chip status-success">
              <span className="status-dot-live" />
              {t("pages.digital_twin.copy069")}
            </span>
          </div>

          <div className="twin-stage-frame">
            {isLoading ? (
              <div className="twin-stage-loading">
                <div className="model-viewer-spinner" />
                <span>{t("pages.digital_twin.loading3d")}</span>
              </div>
            ) : (
              <ModelViewer />
            )}
          </div>
        </Card>

        {/* Process flow */}
        <Card id="twin-flow" className="xl:col-span-5">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {t("pages.digital_twin.copy070")}
              </span>
              <h2>{t("pages.digital_twin.copy071")}</h2>
            </div>
          </div>

          <div className="twin-flow-list">
            {isLoading && !snapshot?.flowSteps.length ? (
              <>
                <FlowSkeleton />
                <FlowSkeleton />
                <FlowSkeleton />
              </>
            ) : snapshot?.flowSteps.length ? (
              snapshot.flowSteps.map((step, index) => (
                <div
                  key={`${step.title}-${index}`}
                  className={`twin-flow-item ${
                    index === 0 ? "active" : ""
                  }`}
                >
                  <div className="twin-flow-index">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="twin-flow-content">
                    <strong>{step.title}</strong>
                    <span>{step.meta}</span>
                  </div>
                  <em className="twin-flow-duration">{step.duration}</em>
                </div>
              ))
            ) : (
              <div className="loading-state">
                {t("pages.digital_twin.copy072")}
              </div>
            )}
          </div>

          <div className="enterprise-note-card">
            <strong>{t("pages.digital_twin.copy073")}</strong>
            <span>{t("pages.digital_twin.copy074")}</span>
          </div>
        </Card>
      </section>

      {/* Sensors + Devices side by side */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Sensor grid */}
        <Card id="twin-sensors" className="xl:col-span-7">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {t("pages.digital_twin.copy075")}
              </span>
              <h2>{t("pages.digital_twin.copy076")}</h2>
            </div>
            {snapshot?.sensors.length ? (
              <span className="sensor-count-badge">
                {snapshot.sensors.length}
              </span>
            ) : null}
          </div>

          <div className="workspace-tabs" role="tablist">
            {sensorStatuses.map((status) => {
              const count =
                status === "all"
                  ? snapshot?.sensors.length ?? 0
                  : sensorStatusCounts[status] ?? 0;
              return (
                <button
                  key={status}
                  type="button"
                  role="tab"
                  aria-selected={activeSensorStatus === status}
                  className={`workspace-tab ${
                    activeSensorStatus === status ? "workspace-tab-active" : ""
                  }`}
                  onClick={() => setActiveSensorStatus(status)}
                >
                  {status === "all" ? t("pages.digital_twin.copy077") : status}
                  {count > 0 && <span className="tab-count">{count}</span>}
                </button>
              );
            })}
          </div>

          <div className="sensor-grid mt-4" role="tabpanel">
            {isLoading && !snapshot ? (
              <>
                <SensorSkeleton />
                <SensorSkeleton />
                <SensorSkeleton />
                <SensorSkeleton />
                <SensorSkeleton />
                <SensorSkeleton />
              </>
            ) : filteredSensors.length ? (
              filteredSensors.map((sensor) => {
                const tone = resolveSensorTone(sensor.status, sensor.value);
                return (
                  <div
                    key={sensor.label}
                    className={`sensor-tile sensor-tile-${tone}`}
                  >
                    <div className="sensor-tile-top">
                      <span className="sensor-label-text">{sensor.label}</span>
                      <em
                        className={`status-text ${tone}`}
                        title={sensor.status}
                      >
                        <span className="sensor-status-icon">
                          {resolveSensorIcon(sensor.status)}
                        </span>
                        {sensor.status}
                      </em>
                    </div>
                    <strong className="sensor-value-display">
                      {formatSensorValue(sensor.value, sensor.unit)}
                    </strong>
                    <div className="sensor-meta">
                      <span>
                        {t("pages.digital_twin.copy078")} {sensor.target}
                      </span>
                      <span>
                        {t("pages.digital_twin.copy079")} {sensor.deviation}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="loading-state">
                {snapshot
                  ? t("pages.digital_twin.noSensors")
                  : t("pages.digital_twin.copy080")}
              </div>
            )}
          </div>
        </Card>

        {/* Device status */}
        <Card id="twin-devices" className="xl:col-span-5">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {t("pages.digital_twin.copy042")}
              </span>
              <h2>{t("pages.digital_twin.copy081")}</h2>
            </div>
            <span className="panel-caption">
              {t("pages.digital_twin.copy082")}
            </span>
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
                  ? t("pages.digital_twin.noDevices")
                  : t("pages.digital_twin.copy085")}
              </div>
            )}
          </div>
        </Card>
      </section>

      {/* Last updated timestamp */}
      {lastUpdated && (
        <div className="last-updated-bar">
          <span className="update-dot" />
          {t("pages.digital_twin.lastUpdated")}{" "}
          {lastUpdated.toLocaleTimeString()}
          {updateCount > 0 && (
            <span>
              &middot; {t("pages.digital_twin.autoRefreshCount", { p1: updateCount })}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
