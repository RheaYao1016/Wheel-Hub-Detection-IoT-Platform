"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import ModelViewer from "../components/ThreeViewer/ModelViewer";
import { fetchPlatformData } from "@/lib/dashboard-client";
import { useSessionGuard } from "../hooks/useSessionGuard";
import type { DigitalTwinSnapshot, MonitorSnapshot } from "@/types/platform";

export default function OperationsPage() {
  const ready = useSessionGuard(["admin", "user"]);
  const [monitor, setMonitor] = useState<MonitorSnapshot | null>(null);
  const [twin, setTwin] = useState<DigitalTwinSnapshot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const load = async () => {
      try {
        const [monitorData, twinData] = await Promise.all([
          fetchPlatformData<MonitorSnapshot>("/dashboard/monitor", "/api/monitor"),
          fetchPlatformData<DigitalTwinSnapshot>("/dashboard/digital-twin", "/api/digital-twin"),
        ]);
        if (!active) return;
        setMonitor(monitorData);
        setTwin(twinData);
        setError("");
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        setError("现场中台加载失败，请确认监控与数字孪生接口可用。");
      }
    };

    load();
    const timer = window.setInterval(load, 15000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [ready]);

  const summaryCards = useMemo(() => {
    const onlineCameras = monitor?.cameras.filter((camera) => camera.status === "在线").length ?? 0;
    const highAlerts = monitor?.alerts.filter((alert) => alert.level === "高").length ?? 0;
    const stableSensors = twin?.sensors.filter((sensor) => sensor.status === "正常").length ?? 0;
    const mappedDevices = twin?.devices.length ?? 0;

    return [
      { label: "在线通道", value: `${onlineCameras}/${monitor?.cameras.length ?? 0}`, note: "归属现场监控子页" },
      { label: "高优先告警", value: `${highAlerts}`, note: "只在现场域做实时响应" },
      { label: "稳定传感器", value: `${stableSensors}/${twin?.sensors.length ?? 0}`, note: "归属数字孪生子页" },
      { label: "映射设备", value: `${mappedDevices}`, note: "用于 3D 设备状态联动" },
    ];
  }, [monitor, twin]);

  const hasLoaded = Boolean(monitor && twin);

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/visualize"
        title="Loading Operations Hub"
        description="Preparing monitoring and digital twin overview layout..."
      />
    );
  }

  return (
    <div className="enterprise-shell operations-shell">
      <BackButton fallbackHref="/visualize" />

      <section className="enterprise-hero">
        <div>
          <span className="eyebrow">Operations Hub</span>
          <h1>现场中台总入口</h1>
          <p>
            把现场监控和数字孪生合并为同一个顶层入口。这里展示两类能力的边界和最近状态，
            详细视频流、告警流、3D 场景和传感器映射只保留在各自的详情页里，避免现场数据在多个菜单里重复出现。
          </p>
        </div>
        <div className="enterprise-hero-metrics">
          <div>
            <span>监控通道</span>
            <strong>{hasLoaded ? String(monitor?.cameras.length ?? 0) : "--"}</strong>
          </div>
          <div>
            <span>孪生传感器</span>
            <strong>{hasLoaded ? String(twin?.sensors.length ?? 0) : "--"}</strong>
          </div>
          <div>
            <span>设备对象</span>
            <strong>{hasLoaded ? String(twin?.devices.length ?? 0) : "--"}</strong>
          </div>
        </div>
      </section>

      {error ? (
        <div className="empty-state">
          <span>!</span>
          {error}
        </div>
      ) : null}

      <section className="operations-summary-grid">
        {summaryCards.map((item) => (
          <Card key={item.label} className="operations-summary-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.note}</p>
          </Card>
        ))}
      </section>

      <section className="operations-grid">
        <Card className="operations-card">
          <div className="workspace-capability-top">
            <div>
              <span className="panel-kicker">Live Monitoring</span>
              <h2>现场监控域</h2>
            </div>
            <span className="status-chip status-success">{hasLoaded ? "视频、告警、巡检" : "加载中"}</span>
          </div>
          <div className="workspace-capability-meta">
            <div>
              <span>设备巡检</span>
              <strong>{hasLoaded ? String(monitor?.devices.length ?? 0) : "--"}</strong>
            </div>
            <div>
              <span>最新告警</span>
              <strong>{hasLoaded ? String(monitor?.alerts.length ?? 0) : "--"}</strong>
            </div>
          </div>
          <div className="workspace-preview-list">
            {(monitor?.alerts ?? []).slice(0, 3).map((alert) => (
              <div key={alert.id} className="workspace-preview-item">
                <strong>{alert.title}</strong>
                <span>
                  {alert.station} / {alert.detail}
                </span>
              </div>
            ))}
          </div>
          <div className="enterprise-note-card">
            <strong>这一类数据只留在监控域</strong>
            <span>视频墙、实时告警和现场巡检只在监控页承担主要展示与处理，不在其他顶层页面再重复铺开。</span>
          </div>
          <div className="workspace-capability-actions">
            <Link href="/monitor" className="enterprise-primary-button">
              打开监控详情
            </Link>
          </div>
        </Card>

        <Card className="operations-card">
          <div className="workspace-capability-top">
            <div>
              <span className="panel-kicker">Digital Twin</span>
              <h2>数字孪生域</h2>
            </div>
            <span className="status-chip status-success">{hasLoaded ? "3D、工艺、传感器" : "加载中"}</span>
          </div>
          <div className="operations-twin-stage">
            <ModelViewer />
          </div>
          <div className="workspace-capability-meta">
            <div>
              <span>工艺步骤</span>
              <strong>{hasLoaded ? String(twin?.flowSteps.length ?? 0) : "--"}</strong>
            </div>
            <div>
              <span>关键传感器</span>
              <strong>{hasLoaded ? String(twin?.sensors.length ?? 0) : "--"}</strong>
            </div>
          </div>
          <div className="workspace-preview-list">
            {(twin?.sensors ?? []).slice(0, 3).map((sensor) => (
              <div key={sensor.label} className="workspace-preview-item">
                <strong>{sensor.label}</strong>
                <span>
                  {sensor.value}
                  {sensor.unit} / {sensor.status}
                </span>
              </div>
            ))}
          </div>
          <div className="workspace-capability-actions">
            <Link href="/digital-twin" className="enterprise-primary-button">
              打开孪生详情
            </Link>
          </div>
        </Card>
      </section>

      <section className="operations-grid">
        <Card className="operations-card">
          <div className="workspace-capability-top">
            <div>
              <span className="panel-kicker">Ownership</span>
              <h2>数据归属规则</h2>
            </div>
          </div>
          <div className="enterprise-highlight-list">
            <div>
              <strong>监控域负责即时响应</strong>
              <p>相机通道、告警流、设备巡检属于现场即时问题，不应该再出现在数字孪生或工作台里作为主视图。</p>
            </div>
            <div>
              <strong>孪生域负责空间与工艺映射</strong>
              <p>3D 模型、传感器点位、流程步骤和设备映射属于孪生域，不再在监控页重复做整块展示。</p>
            </div>
          </div>
        </Card>

        <Card className="operations-card">
          <div className="workspace-capability-top">
            <div>
              <span className="panel-kicker">Suggested Flow</span>
              <h2>推荐查看路径</h2>
            </div>
          </div>
          <div className="workspace-preview-list">
            <div className="workspace-preview-item">
              <strong>先看指挥中心</strong>
              <span>判断是否为节拍、质量或工单问题。</span>
            </div>
            <div className="workspace-preview-item">
              <strong>再进现场中台</strong>
              <span>根据问题性质选择监控详情或数字孪生详情继续排查。</span>
            </div>
            <div className="workspace-preview-item">
              <strong>最后去后台闭环</strong>
              <span>需要派发、导入、同步或治理时再进入后台，不让现场页承接治理动作。</span>
            </div>
          </div>
          <div className="workspace-capability-actions">
            <Link href="/admin" className="enterprise-secondary-button">
              前往后台治理
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
