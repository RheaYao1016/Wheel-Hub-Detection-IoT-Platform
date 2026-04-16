"use client";

import { useEffect, useMemo, useState } from "react";
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
import ModelViewer from "../components/ThreeViewer/ModelViewer";
import { PlatformAuthError, fetchPlatformData } from "@/lib/dashboard-client";
import { clearAuthSession } from "@/lib/auth-session";
import { useSessionGuard } from "../hooks/useSessionGuard";
import type { DigitalTwinSnapshot } from "@/types/platform";

function resolveSensorTone(status: string, value: number) {
  const normalized = status.toLowerCase();
  if (
    normalized.includes("warning") ||
    normalized.includes("alert") ||
    normalized.includes("risk")
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

export default function DigitalTwinPage() {
  const router = useRouter();
  const ready = useSessionGuard(["admin", "user"]);
  const [snapshot, setSnapshot] = useState<DigitalTwinSnapshot | null>(null);
  const [error, setError] = useState("");
  const [activeSensorStatus, setActiveSensorStatus] = useState("all");

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const load = async () => {
      try {
        const payload = await fetchPlatformData<DigitalTwinSnapshot>(
          "/dashboard/digital-twin",
          "/api/digital-twin",
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
          "Digital twin data is currently unavailable. Please retry shortly.",
        );
      }
    };

    load().catch(console.error);
    const timer = window.setInterval(load, 15000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [ready, router]);

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

  const filteredSensors = useMemo(() => {
    if (!snapshot) return [];
    if (activeSensorStatus === "all") return snapshot.sensors;
    return snapshot.sensors.filter((sensor) => sensor.status === activeSensorStatus);
  }, [activeSensorStatus, snapshot]);

  const workflowSteps = useMemo<WorkflowStep[]>(() => {
    const hasSnapshot = Boolean(snapshot);
    const sensorCount = snapshot?.sensors.length ?? 0;
    const flowCount = snapshot?.flowSteps.length ?? 0;
    const deviceCount = snapshot?.devices.length ?? 0;

    return [
      {
        id: "twin-step-scene",
        title: "Load 3D scene",
        detail: hasSnapshot ? "Scene and context loaded" : "Waiting for twin feed",
        state: hasSnapshot ? "done" : "active",
      },
      {
        id: "twin-step-sensors",
        title: "Inspect sensors",
        detail: sensorCount ? `${sensorCount} sensor nodes available` : "No sensor nodes",
        state: sensorCount ? "active" : "upcoming",
      },
      {
        id: "twin-step-flow",
        title: "Review process flow",
        detail: flowCount ? `${flowCount} mapped process step(s)` : "Flow map pending",
        state: flowCount ? "active" : "upcoming",
      },
      {
        id: "twin-step-devices",
        title: "Check device lattice",
        detail: deviceCount ? `${deviceCount} mapped asset(s)` : "Device map pending",
        state: deviceCount ? "active" : "upcoming",
      },
    ];
  }, [snapshot]);

  const coreMetrics = useMemo<CoreFlowMetric[]>(() => {
    return [
      {
        label: "Sensors tracked",
        value: String(snapshot?.sensors.length ?? 0),
        note: "Realtime points currently mapped in the twin layer.",
      },
      {
        label: "Process steps",
        value: String(snapshot?.flowSteps.length ?? 0),
        note: "Procedure segments available for flow diagnostics.",
      },
      {
        label: "Mapped devices",
        value: String(snapshot?.devices.length ?? 0),
        note: "Assets bound to 3D coordinates and process context.",
      },
      {
        label: "Linked alerts",
        value: String(snapshot?.alerts.length ?? 0),
        note: "Exception references inherited from monitoring domain.",
      },
    ];
  }, [snapshot]);

  const coreStages = useMemo<CoreFlowStage[]>(() => {
    const hasSnapshot = Boolean(snapshot);
    const hasSensors = (snapshot?.sensors.length ?? 0) > 0;
    const hasFlow = (snapshot?.flowSteps.length ?? 0) > 0;

    return [
      {
        id: "twin-core-observe",
        title: "Observe 3D space",
        detail: hasSnapshot
          ? "Use twin scene to locate physical context for anomalies."
          : "Waiting for twin scene feed.",
        state: hasSnapshot ? "done" : "active",
      },
      {
        id: "twin-core-diagnose",
        title: "Diagnose sensor behavior",
        detail: hasSensors
          ? "Filter sensor states to isolate deviations and drift."
          : "Sensor map is still loading.",
        state: hasSensors ? "active" : "upcoming",
      },
      {
        id: "twin-core-act",
        title: "Act through process map",
        detail: hasFlow
          ? "Correlate step duration with sensor deviations and device state."
          : "Process mapping is pending.",
        state: hasFlow ? "active" : "upcoming",
      },
      {
        id: "twin-core-close",
        title: "Close with monitor handoff",
        detail: "Push confirmed findings back to monitoring and governance loops.",
        state: hasSnapshot ? "upcoming" : "upcoming",
      },
    ];
  }, [snapshot]);

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/operations"
        title="Loading Digital Twin"
        description="Preparing 3D scene, sensor map, and process workflow..."
      />
    );
  }

  return (
    <div className="page-shell twin-shell pt-0 pb-10">
      <BackButton fallbackHref="/operations" />

      <WorkflowSteps
        title="Digital Twin Flow"
        subtitle="Keep this page focused on space mapping and process diagnostics."
        steps={workflowSteps}
      />

      <div className="quick-jump-strip">
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("twin-core")}
        >
          Core Flow
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("twin-lanes")}
        >
          Action Lanes
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("twin-scene")}
        >
          3D Scene
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("twin-sensors")}
        >
          Sensors
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("twin-flow")}
        >
          Process Flow
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("twin-devices")}
        >
          Device Lattice
        </button>
      </div>

      <CoreFlowHeader
        id="twin-core"
        eyebrow={snapshot?.summary.sceneLabel ?? "Twin Mesh and Process Mapping"}
        title={snapshot?.summary.title ?? "Digital Twin Operations Unit"}
        description={
          snapshot?.summary.description ??
          "Use this page as the spatial and procedural diagnostic layer, while alert triage remains in monitoring domain."
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
              Start Sensor Diagnosis
            </button>
            <button
              type="button"
              className="enterprise-secondary-button"
              onClick={() => scrollToSection("twin-scene")}
            >
              Open 3D Scene
            </button>
            <button
              type="button"
              className="enterprise-secondary-button"
              onClick={() => router.push("/monitor")}
            >
              Back to Monitoring
            </button>
          </>
        }
        sideNote={
          <div className="enterprise-highlight-list">
            <div>
              <strong>Spatial ownership</strong>
              <p>Device nodes, sensor points, and process paths are mapped in one coherent coordinate system.</p>
            </div>
            <div>
              <strong>Execution boundary</strong>
              <p>Live camera triage remains in monitor to keep operational roles and data ownership clear.</p>
            </div>
          </div>
        }
      />

      <section id="twin-lanes" className="core-flow-lane-grid">
        <Card className="core-flow-lane-card">
          <span className="core-flow-lane-kicker">Observe</span>
          <h3>Scene interpretation lane</h3>
          <p>
            Inspect the 3D model to anchor where the issue happened before
            comparing sensor and process evidence.
          </p>
          <div className="core-flow-lane-actions">
            <button
              type="button"
              className="enterprise-primary-button"
              onClick={() => scrollToSection("twin-scene")}
            >
              Review Scene
            </button>
          </div>
        </Card>

        <Card className="core-flow-lane-card">
          <span className="core-flow-lane-kicker">Diagnose</span>
          <h3>Sensor and process lane</h3>
          <p>
            Filter sensor statuses, then validate against process-step duration to
            isolate root-cause candidates.
          </p>
          <div className="core-flow-lane-actions">
            <button
              type="button"
              className="enterprise-primary-button"
              onClick={() => scrollToSection("twin-sensors")}
            >
              Analyze Sensors
            </button>
            <button
              type="button"
              className="enterprise-secondary-button"
              onClick={() => scrollToSection("twin-flow")}
            >
              Review Flow
            </button>
          </div>
        </Card>

        <Card className="core-flow-lane-card">
          <span className="core-flow-lane-kicker">Act + Close</span>
          <h3>Asset response lane</h3>
          <p>
            Check lattice device states and pass confirmed corrective actions back
            to monitor and governance loops.
          </p>
          <div className="core-flow-lane-actions">
            <button
              type="button"
              className="enterprise-primary-button"
              onClick={() => scrollToSection("twin-devices")}
            >
              Inspect Devices
            </button>
            <button
              type="button"
              className="enterprise-secondary-button"
              onClick={() => router.push("/monitor")}
            >
              Handoff to Monitor
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

      <section className="twin-hero-grid">
        <Card id="twin-scene" className="twin-stage-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Realtime 3D</span>
              <h2>Interactive scene stage</h2>
            </div>
            <span className="status-chip status-success">Interactive</span>
          </div>

          <div className="twin-stage-frame">
            <ModelViewer />
          </div>
        </Card>

        <Card id="twin-flow" className="xl:col-span-5">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Workflow</span>
              <h2>Mapped process sequence</h2>
            </div>
          </div>

          <div className="twin-flow-list">
            {snapshot?.flowSteps.length ? (
              snapshot.flowSteps.map((step, index) => (
                <div
                  key={`${step.title}-${index}`}
                  className={`twin-flow-item ${index === 0 ? "active" : ""}`}
                >
                  <div className="twin-flow-index">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <strong>{step.title}</strong>
                    <span>{step.meta}</span>
                  </div>
                  <em>{step.duration}</em>
                </div>
              ))
            ) : (
              <div className="loading-state">Process flow is loading...</div>
            )}
          </div>

          <div className="enterprise-note-card">
            <strong>Flow interpretation tip</strong>
            <span>
              Start from duration anomalies, then cross-check sensor deviation and
              mapped asset condition in the lattice panel.
            </span>
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card id="twin-sensors" className="xl:col-span-7">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Sensor Map</span>
              <h2>Realtime sensor condition panel</h2>
            </div>
          </div>

          <div className="workspace-tabs">
            {sensorStatuses.map((status) => (
              <button
                key={status}
                type="button"
                className={`workspace-tab ${
                  activeSensorStatus === status ? "workspace-tab-active" : ""
                }`}
                onClick={() => setActiveSensorStatus(status)}
              >
                {status === "all" ? "All states" : status}
              </button>
            ))}
          </div>

          <div className="sensor-grid mt-4">
            {filteredSensors.length ? (
              filteredSensors.map((sensor) => (
                <div key={sensor.label} className="sensor-tile">
                  <div className="sensor-tile-top">
                    <span>{sensor.label}</span>
                    <em
                      className={`status-text ${resolveSensorTone(
                        sensor.status,
                        sensor.value,
                      )}`}
                    >
                      {sensor.status}
                    </em>
                  </div>
                  <strong>
                    {sensor.value}
                    <small>{sensor.unit}</small>
                  </strong>
                  <div className="sensor-meta">
                    <span>Target {sensor.target}</span>
                    <span>Deviation {sensor.deviation}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="loading-state">No sensors in this status filter.</div>
            )}
          </div>
        </Card>

        <Card id="twin-devices" className="xl:col-span-5">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Device Lattice</span>
              <h2>Asset state mapping</h2>
            </div>
            <span className="panel-caption">
              Device health is shown here for twin-space interpretation and action handoff.
            </span>
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
              <div className="loading-state">Device lattice is loading...</div>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
