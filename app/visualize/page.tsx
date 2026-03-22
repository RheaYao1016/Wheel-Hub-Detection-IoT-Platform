"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import BackButton from "../components/Layout/BackButton";
import PieChart from "../components/Charts/PieChart";
import LineChart from "../components/Charts/LineChart";
import ModelViewer from "../components/ThreeViewer/ModelViewer";
import Card from "../components/Layout/Card";
import { fetchPlatformData } from "@/lib/dashboard-client";
import type { CommandCenterSnapshot, DeviceSnapshot } from "@/types/platform";

export default function VisualizePage() {
  const [snapshot, setSnapshot] = useState<CommandCenterSnapshot | null>(null);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const logBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const payload = await fetchPlatformData<CommandCenterSnapshot>("/dashboard/command-center", "/api/command-center");
        if (!active) return;
        setSnapshot(payload);
        setLogs(payload.logs);
      } catch (requestError) {
        if (!active) return;
        console.error(requestError);
        setError("指挥中心数据加载失败，请稍后重试。");
      }
    };

    load();
    const timer = window.setInterval(load, 12000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!snapshot?.logs.length) {
      return;
    }

    setLogs(snapshot.logs);
    const timer = window.setInterval(() => {
      setLogs((previous) => {
        const nextLine = snapshot.logs[(previous.length + 1) % snapshot.logs.length];
        const next = [...previous, nextLine];
        return next.length > 12 ? next.slice(next.length - 12) : next;
      });
    }, 2400);

    return () => window.clearInterval(timer);
  }, [snapshot]);

  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

  const highlightedDevice = useMemo<DeviceSnapshot | null>(() => snapshot?.devices[0] ?? null, [snapshot]);

  return (
    <div className="page-shell command-center-shell pt-0 pb-10">
      <BackButton fallbackHref="/home" />

      <section className="command-hero">
        <div className="command-copy">
          <span className="eyebrow">{snapshot?.headline.subtitle ?? "Command Center / Inspection Intelligence"}</span>
          <h1>{snapshot?.headline.title ?? "轮毂检测 IoT 指挥中心"}</h1>
          <p>
            {snapshot?.headline.description ??
              "围绕检测、数字孪生、监控与运营联动打造统一指挥台，支持本地演示数据与数据库驱动的双模式运行。"}
          </p>
          <div className="command-metric-row">
            {snapshot?.metrics.map((metric) => (
              <div key={metric.label} className="command-metric-tile">
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <em className={`trend-${metric.trend}`}>{metric.delta}</em>
              </div>
            )) ?? (
              <div className="loading-state">正在加载经营指标...</div>
            )}
          </div>
        </div>

        <Card className="command-hero-visual">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">3D Digital Twin</span>
              <h2>装备状态总览</h2>
            </div>
            <span className="status-chip status-success">实时同步</span>
          </div>
          <div className="command-model-frame">
            <ModelViewer />
          </div>
          {highlightedDevice && (
            <div className="command-hero-footer">
              <div>
                <span>重点设备</span>
                <strong>{highlightedDevice.name}</strong>
              </div>
              <div>
                <span>利用率</span>
                <strong>{highlightedDevice.utilization}%</strong>
              </div>
              <div>
                <span>温度</span>
                <strong>{highlightedDevice.temperature}°C</strong>
              </div>
            </div>
          )}
        </Card>
      </section>

      {error ? <div className="empty-state"><span>!</span>{error}</div> : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-4 chart-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Quality Mix</span>
              <h2>质量结构分布</h2>
            </div>
          </div>
          <div className="chart-body">{snapshot ? <PieChart title="质量结构" data={snapshot.quality} /> : <div className="loading-state">图表加载中...</div>}</div>
        </Card>

        <Card className="xl:col-span-8 chart-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">30 Day Throughput</span>
              <h2>近 30 天检测趋势</h2>
            </div>
            <span className="panel-caption">每 12 秒自动刷新</span>
          </div>
          <div className="chart-body">{snapshot ? <LineChart data={snapshot.trend} /> : <div className="loading-state">趋势加载中...</div>}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-5">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Live Queue</span>
              <h2>实时工单队列</h2>
            </div>
            <span className="panel-caption">滚动展示当前批次</span>
          </div>
          <div className="live-queue">
            {snapshot?.liveProjects.map((project) => (
              <div key={project.id} className="live-queue-item">
                <div>
                  <strong>{project.id}</strong>
                  <span>
                    {project.stage} · {project.model}
                  </span>
                </div>
                <div className="live-queue-meta">
                  <span>{project.eta}</span>
                  <span className={`badge ${project.result === "FAIL" ? "fail" : project.result === "PASS" ? "pass" : ""}`}>
                    {project.result || "进行中"}
                  </span>
                </div>
              </div>
            )) ?? <div className="loading-state">队列加载中...</div>}
          </div>
        </Card>

        <Card className="xl:col-span-4">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Device Matrix</span>
              <h2>设备健康矩阵</h2>
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
                  <span>{device.temperature}°C</span>
                  <span>{device.note}</span>
                </div>
              </div>
            )) ?? <div className="loading-state">设备状态加载中...</div>}
          </div>
        </Card>

        <Card className="xl:col-span-3">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Alarm Center</span>
              <h2>告警中心</h2>
            </div>
          </div>
          <div className="alert-stack compact">
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
      </div>

      <Card>
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Execution Log</span>
            <h2>实时日志流</h2>
          </div>
          <span className="panel-caption">日志滚动模拟当前设备与算法联动</span>
        </div>
        <div ref={logBoxRef} className="logbox command-logbox">
          {logs.length ? logs.map((line, index) => <div key={`${line}-${index}`}>{line}</div>) : <div className="loading-state">日志初始化中...</div>}
        </div>
      </Card>
    </div>
  );
}
