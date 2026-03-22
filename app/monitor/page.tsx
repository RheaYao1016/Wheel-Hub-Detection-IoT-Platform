"use client";

import { useEffect, useRef, useState } from "react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import PieChart from "../components/Charts/PieChart";
import LineChart from "../components/Charts/LineChart";
import type { MonitorSnapshot } from "@/types/platform";

export default function MonitorPage() {
  const [snapshot, setSnapshot] = useState<MonitorSnapshot | null>(null);
  const [error, setError] = useState("");
  const videoRefs = [
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
    useRef<HTMLVideoElement>(null),
  ];

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch("/api/monitor", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("监控数据加载失败");
        }
        const payload = (await response.json()) as MonitorSnapshot;
        if (!active) return;
        setSnapshot(payload);
      } catch (requestError) {
        if (!active) return;
        console.error(requestError);
        setError("监控中心数据暂时不可用，请稍后刷新。");
      }
    };

    load();
    const timer = window.setInterval(load, 12000);
    return () => {
      active = false;
      window.clearInterval(timer);
      videoRefs.forEach((ref) => {
        const stream = ref.current?.srcObject as MediaStream | undefined;
        stream?.getTracks().forEach((track) => track.stop());
      });
    };
  }, [videoRefs]);

  const startCamera = async (index: number) => {
    const target = videoRefs[index].current;
    if (!target) {
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      target.srcObject = stream;
      await target.play();
    } catch (requestError) {
      console.error(requestError);
      window.alert("无法打开摄像头，请检查浏览器权限设置。");
    }
  };

  return (
    <div className="page-shell monitor-shell pt-0 pb-10">
      <BackButton fallbackHref="/visualize" />

      <section className="monitor-header">
        <div>
          <span className="eyebrow">{snapshot?.headline.title ?? "生产监控与异常追踪"}</span>
          <h1>实时巡检中心</h1>
          <p>{snapshot?.headline.description ?? "多路视频、设备状态、趋势曲线和告警并行展示，服务班组长与运维协同排障。"}</p>
        </div>
        <div className="monitor-summary">
          {snapshot?.devices.slice(0, 3).map((device) => (
            <div key={device.name}>
              <span>{device.name}</span>
              <strong>{device.utilization}%</strong>
              <em>{device.status}</em>
            </div>
          )) ?? <div className="loading-state">设备摘要加载中...</div>}
        </div>
      </section>

      {error ? <div className="empty-state"><span>!</span>{error}</div> : null}

      <Card>
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Camera Wall</span>
            <h2>四路监控窗口</h2>
          </div>
        </div>
        <div className="camera-grid">
          {videoRefs.map((ref, index) => {
            const camera = snapshot?.cameras[index];
            return (
              <div key={camera?.id ?? index} className="camera-card">
                <video ref={ref} className="camera-frame" muted playsInline />
                <div className="camera-overlay">
                  <div>
                    <strong>{camera?.title ?? `摄像头 ${index + 1}`}</strong>
                    <span>{camera?.location ?? "产线侧采集点"}</span>
                    <p>{camera?.description ?? "等待实时视频接入"}</p>
                  </div>
                  <button type="button" onClick={() => startCamera(index)}>
                    {camera?.status === "待命" ? "启动预览" : "查看监控"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-7 chart-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Throughput Monitor</span>
              <h2>产线负载趋势</h2>
            </div>
          </div>
          <div className="chart-body">{snapshot ? <LineChart data={snapshot.trend} /> : <div className="loading-state">趋势加载中...</div>}</div>
        </Card>

        <Card className="xl:col-span-5">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Device Watch</span>
              <h2>设备巡检清单</h2>
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
                  <span>连续运行 {device.runtimeHours}h</span>
                  <span>温度 {device.temperature}°C</span>
                  <span>{device.note}</span>
                </div>
              </div>
            )) ?? <div className="loading-state">设备清单加载中...</div>}
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-6 chart-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Size Mix</span>
              <h2>尺寸占比</h2>
            </div>
          </div>
          <div className="chart-body">{snapshot ? <PieChart title="尺寸占比" data={snapshot.sizeDistribution} /> : <div className="loading-state">图表加载中...</div>}</div>
        </Card>

        <Card className="xl:col-span-6 chart-card">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Model Mix</span>
              <h2>型号占比</h2>
            </div>
          </div>
          <div className="chart-body">{snapshot ? <PieChart title="型号占比" data={snapshot.modelDistribution} /> : <div className="loading-state">图表加载中...</div>}</div>
        </Card>
      </section>

      <Card>
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Exception Feed</span>
            <h2>告警事件流</h2>
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
          )) ?? <div className="loading-state">事件流加载中...</div>}
        </div>
      </Card>
    </div>
  );
}
