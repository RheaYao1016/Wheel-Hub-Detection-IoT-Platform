"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  ClipboardList,
  Eye,
  Layers3,
  Terminal,
  TrendingUp,
} from "lucide-react";
import BackButton from "../components/Layout/BackButton";
import LineChart from "../components/Charts/LineChart";
import PieChart from "../components/Charts/PieChart";
import Card from "../components/Layout/Card";
import EmptyStateCard from "../components/Layout/EmptyStateCard";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import TaskSection from "../components/Layout/TaskSection";
import WorkflowHero from "../components/Layout/WorkflowHero";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { ScrollArea } from "../components/ui/ScrollArea";
import {
  PlatformAuthError,
  fetchPlatformData,
} from "@/lib/dashboard-client";
import { clearAuthSession } from "@/lib/auth-session";
import { useSessionGuard } from "@/app/hooks/useSessionGuard";
import type { CommandCenterSnapshot } from "@/types/platform";
import { useLocale } from "../components/Locale/LocaleProvider";

export default function VisualizePage() {
  const router = useRouter();
  const ready = useSessionGuard(["admin", "operator"]);
  const { text, t } = useLocale();
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
        setLogs(payload.logs.slice(-12));
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
          t(
            "pages.visualize.copy030",
            undefined,
            "Command center data load failed. Please retry later.",
          ),
        );
      }
    };

    load().catch(console.error);
    const timer = window.setInterval(() => {
      load().catch(console.error);
    }, 12000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [ready, router, t]);

  useEffect(() => {
    if (!snapshot?.logs.length) return;

    const timer = window.setInterval(() => {
      setLogs((previous) => {
        const current = previous.length ? previous : snapshot.logs.slice(-12);
        const nextLine =
          snapshot.logs[(current.length + snapshot.logs.length) % snapshot.logs.length];
        const next = [...current, nextLine];
        return next.slice(-12);
      });
    }, 2400);

    return () => window.clearInterval(timer);
  }, [snapshot]);

  useEffect(() => {
    if (logBoxRef.current) {
      logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
    }
  }, [logs]);

  const summary = useMemo(() => {
    const openAlerts = snapshot?.alerts.length ?? 0;
    const activeQueue = snapshot?.liveProjects.length ?? 0;
    const devices = snapshot?.devices.length ?? 0;
    const logCount = snapshot?.logs.length ?? 0;

    return { openAlerts, activeQueue, devices, logCount };
  }, [snapshot]);

  const recommendedRoutes = useMemo(() => {
    const firstAlert = snapshot?.alerts[0];
    const firstQueue = snapshot?.liveProjects[0];

    return [
      {
        title: text("先判断是否要去监控页", "Decide if Monitoring comes first"),
        body: firstAlert
          ? text(
              `当前最紧急告警来自 ${firstAlert.station}，建议先进入监控中心看视频和告警流。`,
              `The highest-priority issue is at ${firstAlert.station}; Monitoring should be the next stop.`,
            )
          : text("目前没有明显告警压力，可以优先看趋势和队列。", "No urgent alert pressure is active, so trend and queue can be reviewed first."),
        href: "/monitor",
      },
      {
        title: text("再判断是否要去数字孪生", "Then decide if Digital Twin is needed"),
        body: firstQueue
          ? text(
              `当前队列里最前面的工单是 ${firstQueue.id}，如果需要定位工位或工序影响，请进入数字孪生。`,
              `The lead queue item is ${firstQueue.id}; use Digital Twin if station or process context is needed.`,
            )
          : text("如果要解释设备、工位和工序关联，再进入数字孪生页。", "Open Digital Twin only when equipment or process context is required."),
        href: "/digital-twin",
      },
      {
        title: text("最后才做治理升级", "Escalate only at the end"),
        body: text(
          "治理后台用于跨团队和跨班次问题，不应该作为指挥中心的第一跳。",
          "Admin governance is for cross-team or cross-shift issues, not the first destination from the command view.",
        ),
        href: "/admin",
      },
    ];
  }, [snapshot, text]);

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/home"
        title={t("pages.visualize.copy020", undefined, "Loading Command Center")}
        description={t(
          "pages.visualize.copy021",
          undefined,
          "Preparing command center layout and operations overview...",
        )}
      />
    );
  }

  return (
    <div className="relative mx-auto max-w-[1920px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -right-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 h-[26rem] w-[26rem] rounded-full bg-accent/10 blur-[120px]" />
      </div>

      <BackButton fallbackHref="/home" />

      <WorkflowHero
        eyebrow={text("指挥中心", "Command Center")}
        title={
          snapshot?.headline.title ??
          text(
            "先看全局态势，再决定现场下一跳",
            "Read overall posture first, then decide the next field action",
          )
        }
        description={
          snapshot?.headline.description ??
          text(
            "指挥中心只保留班次级和管理级判断所需的信息：质量结构、趋势、队列和执行日志。更细的实时监控和设备上下文应该分别进入监控中心和数字孪生。",
            "The command center keeps only what is needed for shift-level decision making: quality mix, trend, queue, and execution logs.",
          )
        }
        stats={[
          {
            label: text("待处理告警", "Open alerts"),
            value: `${summary.openAlerts}`,
            detail: text("决定是否先去监控页", "Decides whether Monitoring comes first"),
            icon: <AlertTriangle className="h-5 w-5" />,
            tone: summary.openAlerts > 0 ? "warning" : "success",
          },
          {
            label: text("活动队列", "Active queue"),
            value: `${summary.activeQueue}`,
            detail: text("当前工单和批次压力", "Current batch and work-order pressure"),
            icon: <ClipboardList className="h-5 w-5" />,
          },
          {
            label: text("设备覆盖", "Device coverage"),
            value: `${summary.devices}`,
            detail: text("用于决定是否进入数字孪生", "Used to decide if Digital Twin is needed"),
            icon: <Layers3 className="h-5 w-5" />,
            tone: "info",
          },
          {
            label: text("执行日志", "Execution logs"),
            value: `${summary.logCount}`,
            detail: text("保留决策线索，不做治理动作", "Decision trace, not governance action"),
            icon: <Terminal className="h-5 w-5" />,
          },
        ]}
        actions={
          <>
            <Button asChild>
              <Link href="/operations">{text("进入运营中台", "Open Operations Hub")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/monitor">{text("优先看监控", "Open Monitoring")}</Link>
            </Button>
          </>
        }
        aside={
          <Card variant="glass" className="h-full border-border/60">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                {text("这页该做什么", "What this page is for")}
              </Badge>
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>{text("1. 判断告警、趋势和队列谁最值得先处理。", "1. Decide whether alerts, trend, or queue deserve attention first.")}</p>
                <p>{text("2. 明确下一步去哪一页，而不是在这里做所有事情。", "2. Decide the next page instead of doing everything here.")}</p>
                <p>{text("3. 只保留班次级概览，不堆实时设备细节。", "3. Keep shift-level overview instead of deep real-time detail.")}</p>
              </div>
            </div>
          </Card>
        }
      />

      <TaskSection
        eyebrow={text("建议路径", "Suggested routes")}
        title={text("用动作路由替代重复的大盘", "Route action instead of duplicating specialist dashboards")}
        description={text(
          "这三张卡片告诉班组长现在下一步应该去哪，而不是继续在指挥页停留。",
          "These cards tell shift leads where to go next instead of trapping them in the command page.",
        )}
      >
        <div className="grid gap-4 xl:grid-cols-3">
          {recommendedRoutes.map((route) => (
            <Card key={route.title} variant="glass" className="h-full border-border/60">
              <h3 className="text-lg font-bold">{route.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{route.body}</p>
              <Button asChild className="mt-5 w-fit">
                <Link href={route.href}>
                  {text("去处理", "Open")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      </TaskSection>

      {error ? (
        <div className="mt-10">
          <EmptyStateCard
            icon={<AlertTriangle className="h-6 w-6" />}
            title={text("指挥中心数据暂时不可用", "Command center is unavailable")}
            description={error}
            action={<Button onClick={() => window.location.reload()}>{text("重新加载", "Reload")}</Button>}
          />
        </div>
      ) : null}

      <TaskSection
        className="mt-10"
        eyebrow={text("态势摘要", "Posture summary")}
        title={text("保留最关键的两块图表", "Keep only the two charts that change command decisions")}
        description={text(
          "质量结构决定问题类型，趋势决定压力方向。其他细节应该交给专用页面处理。",
          "Quality mix explains what kind of problem exists; throughput trend explains where pressure is moving.",
        )}
      >
        <div className="grid gap-4 lg:grid-cols-12">
          <Card className="lg:col-span-5 border-border/60" variant="gradient">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">{text("质量结构", "Quality mix")}</h3>
              </div>
              <Badge variant="outline">{text("判断问题类型", "Problem type")}</Badge>
            </div>
            {snapshot ? (
              <PieChart title="Quality Mix" data={snapshot.quality} />
            ) : (
              <div className="flex h-80 items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-sm text-muted-foreground">
                {text("加载质量图表中…", "Loading quality chart...")}
              </div>
            )}
          </Card>

          <Card className="lg:col-span-7 border-border/60" variant="gradient">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-accent" />
                <h3 className="text-lg font-bold">{text("30 天趋势", "30-day trend")}</h3>
              </div>
              <Badge variant="outline">{text("判断压力方向", "Pressure direction")}</Badge>
            </div>
            <div className="h-[360px]">
              {snapshot ? (
                <LineChart data={snapshot.trend} />
              ) : (
                <div className="flex h-full items-center justify-center rounded-xl border border-border/60 bg-muted/20 text-sm text-muted-foreground">
                  {text("加载趋势图中…", "Loading trend chart...")}
                </div>
              )}
            </div>
          </Card>
        </div>
      </TaskSection>

      <TaskSection
        className="mt-10"
        eyebrow={text("执行线索", "Execution cues")}
        title={text("队列、风险和日志放在一起看", "Review queue, risk, and logs together")}
        description={text(
          "这三块组合起来，足够支持‘下一步去哪里’的决策，不需要再把监控页和孪生页搬过来。",
          "These three blocks are enough to decide the next operational page without copying Monitoring or Digital Twin into Command Center.",
        )}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <Card variant="glass" className="border-border/60">
            <div className="mb-4 flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">{text("活动队列", "Live queue")}</h3>
            </div>
            <div className="space-y-3">
              {snapshot?.liveProjects.length ? (
                snapshot.liveProjects.slice(0, 6).map((project) => (
                  <div key={project.id} className="rounded-2xl border border-border/60 bg-background/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <strong>{project.id}</strong>
                      <Badge
                        variant={
                          project.result === "FAIL"
                            ? "destructive"
                            : project.result === "PASS"
                              ? "success"
                              : "secondary"
                        }
                      >
                        {project.result || text("处理中", "In progress")}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {project.stage} / {project.model} / {project.eta}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {text("当前没有活动队列。", "No live queue is available right now.")}
                </p>
              )}
            </div>
          </Card>

          <Card variant="glass" className="border-border/60">
            <div className="mb-4 flex items-center gap-3">
              <Eye className="h-5 w-5 text-warning" />
              <h3 className="text-lg font-bold">{text("风险观察", "Risk watchlist")}</h3>
            </div>
            <div className="space-y-3">
              {snapshot?.alerts.length ? (
                snapshot.alerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="rounded-2xl border border-border/60 bg-background/40 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <strong>{alert.title}</strong>
                      <Badge
                        variant={
                          alert.level === "高"
                            ? "destructive"
                            : alert.level === "中"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {alert.level}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {alert.station} / {alert.timestamp}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {text("当前没有告警。", "No active alert is available right now.")}
                </p>
              )}
            </div>
          </Card>

          <Card variant="glass" className="border-border/60">
            <div className="mb-4 flex items-center gap-3">
              <Terminal className="h-5 w-5 text-accent" />
              <h3 className="text-lg font-bold">{text("执行日志", "Execution log")}</h3>
            </div>
            <ScrollArea className="h-[360px] rounded-2xl border border-border/60 bg-black/30">
              <div ref={logBoxRef} className="space-y-2 p-4 font-mono text-xs">
                {logs.length ? (
                  logs.map((line, index) => (
                    <div key={`${line}-${index}`} className="border-b border-border/20 pb-2 text-muted-foreground last:border-b-0">
                      <span className="mr-2 text-primary">[{index + 1}]</span>
                      {line}
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    {text("正在初始化日志…", "Initializing logs...")}
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </TaskSection>
    </div>
  );
}
