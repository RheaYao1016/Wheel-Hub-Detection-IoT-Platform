"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "../components/Layout/BackButton";
import PieChart from "../components/Charts/PieChart";
import LineChart from "../components/Charts/LineChart";
import Card from "../components/Layout/Card";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import { PlatformAuthError, fetchPlatformData } from "@/lib/dashboard-client";
import { clearAuthSession } from "@/lib/auth-session";
import { useSessionGuard } from "@/app/hooks/useSessionGuard";
import type { CommandCenterSnapshot } from "@/types/platform";
import { Badge } from "../components/ui/Badge";
import { ScrollArea } from "../components/ui/ScrollArea";

export default function VisualizePage() {
  const router = useRouter();
  const ready = useSessionGuard(["admin", "user"]);
  const [snapshot, setSnapshot] = useState<CommandCenterSnapshot | null>(null);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const logBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const load = async () => {
      try {
        const payload = await fetchPlatformData<CommandCenterSnapshot>("/dashboard/command-center", "/api/command-center");
        if (!active) return;
        setSnapshot(payload);
        setLogs(payload.logs);
        setError("");
      } catch (requestError) {
        if (!active) return;
        if (requestError instanceof PlatformAuthError) {
          clearAuthSession();
          router.replace("/login");
          return;
        }
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
  }, [ready, router]);

  useEffect(() => {
    if (!snapshot?.logs.length) return;

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

  const storyCards = useMemo(
    () => [
      { label: "页面职责", value: "运营总览", note: "只保留全局指标、质量结构、节拍趋势与工单流转。" },
      { label: "数据视角", value: "统一看板", note: "不再重复展示监控、孪生和后台中的同类设备与告警模块。" },
      { label: "适用场景", value: "汇报 / 展厅 / 调度", note: "强化管理层与运营侧的一屏式理解效率。" },
    ],
    [],
  );

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/home"
        title="Loading Command Center"
        description="Preparing the command center layout and operational overview..."
      />
    );
  }

  return (
    <div className="page-shell command-center-shell pt-0 pb-10">
      <BackButton fallbackHref="/home" />

      <section className="command-hero animate-fade-in-up">
        <div className="command-copy">
          <span className="eyebrow text-gradient">{snapshot?.headline.subtitle ?? "Command Center / Inspection Intelligence"}</span>
          <h1 className="text-gradient">{snapshot?.headline.title ?? "轮毂检测 IoT 指挥中心"}</h1>
          <p>
            {snapshot?.headline.description ??
              "围绕质量、节拍、工单和执行日志构建统一运营入口，用一页完成整体态势理解。"}
          </p>
          <div className="command-story-strip">
            {storyCards.map((item, index) => (
              <div key={item.label} className={`command-story-card hover-lift stagger-${index + 1}`}>
                <span>{item.label}</span>
                <strong className="text-gradient">{item.value}</strong>
                <em>{item.note}</em>
              </div>
            ))}
          </div>
          <div className="command-metric-row">
            {snapshot?.metrics.map((metric, index) => (
              <div key={metric.label} className={`command-metric-tile hover-lift stagger-${index + 1}`}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <em className={`trend-${metric.trend}`}>{metric.delta}</em>
              </div>
            )) ?? <div className="loading-state loading-skeleton">正在加载经营指标...</div>}
          </div>
        </div>

        <Card className="command-hero-visual glow-border animate-scale-in stagger-2">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Operations Scope</span>
              <h2>页面职责说明</h2>
            </div>
            <Badge variant="success">已收口</Badge>
          </div>
          <div className="enterprise-highlight-list">
            <div className="hover-lift">
              <strong className="text-gradient">保留在这里的数据</strong>
              <p>质量结构、总量指标、产线趋势、工单队列和执行日志，作为运营总览统一展示。</p>
            </div>
            <div className="hover-lift">
              <strong className="text-gradient">移出的重复内容</strong>
              <p>设备健康矩阵、实时告警和 3D 场景已分别归入监控页与数字孪生页，避免跨页重复。</p>
            </div>
            <div className="hover-lift">
              <strong className="text-gradient">浏览路径建议</strong>
              <p>先看指挥中心，再按需进入监控、孪生或后台做更细的排查和管理动作。</p>
            </div>
          </div>
        </Card>
      </section>

      {error ? (
        <div className="empty-state animate-scale-in">
          <span>!</span>
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-4 chart-card animate-fade-in-up stagger-1">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Quality Mix</span>
              <h2>质量结构总览</h2>
            </div>
          </div>
          <div className="chart-body">
            {snapshot ? <PieChart title="质量结构" data={snapshot.quality} /> : <div className="loading-state loading-skeleton">图表加载中...</div>}
          </div>
        </Card>

        <Card className="xl:col-span-8 chart-card animate-fade-in-up stagger-2">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">30 Day Throughput</span>
              <h2>近 30 天检测趋势</h2>
            </div>
            <Badge variant="outline">每 12 秒自动刷新</Badge>
          </div>
          <div className="chart-body">
            {snapshot ? <LineChart data={snapshot.trend} /> : <div className="loading-state loading-skeleton">趋势加载中...</div>}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-5 animate-fade-in-up stagger-3">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Live Queue</span>
              <h2>实时工单队列</h2>
            </div>
            <Badge variant="outline">滚动显示当前批次</Badge>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="live-queue pr-4">
              {snapshot?.liveProjects.map((project, index) => (
                <div key={project.id} className={`live-queue-item hover-lift stagger-${index + 1}`}>
                  <div>
                    <strong>{project.id}</strong>
                    <span>
                      {project.stage} · {project.model}
                    </span>
                  </div>
                  <div className="live-queue-meta">
                    <span>{project.eta}</span>
                    <Badge 
                      variant={
                        project.result === "FAIL" ? "destructive" : 
                        project.result === "PASS" ? "success" : 
                        "secondary"
                      }
                    >
                      {project.result || "进行中"}
                    </Badge>
                  </div>
                </div>
              )) ?? <div className="loading-state loading-skeleton">队列加载中...</div>}
            </div>
          </ScrollArea>
        </Card>

        <Card className="xl:col-span-7 animate-fade-in-up stagger-4">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">Decision Notes</span>
              <h2>本页推荐动作</h2>
            </div>
          </div>
          <div className="enterprise-highlight-list">
            <div className="hover-lift">
              <strong className="text-gradient">先看质量结构</strong>
              <p>如果不合格占比抬升，优先进入实时监控页查看告警流和视频墙，确认问题是现场波动还是批次异常。</p>
            </div>
            <div className="hover-lift">
              <strong className="text-gradient">再看趋势变化</strong>
              <p>如果趋势突然下滑但质量正常，更可能是节拍、缓存或巡检动作导致，可转去后台和监控页联动排查。</p>
            </div>
            <div className="hover-lift">
              <strong className="text-gradient">最后看工单流转</strong>
              <p>工单队列适合判断是否存在复检积压、模型切换或阶段阻塞，是运营调度最直接的入口。</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="animate-scale-in stagger-5">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Execution Log</span>
            <h2>实时执行日志</h2>
          </div>
          <Badge variant="outline">日志滚动模拟当前设备、工单与算法链路联动</Badge>
        </div>
        <ScrollArea className="h-[200px]">
          <div ref={logBoxRef} className="logbox command-logbox pr-4">
            {logs.length ? logs.map((line, index) => <div key={`${line}-${index}`}>{line}</div>) : <div className="loading-state loading-skeleton">日志初始化中...</div>}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
