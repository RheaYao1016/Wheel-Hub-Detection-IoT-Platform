"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Box,
  Cpu,
  Gauge,
  Monitor,
  Radar,
  Route,
  ShieldAlert,
  Video,
} from "lucide-react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import EmptyStateCard from "../components/Layout/EmptyStateCard";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import TaskSection from "../components/Layout/TaskSection";
import WorkflowHero from "../components/Layout/WorkflowHero";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { fetchPlatformData } from "@/lib/dashboard-client";
import { useSessionGuard } from "../hooks/useSessionGuard";
import type { DigitalTwinSnapshot, MonitorSnapshot } from "@/types/platform";
import { useLocale } from "../components/Locale/LocaleProvider";

export default function OperationsPage() {
  const ready = useSessionGuard(["admin", "operator"]);
  const { text, t } = useLocale();
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
        setError(t("pages.operations.copy001", undefined, "Operations data is temporarily unavailable."));
      }
    };

    load().catch(console.error);
    const timer = window.setInterval(() => {
      load().catch(console.error);
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [ready, t]);

  const hasLoaded = Boolean(monitor && twin);

  const summary = useMemo(() => {
    const onlineChannels = monitor?.cameras.filter((camera) => camera.status === "在线").length ?? 0;
    const pendingAlerts = monitor?.alerts.length ?? 0;
    const warningSensors = twin?.sensors.filter((sensor) => sensor.status !== "正常").length ?? 0;
    const mappedDevices = twin?.devices.length ?? 0;

    return {
      onlineChannels,
      pendingAlerts,
      warningSensors,
      mappedDevices,
    };
  }, [monitor, twin]);

  const nextActions = useMemo(() => {
    const monitorAlert = monitor?.alerts[0];
    const focusSensor = twin?.sensors.find((sensor) => sensor.status !== "正常");
    const leadCamera = monitor?.cameras[0];

    return [
      {
        title: text("先处理告警队列", "Triage alert backlog first"),
        body: monitorAlert
          ? text(
              `${monitorAlert.station} 出现 ${monitorAlert.level} 级告警：${monitorAlert.title}`,
              `${monitorAlert.station} has a ${monitorAlert.level} priority alert: ${monitorAlert.title}`,
            )
          : text("当前没有待处理告警，可以把注意力转到现场稳定性检查。", "No active alert backlog, so focus can move to stability checks."),
        href: "/monitor",
        label: text("去监控中心", "Open Monitoring"),
        icon: <Video className="h-5 w-5" />,
      },
      {
        title: text("再确认数字孪生上下文", "Validate twin context next"),
        body: focusSensor
          ? text(
              `${focusSensor.label} 当前状态为 ${focusSensor.status}，建议进入数字孪生确认设备位置和工序影响。`,
              `${focusSensor.label} is currently ${focusSensor.status}; use Digital Twin to confirm location and process impact.`,
            )
          : text("传感器侧目前没有明显异常，可以用数字孪生做流程确认和设备定位。", "No major sensor anomaly is active, so use Digital Twin for process validation and device context."),
        href: "/digital-twin",
        label: text("打开数字孪生", "Open Digital Twin"),
        icon: <Radar className="h-5 w-5" />,
      },
      {
        title: text("最后决定是否升级治理", "Decide whether to escalate"),
        body: text(
          "如果现场问题已经跨页面、跨班次或需要策略调整，再进入治理后台，而不是一开始就跳到后台页。",
          "Escalate to governance only when the issue crosses teams, shifts, or policy boundaries.",
        ),
        href: "/admin",
        label: text("查看治理后台", "Review Admin Console"),
        icon: <ShieldAlert className="h-5 w-5" />,
      },
      {
        title: text("保持现场画面可见", "Keep field visibility close"),
        body: leadCamera
          ? text(
              `推荐把 ${leadCamera.title} 作为当前班次的首屏视频入口。`,
              `Use ${leadCamera.title} as the primary video entry for this shift.`,
            )
          : text("当前没有可用监控通道信息。", "No camera feed is currently available."),
        href: "/monitor",
        label: text("查看视频墙", "See Video Wall"),
        icon: <Monitor className="h-5 w-5" />,
      },
    ];
  }, [monitor, text, twin]);

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/home"
        title={text("加载运营中台", "Loading Operations Hub")}
        description={text(
          "正在校验会话并准备监控与数字孪生的分流入口…",
          "Validating session and preparing the routing layer between Monitoring and Digital Twin...",
        )}
      />
    );
  }

  return (
    <div className="relative mx-auto max-w-[1920px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 right-10 h-72 w-72 rounded-full bg-primary/10 blur-[110px]" />
        <div className="absolute bottom-10 left-0 h-72 w-72 rounded-full bg-accent/10 blur-[110px]" />
      </div>

      <BackButton fallbackHref="/home" />

      <WorkflowHero
        eyebrow={text("现场执行入口", "Field execution entry")}
        title={text(
          "运营中台只做一件事：把人送到正确的现场页面",
          "Operations Hub does one job: route people into the right field surface",
        )}
        description={text(
          "这里不重复堆监控图表，也不替代数字孪生。它负责判断当前应该先看监控、先看设备上下文，还是升级到治理流程。",
          "This page intentionally avoids duplicating monitoring dashboards or digital-twin detail. It exists to decide what to inspect first and where the work should continue.",
        )}
        stats={[
          {
            label: text("在线通道", "Online channels"),
            value: hasLoaded ? `${summary.onlineChannels}` : "--",
            detail: text("来自监控中心", "From Monitoring"),
            icon: <Video className="h-5 w-5" />,
          },
          {
            label: text("待处理告警", "Open alerts"),
            value: hasLoaded ? `${summary.pendingAlerts}` : "--",
            detail: text("优先决定是否先去监控页", "Decides whether monitoring comes first"),
            icon: <AlertTriangle className="h-5 w-5" />,
            tone: summary.pendingAlerts > 0 ? "warning" : "success",
          },
          {
            label: text("关注传感器", "Sensors needing attention"),
            value: hasLoaded ? `${summary.warningSensors}` : "--",
            detail: text("需要数字孪生做上下文确认", "Requires twin context"),
            icon: <Cpu className="h-5 w-5" />,
            tone: summary.warningSensors > 0 ? "warning" : "success",
          },
          {
            label: text("映射设备", "Mapped devices"),
            value: hasLoaded ? `${summary.mappedDevices}` : "--",
            detail: text("来自数字孪生", "From Digital Twin"),
            icon: <Box className="h-5 w-5" />,
            tone: "info",
          },
        ]}
        actions={
          <>
            <Button asChild>
              <Link href="/monitor">{text("优先看监控", "Open Monitoring")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/digital-twin">{text("查看设备上下文", "Check Device Context")}</Link>
            </Button>
          </>
        }
        aside={
          <Card variant="glass" className="h-full border-border/60">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                {text("使用顺序", "Recommended order")}
              </Badge>
              <div className="space-y-3">
                {[
                  text("1. 看告警与在线通道，判断是否先去监控页。", "1. Check alerts and channel readiness to decide if Monitoring comes first."),
                  text("2. 看传感器和设备数量，判断是否需要数字孪生上下文。", "2. Inspect sensor and device context to decide whether Digital Twin is needed."),
                  text("3. 只有当问题跨团队或跨班次时，再进入治理后台。", "3. Escalate to governance only when the issue crosses teams or shifts."),
                ].map((step) => (
                  <p key={step} className="text-sm leading-6 text-muted-foreground">
                    {step}
                  </p>
                ))}
              </div>
            </div>
          </Card>
        }
      />

      <TaskSection
        eyebrow={text("下一步", "Next best actions")}
        title={text("用分流卡片取代重复堆叠的大盘", "Replace duplicated dashboards with action routing cards")}
        description={text(
          "这组卡片明确告诉班组长和操作员现在该去哪个页面，而不是继续在中间页停留。",
          "These cards tell operators exactly where to go next instead of trapping them in a middle screen.",
        )}
      >
        <div className="grid gap-4 xl:grid-cols-2 2xl:grid-cols-4">
          {nextActions.map((action) => (
            <Card key={action.title} variant="glass" className="h-full border-border/60">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-2xl border border-border/60 bg-background/70 p-2.5 text-primary">
                  {action.icon}
                </div>
                <Badge variant="outline">
                  <Route className="mr-1 h-3.5 w-3.5" />
                  {text("分流", "Route")}
                </Badge>
              </div>
              <h3 className="text-lg font-bold">{action.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{action.body}</p>
              <Button asChild className="mt-5 w-fit">
                <Link href={action.href}>
                  {action.label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      </TaskSection>

      <TaskSection
        className="mt-10"
        eyebrow={text("现场摘要", "Shift summary")}
        title={text("只保留执行决策需要的摘要", "Keep only the summary needed for routing decisions")}
        description={text(
          "如果要深入分析，请进入专用页面。这里保留的是是否需要行动以及行动方向。",
          "Detailed inspection belongs on specialist pages. This hub keeps only the context needed to route the work.",
        )}
      >
        {error ? (
          <EmptyStateCard
            icon={<AlertTriangle className="h-6 w-6" />}
            title={text("暂时无法加载现场摘要", "Unable to load field summary")}
            description={error}
            action={
              <Button onClick={() => window.location.reload()}>
                {text("重新加载", "Reload")}
              </Button>
            }
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-3">
            <Card variant="gradient" className="border-border/60">
              <div className="flex items-center gap-3">
                <Monitor className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">{text("监控摘要", "Monitoring summary")}</h3>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                <p>
                  {text(
                    `在线通道 ${summary.onlineChannels} 个，待处理告警 ${summary.pendingAlerts} 条。`,
                    `${summary.onlineChannels} channels are online and ${summary.pendingAlerts} alerts need triage.`,
                  )}
                </p>
                <p>
                  {text(
                    "如果告警数高于 0，优先进入监控页查看视频墙和告警队列。",
                    "If alert count is above zero, Monitoring should be the first destination.",
                  )}
                </p>
              </div>
            </Card>

            <Card variant="gradient" className="border-border/60">
              <div className="flex items-center gap-3">
                <Gauge className="h-5 w-5 text-accent" />
                <h3 className="text-lg font-bold">{text("数字孪生摘要", "Digital Twin summary")}</h3>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                <p>
                  {text(
                    `当前有 ${summary.warningSensors} 个传感器需要关注，共映射 ${summary.mappedDevices} 台设备。`,
                    `${summary.warningSensors} sensors need attention across ${summary.mappedDevices} mapped devices.`,
                  )}
                </p>
                <p>
                  {text(
                    "如果需要解释问题发生位置、设备关联或工序影响，请转到数字孪生页。",
                    "Use Digital Twin when the team needs equipment context, process location, or impact reasoning.",
                  )}
                </p>
              </div>
            </Card>

            <Card variant="gradient" className="border-border/60">
              <div className="flex items-center gap-3">
                <ShieldAlert className="h-5 w-5 text-warning" />
                <h3 className="text-lg font-bold">{text("治理升级条件", "Governance escalation rule")}</h3>
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                <p>
                  {text(
                    "当问题持续跨班次、需要策略调整，或者已经影响数据导入和系统配置时，再进入治理后台。",
                    "Escalate to Admin only when issues span shifts, require policy changes, or affect imports and system configuration.",
                  )}
                </p>
              </div>
            </Card>
          </div>
        )}
      </TaskSection>
    </div>
  );
}
