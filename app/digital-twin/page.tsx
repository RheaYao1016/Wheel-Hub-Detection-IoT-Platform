"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import ModelViewer from "../components/ThreeViewer/ModelViewer";
import { PlatformAuthError, fetchPlatformData } from "@/lib/dashboard-client";
import { clearAuthSession } from "@/lib/auth-session";
import { useSessionGuard } from "@/app/hooks/useSessionGuard";
import type { DigitalTwinSnapshot } from "@/types/platform";

export default function DigitalTwinPage() {
  const router = useRouter();
  const ready = useSessionGuard(["admin", "user"]);
  const [snapshot, setSnapshot] = useState<DigitalTwinSnapshot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const load = async () => {
      try {
        const payload = await fetchPlatformData<DigitalTwinSnapshot>("/dashboard/digital-twin", "/api/digital-twin");
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
        setError("数字孪生模块暂时不可用，请稍后重试。");
      }
    };

    load();
    const timer = window.setInterval(load, 15000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [ready, router]);

  const insightCards = useMemo(() => {
    if (!snapshot) return [];

    const normalSensors = snapshot.sensors.filter((sensor) => sensor.status === "正常").length;
    const avgUtilization = Math.round(
      snapshot.devices.reduce((total, device) => total + device.utilization, 0) / Math.max(snapshot.devices.length, 1),
    );
    const riskSensors = snapshot.sensors.filter((sensor) => sensor.status !== "正常").length;

    return [
      { label: "传感器稳定度", value: `${normalSensors}/${snapshot.sensors.length}`, note: "关键测点维持在正常区间" },
      { label: "平均设备利用率", value: `${avgUtilization}%`, note: "用于映射三维场景中的负载状态" },
      { label: "需关注测点", value: `${riskSensors}`, note: "集中提示偏差或阈值边缘波动" },
    ];
  }, [snapshot]);

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/operations"
        title="Loading Digital Twin"
        description="Preparing the 3D scene, sensor map, and process layout..."
      />
    );
  }

  return (
    <div className="page-shell twin-shell pt-0 pb-10">
      <BackButton fallbackHref="/operations" />

      <section className="twin-hero-grid">
        <Card className="twin-summary-card">
          <span className="eyebrow">{snapshot?.summary.sceneLabel ?? "Twin Mesh / Operational Mapping"}</span>
          <h1>{snapshot?.summary.title ?? "数字孪生作业单元"}</h1>
          <p>
            {snapshot?.summary.description ??
              "数字孪生页只保留 3D 场景、传感器、工艺流程和设备映射，不再承担趋势、告警和分布图的重复展示。"}
          </p>
          <div className="enterprise-highlight-list">
            <div>
              <strong>专注空间映射</strong>
              <p>把设备、传感器和工艺步骤映射到统一空间坐标里，帮助工程师理解设备状态与现场结构之间的关系。</p>
            </div>
            <div>
              <strong>专注工艺过程</strong>
              <p>每个步骤都强调流程顺序和执行时长，避免与监控页、指挥中心重复争夺同一批业务数据。</p>
            </div>
          </div>
        </Card>

        <Card className="twin-stage-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Realtime 3D</span>
              <h2>设备三维场景</h2>
            </div>
            <span className="status-chip status-success">可交互</span>
          </div>
          <div className="twin-stage-frame">
            <ModelViewer />
          </div>
        </Card>
      </section>

      {error ? (
        <div className="empty-state">
          <span>!</span>
          {error}
        </div>
      ) : null}

      <section className="twin-kpi-grid">
        {insightCards.length ? (
          insightCards.map((item) => (
            <Card key={item.label} className="twin-kpi-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.note}</p>
            </Card>
          ))
        ) : (
          <Card className="twin-kpi-card twin-kpi-card-placeholder">
            <span>孪生画像加载中</span>
            <strong>--</strong>
            <p>后端数据返回后会同步刷新这一块内容。</p>
          </Card>
        )}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Sensor Map</span>
              <h2>实时传感器画像</h2>
            </div>
          </div>
          <div className="sensor-grid">
            {snapshot?.sensors.map((sensor) => (
              <div key={sensor.label} className="sensor-tile">
                <div className="sensor-tile-top">
                  <span>{sensor.label}</span>
                  <em className={`status-text ${sensor.status === "正常" ? "good" : sensor.status === "关注" ? "warn" : "danger"}`}>
                    {sensor.status}
                  </em>
                </div>
                <strong>
                  {sensor.value}
                  <small>{sensor.unit}</small>
                </strong>
                <div className="sensor-meta">
                  <span>目标 {sensor.target}</span>
                  <span>偏差 {sensor.deviation}</span>
                </div>
              </div>
            )) ?? <div className="loading-state">传感器加载中...</div>}
          </div>
        </Card>

        <Card className="xl:col-span-5">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Workflow</span>
              <h2>工艺步骤编排</h2>
            </div>
          </div>
          <div className="twin-flow-list">
            {snapshot?.flowSteps.map((step, index) => (
              <div key={step.title} className={`twin-flow-item ${index === 2 ? "active" : ""}`}>
                <div className="twin-flow-index">{String(index + 1).padStart(2, "0")}</div>
                <div>
                  <strong>{step.title}</strong>
                  <span>{step.meta}</span>
                </div>
                <em>{step.duration}</em>
              </div>
            )) ?? <div className="loading-state">流程加载中...</div>}
          </div>
        </Card>
      </section>

      <Card>
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Device Lattice</span>
            <h2>设备状态映射</h2>
          </div>
          <span className="panel-caption">仅保留与三维模型强相关的设备运行状态，不重复展示告警流和统计分布。</span>
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
                <span>温度 {device.temperature}°C</span>
                <span>{device.note}</span>
              </div>
            </div>
          )) ?? <div className="loading-state">设备状态加载中...</div>}
        </div>
      </Card>
    </div>
  );
}
