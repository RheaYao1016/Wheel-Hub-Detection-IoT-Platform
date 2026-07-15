"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Eye,
  Monitor,
  Radio,
  Video,
  Wrench,
} from "lucide-react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import EmptyStateCard from "../components/Layout/EmptyStateCard";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import TaskSection from "../components/Layout/TaskSection";
import WorkflowHero from "../components/Layout/WorkflowHero";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Progress } from "../components/ui/Progress";
import { PlatformAuthError, fetchPlatformData } from "@/lib/dashboard-client";
import { clearAuthSession } from "@/lib/auth-session";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
import type { MonitorSnapshot } from "@/types/platform";

function resolveAlertVariant(level: string) {
  if (level === "高") return "destructive" as const;
  if (level === "中") return "warning" as const;
  return "secondary" as const;
}

function resolveDeviceVariant(temperature: number) {
  if (temperature >= 68) return "destructive" as const;
  if (temperature >= 58) return "warning" as const;
  return "success" as const;
}

export default function MonitorPage() {
  const router = useRouter();
  const ready = useSessionGuard(["admin", "operator"]);
  const { text, t } = useLocale();
  const [snapshot, setSnapshot] = useState<MonitorSnapshot | null>(null);
  const [error, setError] = useState("");
  const [cameraToast, setCameraToast] = useState<string | null>(null);
  const [openedPreviews, setOpenedPreviews] = useState<Record<number, true>>({});
  const [activeAlertLevel, setActiveAlertLevel] = useState("all");
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([]);

  useEffect(() => {
    if (!ready) return;

    let active = true;
    const currentVideoRefs = videoRefs.current;

    const load = async () => {
      try {
        const payload = await fetchPlatformData<MonitorSnapshot>(
          "/dashboard/monitor",
          "/api/monitor",
        );
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
        setError(t("pages.monitor.copy001"));
      }
    };

    load().catch(console.error);
    const timer = window.setInterval(() => {
      load().catch(console.error);
    }, 12000);

    return () => {
      active = false;
      window.clearInterval(timer);
      currentVideoRefs.forEach((video) => {
        const stream = video?.srcObject as MediaStream | undefined;
        stream?.getTracks().forEach((track) => track.stop());
      });
    };
  }, [ready, router, t]);

  useEffect(() => {
    if (!cameraToast) return;
    const timer = window.setTimeout(() => setCameraToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [cameraToast]);

  const alertLevels = useMemo(() => {
    const levels = new Set<string>();
    snapshot?.alerts.forEach((alert) => levels.add(alert.level));
    return ["all", ...Array.from(levels)];
  }, [snapshot]);

  useEffect(() => {
    if (!alertLevels.includes(activeAlertLevel)) {
      setActiveAlertLevel("all");
    }
  }, [activeAlertLevel, alertLevels]);

  const filteredAlerts = useMemo(() => {
    if (!snapshot) return [];
    if (activeAlertLevel === "all") return snapshot.alerts;
    return snapshot.alerts.filter((alert) => alert.level === activeAlertLevel);
  }, [activeAlertLevel, snapshot]);

  const previewCount = Object.keys(openedPreviews).length;
  const onlineCount =
    snapshot?.cameras.filter((camera) => camera.status === "在线").length ?? 0;

  const startCamera = async (index: number) => {
    const target = videoRefs.current[index];
    if (!target) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      target.srcObject = stream;
      await target.play();
      setOpenedPreviews((previous) => ({ ...previous, [index]: true }));

      const title =
        snapshot?.cameras[index]?.title ??
        t("pages.monitor.copy033", { p1: index + 1 }, `Camera ${index + 1}`);
      setCameraToast(
        t("pages.monitor.copy034", { p1: title }, `${title} preview started.`),
      );
    } catch (requestError) {
      console.error(requestError);
      setCameraToast(t("pages.monitor.copy035", undefined, "Unable to start camera preview."));
    }
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/operations"
        title={t("pages.monitor.copy036")}
        description={t("pages.monitor.copy037")}
      />
    );
  }

  return (
    <div className="relative mx-auto max-w-[1920px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary/10 blur-[110px]" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-accent/10 blur-[110px]" />
      </div>

      <BackButton fallbackHref="/operations" />

      <WorkflowHero
        eyebrow={text("监控中心", "Monitoring center")}
        title={text(
          "这里负责实时画面、警报分诊和设备即时报障",
          "This page owns live feeds, alert triage, and immediate device checks",
        )}
        description={
          snapshot?.headline.description ??
          text(
            "监控页只做实时观察和快速响应，不重复趋势分析和 3D 设备上下文。需要工位解释时再跳到数字孪生。",
            "Monitoring is for real-time observation and quick response. Use Digital Twin only when location or process context is needed.",
          )
        }
        stats={[
          {
            label: text("在线通道", "Online channels"),
            value: `${onlineCount}`,
            detail: text("可直接进入实时预览", "Available for live preview"),
            icon: <Video className="h-5 w-5" />,
            tone: onlineCount > 0 ? "success" : "warning",
          },
          {
            label: text("已打开预览", "Opened previews"),
            value: `${previewCount}`,
            detail: text("当前操作员已打开画面", "Feeds opened in this session"),
            icon: <Eye className="h-5 w-5" />,
            tone: previewCount > 0 ? "info" : "default",
          },
          {
            label: text("待处理告警", "Open alerts"),
            value: `${snapshot?.alerts.length ?? 0}`,
            detail: text("先做分诊，再决定升级", "Triage before escalation"),
            icon: <AlertTriangle className="h-5 w-5" />,
            tone: (snapshot?.alerts.length ?? 0) > 0 ? "warning" : "success",
          },
          {
            label: text("巡检设备", "Watched devices"),
            value: `${snapshot?.devices.length ?? 0}`,
            detail: text("用于快速判断设备热状态", "Quick device health check"),
            icon: <Wrench className="h-5 w-5" />,
          },
        ]}
        actions={
          <>
            <Button asChild>
              <Link href="/operations">{text("返回运营中台", "Back To Operations")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/digital-twin">{text("需要上下文时去数字孪生", "Open Digital Twin When Needed")}</Link>
            </Button>
          </>
        }
        aside={
          <Card variant="glass" className="h-full border-border/60">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                {text("监控页顺序", "Monitoring order")}
              </Badge>
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>{text("1. 先开最关键的实时画面。", "1. Open the most important live feed first.")}</p>
                <p>{text("2. 再看警报队列，决定是否升级。", "2. Triage the alert queue before escalating.")}</p>
                <p>{text("3. 最后看设备热状态，判断是不是设备异常。", "3. Check device temperature and utilization last.")}</p>
              </div>
            </div>
          </Card>
        }
      />

      {error ? (
        <div className="mb-10">
          <EmptyStateCard
            icon={<AlertTriangle className="h-6 w-6" />}
            title={text("监控数据暂时不可用", "Monitoring data is unavailable")}
            description={error}
            action={<Button onClick={() => window.location.reload()}>{text("重新加载", "Reload")}</Button>}
          />
        </div>
      ) : null}

      <TaskSection
        eyebrow={text("实时画面", "Live feeds")}
        title={text("先看最需要响应的画面", "Start with the feeds that need immediate response")}
        description={text(
          "这里保留快速打开预览的能力，但不把监控页做成花哨的视频展示墙。",
          "The feed wall stays actionable without turning into a decorative video surface.",
        )}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(snapshot?.cameras.length ? snapshot.cameras : new Array(4).fill(null)).map(
            (camera, index) => {
              const cameraLabel =
                camera?.title ?? t("pages.monitor.copy033", { p1: index + 1 }, `Camera ${index + 1}`);
              const locationLabel = camera?.location ?? text("待分配位置", "Pending location");
              const statusLabel = camera?.status ?? text("待命", "Idle");
              const descLabel =
                camera?.description ?? text("等待现场视频描述。", "Waiting for feed description.");

              return (
                <Card key={camera?.id ?? index} variant="glass" className="overflow-hidden border-border/60 p-0">
                  <div className="relative aspect-video bg-muted/30">
                    <video
                      ref={(node) => {
                        videoRefs.current[index] = node;
                      }}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                    />
                    <div className="absolute left-3 top-3">
                      <Badge variant={statusLabel === "在线" ? "success" : "secondary"}>
                        <Radio className="mr-1 h-3 w-3" />
                        {statusLabel}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold">{cameraLabel}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{locationLabel}</p>
                      </div>
                      <Badge variant="outline">{text("实时", "Live")}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{descLabel}</p>
                    <Button className="mt-4 w-full" onClick={() => startCamera(index)}>
                      {openedPreviews[index]
                        ? text("重新打开预览", "Reopen Preview")
                        : text("打开预览", "Open Preview")}
                    </Button>
                  </div>
                </Card>
              );
            },
          )}
        </div>
      </TaskSection>

      <TaskSection
        className="mt-10"
        eyebrow={text("警报分诊", "Alert triage")}
        title={text("先按等级过滤，再决定谁需要升级", "Filter by severity before escalating anything")}
        description={text(
          "监控页的任务不是写结论，而是让人快速看到哪个站点现在最需要介入。",
          "Monitoring should show which station needs intervention now, not produce a full diagnosis.",
        )}
        action={
          <div className="flex flex-wrap gap-2">
            {alertLevels.map((level) => (
              <Button
                key={level}
                variant={activeAlertLevel === level ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveAlertLevel(level)}
              >
                {level === "all" ? text("全部", "All") : level}
              </Button>
            ))}
          </div>
        }
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.8fr)]">
          <Card variant="glass" className="border-border/60">
            <div className="space-y-3">
              {filteredAlerts.length ? (
                filteredAlerts.map((alert) => (
                  <div key={alert.id} className="rounded-2xl border border-border/60 bg-background/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold">{alert.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {alert.station} / {alert.timestamp}
                        </p>
                      </div>
                      <Badge variant={resolveAlertVariant(alert.level)}>{alert.level}</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{alert.detail}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <Badge variant="outline">{alert.status}</Badge>
                      <Button asChild variant="outline" size="sm">
                        <Link href="/admin/alerts">{text("升级到治理", "Escalate")}</Link>
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {text("当前筛选下没有告警。", "No alert matches the current filter.")}
                </p>
              )}
            </div>
          </Card>

          <Card variant="gradient" className="border-border/60">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold">{text("监控页边界", "Monitoring boundary")}</h3>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              <p>{text("这里负责实时视频、站点警报和设备快检。", "This page owns live video, station alerts, and quick device inspection.")}</p>
              <p>{text("如果需要解释工位、流程或设备上下文，请跳到数字孪生。", "If location, process, or equipment context is needed, move to Digital Twin.")}</p>
              <p>{text("如果问题已经跨班次或需要策略动作，再进入治理后台。", "Move to Admin only when the issue now requires governance action.")}</p>
            </div>
          </Card>
        </div>
      </TaskSection>

      <TaskSection
        className="mt-10"
        eyebrow={text("设备快检", "Device quick check")}
        title={text("只保留足够支持即时判断的设备信息", "Keep only the device data needed for immediate judgment")}
        description={text(
          "监控页只用来判断设备是不是明显异常，不替代数字孪生里的设备上下文解释。",
          "Monitoring checks whether a device looks unhealthy. It does not replace the deeper context in Digital Twin.",
        )}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {snapshot?.devices.length ? (
            snapshot.devices.map((device) => (
              <Card key={device.name} variant="glass" className="border-border/60">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{device.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{device.note}</p>
                  </div>
                  <Badge variant={resolveDeviceVariant(device.temperature)}>{device.status}</Badge>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{text("利用率", "Utilization")}</span>
                    <span>{device.utilization}%</span>
                  </div>
                  <Progress value={device.utilization} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="text-muted-foreground">{text("温度", "Temperature")}</div>
                    <div className="mt-1 font-bold">{device.temperature}°C</div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="text-muted-foreground">{text("运行时长", "Runtime")}</div>
                    <div className="mt-1 font-bold">{device.runtimeHours}h</div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <EmptyStateCard
              icon={<Wrench className="h-6 w-6" />}
              title={text("暂无设备数据", "No device data yet")}
              description={text(
                "当前没有设备快检信息可展示。",
                "No quick-check device information is available right now.",
              )}
            />
          )}
        </div>
      </TaskSection>

      {cameraToast ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary shadow-card-hover">
          {cameraToast}
        </div>
      ) : null}
    </div>
  );
}
