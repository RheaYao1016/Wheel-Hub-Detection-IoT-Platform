"use client";

import { useEffect, useState } from "react";
import BackButton from "../components/Layout/BackButton";
import PieChart from "../components/Charts/PieChart";
import Card from "../components/Layout/Card";
import ModelViewer from "../components/ThreeViewer/ModelViewer";
import type { DigitalTwinSnapshot } from "@/types/platform";

export default function DigitalTwinPage() {
  const [snapshot, setSnapshot] = useState<DigitalTwinSnapshot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/digital-twin", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("数字孪生数据加载失败");
        }
        const payload = (await response.json()) as DigitalTwinSnapshot;
        if (!active) return;
        setSnapshot(payload);
      } catch (requestError) {
        if (!active) return;
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
  }, []);

  return (
    <div className="page-shell twin-shell pt-0 pb-10">
      <BackButton fallbackHref="/visualize" />

      <section className="twin-hero-grid">
        <Card className="twin-summary-card">
          <span className="eyebrow">{snapshot?.summary.sceneLabel ?? "Twin Mesh / Operational Mapping"}</span>
          <h1>{snapshot?.summary.title ?? "数字孪生作业单元"}</h1>
          <p>
            {snapshot?.summary.description ??
              "通过 3D 模型、传感器、工艺步骤和告警闭环，把检测装备的运行状态压缩到一个可操作的孪生界面中。"}
          </p>
          <div className="twin-summary-assets">
            <div className="twin-asset-card">
              <span>模型渲染视图</span>
              <img src="/images/TianXiaWuShuang.png" alt="模型渲染视图" />
            </div>
            <div className="twin-asset-card">
              <span>设备建模骨架</span>
              <img src="/images/she_bei_jian_mo.png" alt="设备建模骨架" />
            </div>
          </div>
        </Card>

        <Card className="twin-stage-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Realtime 3D</span>
              <h2>装备三维场景</h2>
            </div>
            <span className="status-chip status-success">交互可用</span>
          </div>
          <div className="twin-stage-frame">
            <ModelViewer />
          </div>
        </Card>
      </section>

      {error ? <div className="empty-state"><span>!</span>{error}</div> : null}

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
                <span>{sensor.label}</span>
                <strong>
                  {sensor.value}
                  <small>{sensor.unit}</small>
                </strong>
                <div className="sensor-meta">
                  <span>目标 {sensor.target}</span>
                  <span>偏差 {sensor.deviation}</span>
                </div>
                <em className={`status-text ${sensor.status === "正常" ? "good" : sensor.status === "关注" ? "warn" : "danger"}`}>
                  {sensor.status}
                </em>
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

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-6 chart-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Size Profile</span>
              <h2>尺寸分布映射</h2>
            </div>
          </div>
          <div className="chart-body">{snapshot ? <PieChart title="尺寸分布" data={snapshot.sizeDistribution} /> : <div className="loading-state">分布加载中...</div>}</div>
        </Card>

        <Card className="xl:col-span-6 chart-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Model Profile</span>
              <h2>型号结构映射</h2>
            </div>
          </div>
          <div className="chart-body">{snapshot ? <PieChart title="型号分布" data={snapshot.modelDistribution} /> : <div className="loading-state">分布加载中...</div>}</div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Device Lattice</span>
              <h2>设备状态矩阵</h2>
            </div>
          </div>
          <div className="device-stack">
            {snapshot?.devices.map((device) => (
              <div key={device.name} className="device-item">
                <div className="device-item-top">
                  <strong>{device.name}</strong>
                  <span className={`status-chip ${device.status === "运行中" ? "status-success" : device.status === "维护中" ? "status-warning" : "status-danger"}`}>
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

        <Card className="xl:col-span-5">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Alert Linkage</span>
              <h2>告警闭环</h2>
            </div>
          </div>
          <div className="alert-stack">
            {snapshot?.alerts.map((alert) => (
              <div key={alert.id} className="alert-item">
                <div className="alert-level">{alert.level}</div>
                <div>
                  <strong>{alert.title}</strong>
                  <span>
                    {alert.station} · {alert.timestamp}
                  </span>
                  <p>{alert.detail}</p>
                </div>
              </div>
            )) ?? <div className="loading-state">告警加载中...</div>}
          </div>
        </Card>
      </section>
    </div>
  );
}
