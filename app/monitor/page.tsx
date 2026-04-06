"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import { PlatformAuthError, fetchPlatformData } from "@/lib/dashboard-client";
import { clearAuthSession } from "@/lib/auth-session";
import { useSessionGuard } from "@/app/hooks/useSessionGuard";
import type { MonitorSnapshot } from "@/types/platform";

export default function MonitorPage() {
  const router = useRouter();
  const ready = useSessionGuard(["admin", "user"]);
  const [snapshot, setSnapshot] = useState<MonitorSnapshot | null>(null);
  const [error, setError] = useState("");
  const [cameraToast, setCameraToast] = useState<string | null>(null);
  const videoRefs = [useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null), useRef<HTMLVideoElement>(null)];

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const load = async () => {
      try {
        const payload = await fetchPlatformData<MonitorSnapshot>("/dashboard/monitor", "/api/monitor");
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
  }, [ready, router, videoRefs]);

  useEffect(() => {
    if (!cameraToast) return;
    const timer = window.setTimeout(() => setCameraToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [cameraToast]);

  const cameraStats = useMemo(() => {
    const cameras = snapshot?.cameras ?? [];
    const onlineCount = cameras.filter((camera) => camera.status === "在线").length;
    const standbyCount = cameras.filter((camera) => camera.status === "待命").length;
    const highRiskAlerts = snapshot?.alerts.filter((alert) => alert.level === "高").length ?? 0;

    return [
      { label: "在线通道", value: `${onlineCount}/${cameras.length || 4}`, note: "当前已接入的实时监控视频流" },
      { label: "待命通道", value: `${standbyCount}`, note: "保留给临时巡检和补位检查使用" },
      { label: "高优先告警", value: `${highRiskAlerts}`, note: "需要班组长或设备人员优先关注" },
    ];
  }, [snapshot]);

  const startCamera = async (index: number) => {
    const target = videoRefs[index].current;
    if (!target) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      target.srcObject = stream;
      await target.play();
      setCameraToast(`已打开 ${snapshot?.cameras[index]?.title ?? `摄像头 ${index + 1}`} 预览。`);
    } catch (requestError) {
      console.error(requestError);
      setCameraToast("无法打开摄像头，请检查浏览器权限设置。");
    }
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/operations"
        title="Loading Monitoring Center"
        description="Preparing the live camera wall and alert handling layout..."
      />
    );
  }

  return (
    <div className="page-shell monitor-shell pt-0 pb-10">
      <BackButton fallbackHref="/operations" />

      <section className="monitor-header">
        <div>
          <span className="eyebrow">{snapshot?.headline.title ?? "生产监控与异常追踪"}</span>
          <h1>实时巡检中心</h1>
          <p>
            {snapshot?.headline.description ??
              "聚焦视频监控、现场巡检和异常响应，让监控页只承担现场感知与即时处理。"}
          </p>
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

      <section className="monitor-overview-grid">
        {cameraStats.map((item) => (
          <Card key={item.label} className="monitor-overview-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.note}</p>
          </Card>
        ))}
      </section>

      {error ? (
        <div className="empty-state">
          <span>!</span>
          {error}
        </div>
      ) : null}

      <Card>
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Camera Wall</span>
            <h2>四路现场视频墙</h2>
          </div>
          <span className="panel-caption">支持本机摄像头预览和现场视频流接入</span>
        </div>
        <div className="camera-grid">
          {videoRefs.map((ref, index) => {
            const camera = snapshot?.cameras[index];
            return (
              <div key={camera?.id ?? index} className="camera-card">
                <video ref={ref} className="camera-frame" muted playsInline />
                <div className="camera-status-chip">{camera?.status ?? "待命"}</div>
                <div className="camera-overlay">
                  <div>
                    <strong>{camera?.title ?? `摄像头 ${index + 1}`}</strong>
                    <span>{camera?.location ?? "产线采集点"}</span>
                    <p>{camera?.description ?? "等待实时视频接入"}</p>
                  </div>
                  <button type="button" onClick={() => startCamera(index)}>
                    {camera?.status === "待命" ? "启动预览" : "查看通道"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-5">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Device Watch</span>
              <h2>现场设备巡检清单</h2>
            </div>
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
                  <span>连续运行 {device.runtimeHours}h</span>
                  <span>温度 {device.temperature}°C</span>
                  <span>{device.note}</span>
                </div>
              </div>
            )) ?? <div className="loading-state">设备巡检清单加载中...</div>}
          </div>
        </Card>

        <Card className="xl:col-span-7">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Exception Feed</span>
              <h2>告警与处置流</h2>
            </div>
          </div>
          <div className="alert-stack">
            {snapshot?.alerts.map((alert) => (
              <div key={alert.id} className="alert-item">
                <div className="alert-level">{alert.level}</div>
                <div>
                  <strong>{alert.title}</strong>
                  <span>
                    {alert.station} / {alert.timestamp}
                  </span>
                  <p>{alert.detail}</p>
                </div>
              </div>
            )) ?? <div className="loading-state">告警流加载中...</div>}
          </div>
        </Card>
      </section>

      {cameraToast ? <div className="floating-toast success">{cameraToast}</div> : null}
    </div>
  );
}
