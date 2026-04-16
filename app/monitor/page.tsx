"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import type { MonitorSnapshot } from "@/types/platform";

function resolveAlertTone(level: string, index: number) {
  const normalized = level.toLowerCase();
  if (
    normalized.includes("critical") ||
    normalized.includes("high") ||
    normalized.includes("p1")
  ) {
    return "status-danger";
  }
  if (normalized.includes("low") || normalized.includes("p3")) {
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

export default function MonitorPage() {
  const router = useRouter();
  const ready = useSessionGuard(["admin", "user"]);
  const [snapshot, setSnapshot] = useState<MonitorSnapshot | null>(null);
  const [error, setError] = useState("");
  const [cameraToast, setCameraToast] = useState<string | null>(null);
  const [openedPreviews, setOpenedPreviews] = useState<Record<number, true>>({});
  const [activeAlertLevel, setActiveAlertLevel] = useState("all");
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const load = async () => {
      try {
        const payload = await fetchPlatformData<MonitorSnapshot>(
          "/dashboard/monitor",
          "/api/monitor",
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
          "Monitoring data is temporarily unavailable. Please retry in a moment.",
        );
      }
    };

    load().catch(console.error);
    const timer = window.setInterval(load, 12000);

    return () => {
      active = false;
      window.clearInterval(timer);
      videoRefs.current.forEach((video) => {
        const stream = video?.srcObject as MediaStream | undefined;
        stream?.getTracks().forEach((track) => track.stop());
      });
    };
  }, [ready, router]);

  useEffect(() => {
    if (!cameraToast) return;
    const timer = window.setTimeout(() => setCameraToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [cameraToast]);

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

  const filteredAlerts = useMemo(() => {
    if (!snapshot) return [];
    if (activeAlertLevel === "all") return snapshot.alerts;
    return snapshot.alerts.filter((alert) => alert.level === activeAlertLevel);
  }, [activeAlertLevel, snapshot]);

  const previewCount = Object.keys(openedPreviews).length;

  const workflowSteps = useMemo<WorkflowStep[]>(() => {
    const hasSnapshot = Boolean(snapshot);
    const alertCount = snapshot?.alerts.length ?? 0;
    const deviceCount = snapshot?.devices.length ?? 0;

    return [
      {
        id: "monitor-step-overview",
        title: "Review summary",
        detail: hasSnapshot ? "Snapshot is ready for this shift" : "Waiting for feed",
        state: hasSnapshot ? "done" : "active",
      },
      {
        id: "monitor-step-cameras",
        title: "Open camera previews",
        detail:
          previewCount > 0
            ? `${previewCount} local preview(s) opened`
            : "Start at least one preview for visual validation",
        state: previewCount > 0 ? "done" : hasSnapshot ? "active" : "upcoming",
      },
      {
        id: "monitor-step-alerts",
        title: "Triage alert queue",
        detail: alertCount ? `${alertCount} event(s) in queue` : "No pending events",
        state: alertCount ? "active" : hasSnapshot ? "done" : "upcoming",
      },
      {
        id: "monitor-step-devices",
        title: "Confirm device health",
        detail: deviceCount ? `${deviceCount} nodes to verify` : "Waiting for device stream",
        state: deviceCount ? "active" : "upcoming",
      },
    ];
  }, [previewCount, snapshot]);

  const coreMetrics = useMemo<CoreFlowMetric[]>(() => {
    return [
      {
        label: "Camera channels",
        value: String(snapshot?.cameras.length ?? 0),
        note: "Live wall channels available for operator inspection.",
      },
      {
        label: "Preview sessions",
        value: String(previewCount),
        note: "Opened local video previews for this shift.",
      },
      {
        label: "Alert queue",
        value: String(snapshot?.alerts.length ?? 0),
        note: "Events requiring triage by shift lead and line engineers.",
      },
      {
        label: "Tracked devices",
        value: String(snapshot?.devices.length ?? 0),
        note: "Machine nodes mapped to this monitor domain.",
      },
    ];
  }, [previewCount, snapshot]);

  const coreStages = useMemo<CoreFlowStage[]>(() => {
    const hasSnapshot = Boolean(snapshot);
    const hasAlerts = (snapshot?.alerts.length ?? 0) > 0;
    const hasDevices = (snapshot?.devices.length ?? 0) > 0;

    return [
      {
        id: "monitor-core-observe",
        title: "Observe camera wall",
        detail: hasSnapshot
          ? "Use channel previews to validate actual line condition."
          : "Waiting for monitoring feed.",
        state: hasSnapshot ? "done" : "active",
      },
      {
        id: "monitor-core-diagnose",
        title: "Diagnose alert context",
        detail: hasAlerts
          ? "Prioritize by severity, station and timestamp."
          : "No pending alerts in current queue.",
        state: hasAlerts ? "active" : hasSnapshot ? "done" : "upcoming",
      },
      {
        id: "monitor-core-act",
        title: "Act on device health",
        detail: hasDevices
          ? "Validate utilization and thermal risk for each asset."
          : "Device telemetry is still loading.",
        state: hasDevices ? "active" : "upcoming",
      },
      {
        id: "monitor-core-close",
        title: "Close with escalation",
        detail: "Escalate spatial or process root-cause to Digital Twin when needed.",
        state: hasSnapshot ? "upcoming" : "upcoming",
      },
    ];
  }, [snapshot]);

  const startCamera = async (index: number) => {
    const target = videoRefs.current[index];
    if (!target) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      target.srcObject = stream;
      await target.play();
      setOpenedPreviews((previous) => ({ ...previous, [index]: true }));

      const title = snapshot?.cameras[index]?.title ?? `Camera ${index + 1}`;
      setCameraToast(`Preview connected: ${title}`);
    } catch (requestError) {
      console.error(requestError);
      setCameraToast("Camera preview failed. Check browser media permissions.");
    }
  };

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/operations"
        title="Loading Monitoring Center"
        description="Preparing the live camera wall and triage workspace..."
      />
    );
  }

  return (
    <div className="page-shell monitor-shell pt-0 pb-10">
      <BackButton fallbackHref="/operations" />

      <WorkflowSteps
        title="Monitoring Flow"
        subtitle="Use this order to keep incident handling consistent across shifts."
        steps={workflowSteps}
      />

      <div className="quick-jump-strip">
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("monitor-core")}
        >
          Core Flow
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("monitor-lanes")}
        >
          Action Lanes
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("monitor-cameras")}
        >
          Camera Wall
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("monitor-alerts")}
        >
          Alert Queue
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("monitor-devices")}
        >
          Device Health
        </button>
      </div>

      <CoreFlowHeader
        id="monitor-core"
        eyebrow="Monitoring Domain / Shift Console"
        title="Real-time Camera and Incident Triage"
        description={
          snapshot?.headline.description ??
          "This page is designed for frontline execution: capture evidence, classify alerts, and dispatch actions without context switching."
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
              Start Alert Triage
            </button>
            <button
              type="button"
              className="enterprise-secondary-button"
              onClick={() => scrollToSection("monitor-cameras")}
            >
              Open Camera Wall
            </button>
            <button
              type="button"
              className="enterprise-secondary-button"
              onClick={() => router.push("/digital-twin")}
            >
              Escalate to Twin
            </button>
          </>
        }
        sideNote={
          <div className="enterprise-highlight-list">
            <div>
              <strong>Role focus</strong>
              <p>Keep live incident handling in monitoring and avoid duplicate analysis views.</p>
            </div>
            <div>
              <strong>Handoff rule</strong>
              <p>When root-cause needs process-space interpretation, jump to digital twin immediately.</p>
            </div>
          </div>
        }
      />

      <section id="monitor-lanes" className="core-flow-lane-grid">
        <Card className="core-flow-lane-card">
          <span className="core-flow-lane-kicker">Observe</span>
          <h3>Camera validation lane</h3>
          <p>
            Open one or more channel previews and confirm physical line behavior
            before triaging the event queue.
          </p>
          <div className="core-flow-lane-actions">
            <button
              type="button"
              className="enterprise-primary-button"
              onClick={() => scrollToSection("monitor-cameras")}
            >
              Review Cameras
            </button>
          </div>
        </Card>

        <Card className="core-flow-lane-card">
          <span className="core-flow-lane-kicker">Diagnose</span>
          <h3>Alert investigation lane</h3>
          <p>
            Classify severity, identify station impact, and isolate the shortest
            path to containment for the current shift.
          </p>
          <div className="core-flow-lane-actions">
            <button
              type="button"
              className="enterprise-primary-button"
              onClick={() => scrollToSection("monitor-alerts")}
            >
              Triage Alerts
            </button>
          </div>
        </Card>

        <Card className="core-flow-lane-card">
          <span className="core-flow-lane-kicker">Act + Close</span>
          <h3>Device response lane</h3>
          <p>
            Verify thermal and utilization states, then escalate to twin domain
            for process-space root-cause and closure decisions.
          </p>
          <div className="core-flow-lane-actions">
            <button
              type="button"
              className="enterprise-primary-button"
              onClick={() => scrollToSection("monitor-devices")}
            >
              Inspect Devices
            </button>
            <button
              type="button"
              className="enterprise-secondary-button"
              onClick={() => router.push("/digital-twin")}
            >
              Open Digital Twin
            </button>
          </div>
        </Card>
      </section>

      {error ? (
        <div className="empty-state">
          <span>!</span>
          {error}
        </div>
      ) : null}

      <Card id="monitor-cameras">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Camera Wall</span>
            <h2>Multi-channel preview workspace</h2>
          </div>
          <span className="panel-caption">
            Open local previews per channel to validate operator-visible evidence.
          </span>
        </div>

        <div className="camera-grid">
          {(snapshot?.cameras.length ? snapshot.cameras : new Array(4).fill(null)).map(
            (camera, index) => {
              const cameraLabel = camera?.title ?? `Camera ${index + 1}`;
              const locationLabel = camera?.location ?? "Production line zone";
              const statusLabel = camera?.status ?? "Standby";
              const descLabel =
                camera?.description ?? "Waiting for live feed assignment.";

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
                  <div className="camera-status-chip">{statusLabel}</div>

                  <div className="camera-overlay">
                    <div>
                      <strong>{cameraLabel}</strong>
                      <span>{locationLabel}</span>
                      <p>{descLabel}</p>
                    </div>
                    <button type="button" onClick={() => startCamera(index)}>
                      {openedPreviews[index] ? "Refresh preview" : "Open preview"}
                    </button>
                  </div>
                </div>
              );
            },
          )}
        </div>
      </Card>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card id="monitor-alerts" className="xl:col-span-7">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Exception Feed</span>
              <h2>Alert queue and response context</h2>
            </div>
          </div>

          <div className="workspace-tabs">
            {alertLevels.map((level) => (
              <button
                key={level}
                type="button"
                className={`workspace-tab ${
                  activeAlertLevel === level ? "workspace-tab-active" : ""
                }`}
                onClick={() => setActiveAlertLevel(level)}
              >
                {level === "all" ? "All levels" : level}
              </button>
            ))}
          </div>

          <div className="alert-stack mt-4">
            {filteredAlerts.length ? (
              filteredAlerts.map((alert, index) => (
                <div key={alert.id} className="alert-item">
                  <div
                    className={`alert-level status-chip ${resolveAlertTone(
                      alert.level,
                      index,
                    )}`}
                  >
                    {alert.level}
                  </div>
                  <div>
                    <strong>{alert.title}</strong>
                    <span>
                      {alert.station} / {alert.timestamp}
                    </span>
                    <p>{alert.detail}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="loading-state">
                No alert found for this filter.
              </div>
            )}
          </div>
        </Card>

        <Card id="monitor-devices" className="xl:col-span-5">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Device Watch</span>
              <h2>Line-side machine health checks</h2>
            </div>
          </div>
          <div className="device-stack">
            {snapshot?.devices.length ? (
              snapshot.devices.map((device) => (
                <div key={device.name} className="device-item">
                  <div className="device-item-top">
                    <strong>{device.name}</strong>
                    <span
                      className={`status-chip ${resolveDeviceTone(
                        device.temperature,
                      )}`}
                    >
                      {device.status}
                    </span>
                  </div>
                  <div className="device-gauge">
                    <span style={{ width: `${device.utilization}%` }} />
                  </div>
                  <div className="device-item-meta">
                    <span>Utilization {device.utilization}%</span>
                    <span>Temperature {device.temperature} C</span>
                    <span>{device.note}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="loading-state">Device feed is loading...</div>
            )}
          </div>
        </Card>
      </section>

      {cameraToast ? <div className="floating-toast success">{cameraToast}</div> : null}
    </div>
  );
}
