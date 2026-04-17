"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "../components/Layout/BackButton";
import PieChart from "../components/Charts/PieChart";
import LineChart from "../components/Charts/LineChart";
import Card from "../components/Layout/Card";
import WorkflowSteps, {
  type WorkflowStep,
} from "../components/Layout/WorkflowSteps";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import { PlatformAuthError, fetchPlatformData } from "@/lib/dashboard-client";
import { clearAuthSession } from "@/lib/auth-session";
import { useSessionGuard } from "@/app/hooks/useSessionGuard";
import type { CommandCenterSnapshot } from "@/types/platform";
import { Badge } from "../components/ui/Badge";
import { ScrollArea } from "../components/ui/ScrollArea";
import { useLocale } from "../components/Locale/LocaleProvider";

export default function VisualizePage() {
  const router = useRouter();
  const ready = useSessionGuard(["admin", "user"]);
  const { text, locale, t } = useLocale();
  const [snapshot, setSnapshot] = useState<CommandCenterSnapshot | null>(null);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const logBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const load = async () => {
      try {
        const payload = await fetchPlatformData<CommandCenterSnapshot>(
          "/dashboard/command-center",
          "/api/command-center",
        );
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
        setError(
          text(
            "指挥中心数据加载失败，请稍后重试。",
            "Command center data load failed. Please retry later.",
          ),
        );
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
        const nextLine =
          snapshot.logs[(previous.length + 1) % snapshot.logs.length];
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
      {
        label: t("pages.visualize.copy001"),
        value: t("pages.visualize.copy002"),
        note: t("pages.visualize.copy003"),
      },
      {
        label: t("pages.visualize.copy004"),
        value: t("pages.visualize.copy005"),
        note: t("pages.visualize.copy006"),
      },
      {
        label: t("pages.visualize.copy007"),
        value: t("pages.visualize.copy008"),
        note: t("pages.visualize.copy009"),
      },
    ],
    [text],
  );

  const workflowSteps = useMemo<WorkflowStep[]>(() => {
    const hasSnapshot = Boolean(snapshot);
    const hasQueue = (snapshot?.liveProjects.length ?? 0) > 0;
    const hasLogs = logs.length > 0;

    return [
      {
        id: "cmd-kpi",
        title: t("pages.visualize.copy010"),
        detail: hasSnapshot
          ? t("pages.visualize.copy011")
          : t("pages.visualize.copy012"),
        state: hasSnapshot ? "done" : "active",
      },
      {
        id: "cmd-quality",
        title: t("pages.visualize.copy013"),
        detail: t("pages.visualize.copy014"),
        state: hasSnapshot ? "active" : "upcoming",
      },
      {
        id: "cmd-throughput",
        title: t("pages.visualize.copy015"),
        detail: t("pages.visualize.copy016"),
        state: hasSnapshot ? "active" : "upcoming",
      },
      {
        id: "cmd-queue",
        title: t("pages.visualize.copy017"),
        detail:
          hasQueue || hasLogs
            ? t("pages.visualize.copy018")
            : t("pages.visualize.copy019"),
        state: hasQueue || hasLogs ? "done" : "upcoming",
      },
    ];
  }, [logs.length, snapshot, text]);

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/home"
        title={t("pages.visualize.copy020")}
        description={t("pages.visualize.copy021")}
      />
    );
  }

  return (
    <div className="page-shell command-center-shell pt-0 pb-10">
      <BackButton fallbackHref="/home" />

      <WorkflowSteps
        title={t("pages.visualize.copy022")}
        subtitle={t("pages.visualize.copy023")}
        steps={workflowSteps}
      />

      <div className="quick-jump-strip">
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("cmd-hero")}
        >
          {t("pages.visualize.copy024")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("cmd-quality")}
        >
          {t("pages.visualize.copy025")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("cmd-queue")}
        >
          {t("pages.visualize.copy026")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("cmd-log")}
        >
          {t("pages.visualize.copy027")}
        </button>
      </div>

      <section id="cmd-hero" className="command-hero animate-fade-in-up">
        <div className="command-copy">
          <span className="eyebrow text-gradient">
            {snapshot?.headline.subtitle ??
              "Command Center / Inspection Intelligence"}
          </span>
          <h1 className="text-gradient">
            {snapshot?.headline.title ?? "Wheel Hub IoT Command Center"}
          </h1>
          <p>
            {snapshot?.headline.description ??
              "Build one command entry around quality, throughput, work-orders, and execution logs."}
          </p>
          <div className="command-story-strip">
            {storyCards.map((item, index) => (
              <div
                key={item.label}
                className={`command-story-card hover-lift stagger-${index + 1}`}
              >
                <span>{item.label}</span>
                <strong className="text-gradient">{item.value}</strong>
                <em>{item.note}</em>
              </div>
            ))}
          </div>
          <div className="command-metric-row">
            {snapshot?.metrics.map((metric, index) => (
              <div
                key={metric.label}
                className={`command-metric-tile hover-lift stagger-${index + 1}`}
              >
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <em className={`trend-${metric.trend}`}>{metric.delta}</em>
              </div>
            )) ?? (
              <div className="loading-state loading-skeleton">
                {text("正在加载 KPI 指标...", "Loading KPI metrics...")}
              </div>
            )}
          </div>
        </div>

        <Card className="command-hero-visual glow-border animate-scale-in stagger-2">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {text("运营边界", "Operations Scope")}
              </span>
              <h2>{text("本页职责范围", "Responsibility of this page")}</h2>
            </div>
            <Badge variant="success">{text("已确认", "Confirmed")}</Badge>
          </div>
          <div className="enterprise-highlight-list">
            <div className="hover-lift">
              <strong className="text-gradient">
                {text("保留在此", "Keep here")}
              </strong>
              <p>
                {text(
                  "质量构成、总量、趋势、工单队列和执行流应保留在指挥中心统一查看。",
                  "Quality composition, total volume, trend, work-order queue, and execution stream.",
                )}
              </p>
            </div>
            <div className="hover-lift">
              <strong className="text-gradient">
                {text("移出本页", "Move out")}
              </strong>
              <p>
                {text(
                  "设备健康矩阵、实时告警时间线和三维映射应交给监控页与数字孪生页承载。",
                  "Device health matrix, real-time alert timeline, and 3D mapping belong to monitor and digital twin pages.",
                )}
              </p>
            </div>
            <div className="hover-lift">
              <strong className="text-gradient">
                {text("建议路径", "Suggested route")}
              </strong>
              <p>
                {text(
                  "先在这里建立全局判断，再跳转到监控页、数字孪生页或后台做深入诊断和治理动作。",
                  "Start here, then jump to monitor/twin/admin for deeper diagnosis and governance actions.",
                )}
              </p>
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
        <Card
          id="cmd-quality"
          className="xl:col-span-4 chart-card animate-fade-in-up stagger-1"
        >
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {text("质量构成", "Quality Mix")}
              </span>
              <h2>{text("质量构成概览", "Quality composition overview")}</h2>
            </div>
          </div>
          <div className="chart-body">
            {snapshot ? (
              <PieChart
                title={text("质量构成", "Quality Mix")}
                data={snapshot.quality}
              />
            ) : (
              <div className="loading-state loading-skeleton">
                {text("正在加载图表...", "Loading chart...")}
              </div>
            )}
          </div>
        </Card>

        <Card
          id="cmd-throughput"
          className="xl:col-span-8 chart-card animate-fade-in-up stagger-2"
        >
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {text("30 天吞吐趋势", "30 Day Throughput")}
              </span>
              <h2>{text("最近 30 天检测趋势", "Last 30 days inspection trend")}</h2>
            </div>
            <Badge variant="outline">
              {text("每 12 秒自动刷新", "Auto refresh every 12s")}
            </Badge>
          </div>
          <div className="chart-body">
            {snapshot ? (
              <LineChart data={snapshot.trend} />
            ) : (
              <div className="loading-state loading-skeleton">
                {text("正在加载趋势...", "Loading trend...")}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div id="cmd-queue" className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <Card className="xl:col-span-5 animate-fade-in-up stagger-3">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {text("实时队列", "Live Queue")}
              </span>
              <h2>{text("实时工单队列", "Real-time work-order queue")}</h2>
            </div>
            <Badge variant="outline">
              {text("滚动显示当前批次", "Rolling current batches")}
            </Badge>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="live-queue pr-4">
              {snapshot?.liveProjects.map((project, index) => (
                <div
                  key={project.id}
                  className={`live-queue-item hover-lift stagger-${index + 1}`}
                >
                  <div>
                    <strong>{project.id}</strong>
                    <span>
                      {project.stage} / {project.model}
                    </span>
                  </div>
                  <div className="live-queue-meta">
                    <span>{project.eta}</span>
                    <Badge
                      variant={
                        project.result === "FAIL"
                          ? "destructive"
                          : project.result === "PASS"
                            ? "success"
                            : "secondary"
                      }
                    >
                      {project.result || t("pages.visualize.copy028")}
                    </Badge>
                  </div>
                </div>
              )) ?? (
                <div className="loading-state loading-skeleton">
                  {t("pages.visualize.copy029")}
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        <Card className="xl:col-span-7 animate-fade-in-up stagger-4">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {text("决策提示", "Decision Notes")}
              </span>
              <h2>{text("建议的下一步动作", "Recommended next actions")}</h2>
            </div>
          </div>
          <div className="enterprise-highlight-list">
            <div className="hover-lift">
              <strong className="text-gradient">
                {text("先看质量构成", "Start from quality mix")}
              </strong>
              <p>
                {text(
                  "如果不合格比例上升，优先进入监控页查看告警流与现场视频证据。",
                  "If fail ratio rises, enter monitoring page first to inspect alert stream and live camera evidence.",
                )}
              </p>
            </div>
            <div className="hover-lift">
              <strong className="text-gradient">
                {text("再看趋势变化", "Then inspect trend shift")}
              </strong>
              <p>
                {text(
                  "在质量稳定但吞吐下降时，通常意味着节拍、缓存或检测流程出现瓶颈。",
                  "Throughput drop with stable quality often means cycle-time, cache, or inspection workflow bottleneck.",
                )}
              </p>
            </div>
            <div className="hover-lift">
              <strong className="text-gradient">
                {text("最后检查队列流向", "Finally check queue flow")}
              </strong>
              <p>
                {text(
                  "队列可帮助识别复检积压、模型切换影响以及具体工序的堵点。",
                  "Queue helps identify recheck backlog, model switch impact, and stage-level blockage.",
                )}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card id="cmd-log" className="animate-scale-in stagger-5">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">
              {text("执行日志", "Execution Log")}
            </span>
            <h2>{text("实时执行流", "Real-time execution stream")}</h2>
          </div>
          <Badge variant="outline">
            {text(
              "设备 / 工单 / 算法链路模拟",
              "Device / work-order / algorithm chain simulation",
            )}
          </Badge>
        </div>
        <ScrollArea className="h-[200px]">
          <div ref={logBoxRef} className="logbox command-logbox pr-4">
            {logs.length ? (
              logs.map((line, index) => (
                <div key={`${line}-${index}`}>{line}</div>
              ))
            ) : (
              <div className="loading-state loading-skeleton">
                {text("正在初始化日志...", "Initializing logs...")}
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
