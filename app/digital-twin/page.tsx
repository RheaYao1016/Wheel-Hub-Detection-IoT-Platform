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
import { useLocale } from "../components/Locale/LocaleProvider";
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
  const { text, t } = useLocale();
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
        setError(t("pages.digital_twin.copy001"));
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
    return snapshot.sensors.filter(
      (sensor) => sensor.status === activeSensorStatus,
    );
  }, [activeSensorStatus, snapshot]);

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
  }, [snapshot, text]);

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
  }, [snapshot, text]);

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
  }, [snapshot, text]);

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
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
          {t("pages.digital_twin.copy037")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("twin-lanes")}
        >
          {t("pages.digital_twin.copy038")}
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
              <span className="panel-kicker">
                {t("pages.digital_twin.copy067")}
              </span>
              <h2>{t("pages.digital_twin.copy068")}</h2>
            </div>
            <span className="status-chip status-success">
              {t("pages.digital_twin.copy069")}
            </span>
          </div>

          <div className="twin-stage-frame">
            <ModelViewer />
          </div>
        </Card>

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

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card id="twin-sensors" className="xl:col-span-7">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {t("pages.digital_twin.copy075")}
              </span>
              <h2>{t("pages.digital_twin.copy076")}</h2>
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
                {status === "all" ? t("pages.digital_twin.copy077") : status}
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
                    <span>
                      {t("pages.digital_twin.copy078")} {sensor.target}
                    </span>
                    <span>
                      {t("pages.digital_twin.copy079")} {sensor.deviation}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="loading-state">
                {t("pages.digital_twin.copy080")}
              </div>
            )}
          </div>
        </Card>

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
                    <span>
                      {t("pages.digital_twin.copy083")} {device.utilization}%
                    </span>
                    <span>
                      {t("pages.digital_twin.copy084")} {device.temperature} C
                    </span>
                    <span>{device.note}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="loading-state">
                {t("pages.digital_twin.copy085")}
              </div>
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
