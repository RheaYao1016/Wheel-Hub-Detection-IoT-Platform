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
import { useLocale } from "../components/Locale/LocaleProvider";
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
  const { text, t } = useLocale();
  const [snapshot, setSnapshot] = useState<MonitorSnapshot | null>(null);
  const [error, setError] = useState("");
  const [cameraToast, setCameraToast] = useState<string | null>(null);
  const [openedPreviews, setOpenedPreviews] = useState<Record<number, true>>(
    {},
  );
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
        setError(t("pages.monitor.copy001"));
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
          previewCount > 0
            ? t("pages.monitor.copy006", { p1: previewCount })
            : t("pages.monitor.copy007"),
        state: previewCount > 0 ? "done" : hasSnapshot ? "active" : "upcoming",
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
  }, [previewCount, snapshot, text]);

  const coreMetrics = useMemo<CoreFlowMetric[]>(() => {
    return [
      {
        label: t("pages.monitor.copy014"),
        value: String(snapshot?.cameras.length ?? 0),
        note: t("pages.monitor.copy015"),
      },
      {
        label: t("pages.monitor.copy016"),
        value: String(previewCount),
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
  }, [previewCount, snapshot, text]);

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
  }, [snapshot, text]);

  const startCamera = async (index: number) => {
    const target = videoRefs.current[index];
    if (!target) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      target.srcObject = stream;
      await target.play();
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
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
          {t("pages.digital_twin.copy037")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("monitor-lanes")}
        >
          {t("pages.digital_twin.copy038")}
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

      {error ? (
        <div className="empty-state">
          <span>!</span>
          {error}
        </div>
      ) : null}

      <Card id="monitor-cameras">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">{t("pages.monitor.copy040")}</span>
            <h2>{t("pages.monitor.copy061")}</h2>
          </div>
          <span className="panel-caption">{t("pages.monitor.copy062")}</span>
        </div>

        <div className="camera-grid">
          {(snapshot?.cameras.length
            ? snapshot.cameras
            : new Array(4).fill(null)
          ).map((camera, index) => {
            const cameraLabel =
              camera?.title ?? t("pages.monitor.copy033", { p1: index + 1 });
            const locationLabel =
              camera?.location ?? t("pages.monitor.copy063");
            const statusLabel = camera?.status ?? t("pages.monitor.copy064");
            const descLabel = camera?.description ?? t("pages.monitor.copy065");

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
                    {openedPreviews[index]
                      ? t("pages.monitor.copy066")
                      : t("pages.monitor.copy067")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card id="monitor-alerts" className="xl:col-span-7">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">{t("pages.monitor.copy068")}</span>
              <h2>{t("pages.monitor.copy069")}</h2>
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
                {level === "all" ? t("pages.monitor.copy070") : level}
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
              <div className="loading-state">{t("pages.monitor.copy071")}</div>
            )}
          </div>
        </Card>

        <Card id="monitor-devices" className="xl:col-span-5">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">{t("pages.monitor.copy072")}</span>
              <h2>{t("pages.monitor.copy073")}</h2>
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
              <div className="loading-state">{t("pages.monitor.copy074")}</div>
            )}
          </div>
        </Card>
      </section>

      {cameraToast ? (
        <div className="floating-toast success">{cameraToast}</div>
      ) : null}
    </div>
  );
}
