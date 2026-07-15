"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Cpu,
  Map,
  RefreshCw,
  Wrench,
} from "lucide-react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import EmptyStateCard from "../components/Layout/EmptyStateCard";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import TaskSection from "../components/Layout/TaskSection";
import WorkflowHero from "../components/Layout/WorkflowHero";
import ModelViewer from "../components/ThreeViewer/ModelViewer";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Progress } from "../components/ui/Progress";
import { PlatformAuthError, fetchPlatformData } from "@/lib/dashboard-client";
import { clearAuthSession } from "@/lib/auth-session";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
import type { DigitalTwinSnapshot } from "@/types/platform";

function resolveSensorVariant(status: string) {
  if (status === "预警") return "destructive" as const;
  if (status === "关注") return "warning" as const;
  return "success" as const;
}

function resolveDeviceVariant(temperature: number) {
  if (temperature >= 68) return "destructive" as const;
  if (temperature >= 58) return "warning" as const;
  return "success" as const;
}

export default function DigitalTwinPage() {
  const router = useRouter();
  const ready = useSessionGuard(["admin", "operator"]);
  const { text, t } = useLocale();
  const [snapshot, setSnapshot] = useState<DigitalTwinSnapshot | null>(null);
  const [error, setError] = useState("");
  const [activeSensorStatus, setActiveSensorStatus] = useState("all");

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const load = async () => {
      try {
        const payload = await fetchPlatformData<DigitalTwinSnapshot>(
          "/dashboard/digital-twin",
          "/api/digital-twin",
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
        setError(t("pages.digital_twin.copy001"));
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
  }, [ready, router, t]);

  const sensorStatuses = useMemo(() => {
    const statuses = new Set<string>();
    snapshot?.sensors.forEach((sensor) => statuses.add(sensor.status));
    return ["all", ...Array.from(statuses)];
  }, [snapshot]);

  useEffect(() => {
    if (!sensorStatuses.includes(activeSensorStatus)) {
      setActiveSensorStatus("all");
    }
  }, [activeSensorStatus, sensorStatuses]);

  const filteredSensors = useMemo(() => {
    if (!snapshot) return [];
    if (activeSensorStatus === "all") return snapshot.sensors;
    return snapshot.sensors.filter((sensor) => sensor.status === activeSensorStatus);
  }, [activeSensorStatus, snapshot]);

  const summary = useMemo(() => {
    const attentionSensors =
      snapshot?.sensors.filter((sensor) => sensor.status !== "正常").length ?? 0;
    const flowSteps = snapshot?.flowSteps.length ?? 0;
    const mappedDevices = snapshot?.devices.length ?? 0;
    const alertCount = snapshot?.alerts.length ?? 0;

    return { attentionSensors, flowSteps, mappedDevices, alertCount };
  }, [snapshot]);

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/operations"
        title={t("pages.digital_twin.copy033")}
        description={t("pages.digital_twin.copy034")}
      />
    );
  }

  return (
    <div className="relative mx-auto max-w-[1920px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 right-10 h-72 w-72 rounded-full bg-primary/10 blur-[110px]" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-accent/10 blur-[110px]" />
      </div>

      <BackButton fallbackHref="/operations" />

      <WorkflowHero
        eyebrow={snapshot?.summary.sceneLabel ?? text("数字孪生", "Digital Twin")}
        title={
          snapshot?.summary.title ??
          text(
            "用设备上下文解释问题，不在这里重复做实时监控",
            "Use equipment context to explain issues without duplicating live monitoring",
          )
        }
        description={
          snapshot?.summary.description ??
          text(
            "数字孪生页负责回答问题发生在哪里、经过哪个工序、影响哪些设备和传感器。实时视频和即时警报仍然应该交给监控页。",
            "Digital Twin explains where the issue happened, which flow step it touched, and which devices and sensors are involved.",
          )
        }
        stats={[
          {
            label: text("关注传感器", "Sensors needing attention"),
            value: `${summary.attentionSensors}`,
            detail: text("决定当前解释重点", "Defines where diagnosis should focus"),
            icon: <Activity className="h-5 w-5" />,
            tone: summary.attentionSensors > 0 ? "warning" : "success",
          },
          {
            label: text("流程步数", "Flow steps"),
            value: `${summary.flowSteps}`,
            detail: text("用于解释工序影响", "Used to explain process impact"),
            icon: <RefreshCw className="h-5 w-5" />,
          },
          {
            label: text("映射设备", "Mapped devices"),
            value: `${summary.mappedDevices}`,
            detail: text("用于设备上下文定位", "Used for equipment context"),
            icon: <Boxes className="h-5 w-5" />,
            tone: "info",
          },
          {
            label: text("相关告警", "Related alerts"),
            value: `${summary.alertCount}`,
            detail: text("需要和监控页联动", "Used together with Monitoring"),
            icon: <AlertTriangle className="h-5 w-5" />,
            tone: summary.alertCount > 0 ? "warning" : "default",
          },
        ]}
        actions={
          <>
            <Button asChild>
              <Link href="/monitor">{text("回到监控中心", "Back To Monitoring")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/operations">{text("返回运营中台", "Back To Operations")}</Link>
            </Button>
          </>
        }
        aside={
          <Card variant="glass" className="h-full border-border/60">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                {text("这页顺序", "Twin workflow")}
              </Badge>
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>{text("1. 先看 3D 场景确认设备和工位范围。", "1. Use the 3D scene to confirm scope and location.")}</p>
                <p>{text("2. 再按传感器状态筛选异常。", "2. Filter sensor state to isolate abnormal context.")}</p>
                <p>{text("3. 最后回到流程和设备列表解释影响范围。", "3. Use flow and device lists to explain impact.")}</p>
              </div>
            </div>
          </Card>
        }
      />

      {error ? (
        <div className="mb-10">
          <EmptyStateCard
            icon={<AlertTriangle className="h-6 w-6" />}
            title={text("数字孪生数据暂时不可用", "Digital Twin data is unavailable")}
            description={error}
            action={<Button onClick={() => window.location.reload()}>{text("重新加载", "Reload")}</Button>}
          />
        </div>
      ) : null}

      <TaskSection
        eyebrow={text("场景与流程", "Scene and flow")}
        title={text("先确定场景位置，再解释流程关系", "Locate the scene first, then explain process relationships")}
        description={text(
          "数字孪生页最重要的是设备上下文，所以把 3D 场景和工序流放在首屏一起看。",
          "The 3D scene and process flow belong together because both explain context rather than real-time status.",
        )}
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <Card variant="glass" className="border-border/60">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Map className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">{text("3D 场景", "3D scene")}</h3>
              </div>
              <Badge variant="outline">{text("定位设备上下文", "Locate equipment context")}</Badge>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/30 p-3">
              <ModelViewer />
            </div>
          </Card>

          <Card variant="glass" className="border-border/60">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RefreshCw className="h-5 w-5 text-accent" />
                <h3 className="text-lg font-bold">{text("流程解释", "Process explanation")}</h3>
              </div>
              <Badge variant="outline">{text("工序关联", "Flow relation")}</Badge>
            </div>
            <div className="space-y-3">
              {snapshot?.flowSteps.length ? (
                snapshot.flowSteps.map((step, index) => (
                  <div key={`${step.title}-${index}`} className="rounded-2xl border border-border/60 bg-background/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                          {String(index + 1).padStart(2, "0")}
                        </div>
                        <h3 className="mt-1 font-bold">{step.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{step.meta}</p>
                      </div>
                      <Badge variant="secondary">{step.duration}</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {text("当前没有流程步骤。", "No flow steps are available right now.")}
                </p>
              )}
            </div>
          </Card>
        </div>
      </TaskSection>

      <TaskSection
        className="mt-10"
        eyebrow={text("传感器上下文", "Sensor context")}
        title={text("用状态筛选器收束诊断范围", "Use state filters to narrow the diagnosis scope")}
        description={text(
          "这里不是监控大盘，而是帮助团队解释问题为什么会在某个位置、某个阶段发生。",
          "This is not a monitoring wall. It helps teams explain why a condition appears at a specific position or stage.",
        )}
        action={
          <div className="flex flex-wrap gap-2">
            {sensorStatuses.map((status) => (
              <Button
                key={status}
                variant={activeSensorStatus === status ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveSensorStatus(status)}
              >
                {status === "all" ? text("全部", "All") : status}
              </Button>
            ))}
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {filteredSensors.length ? (
            filteredSensors.map((sensor) => (
              <Card key={sensor.label} variant="glass" className="border-border/60">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-bold">{sensor.label}</h3>
                  <Badge variant={resolveSensorVariant(sensor.status)}>{sensor.status}</Badge>
                </div>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-3xl font-black">{sensor.value}</span>
                  <span className="pb-1 text-sm text-muted-foreground">{sensor.unit}</span>
                </div>
                <div className="mt-4 grid gap-2 text-sm">
                  <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="text-muted-foreground">{text("目标值", "Target")}</div>
                    <div className="mt-1 font-semibold">{sensor.target}</div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="text-muted-foreground">{text("偏差", "Deviation")}</div>
                    <div className="mt-1 font-semibold">{sensor.deviation}</div>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <EmptyStateCard
              icon={<Cpu className="h-6 w-6" />}
              title={text("暂无传感器数据", "No sensor data yet")}
              description={text(
                "当前筛选下没有可展示的传感器。",
                "No sensors are available under the current filter.",
              )}
            />
          )}
        </div>
      </TaskSection>

      <TaskSection
        className="mt-10"
        eyebrow={text("设备范围", "Device scope")}
        title={text("设备列表只解释影响，不重复实时视频", "Device list explains impact without duplicating live video")}
        description={text(
          "如果传感器异常已经定位到设备，这里用来说明设备状态、利用率和运行时间。",
          "Once the issue is narrowed to equipment, this list explains condition, utilization, and runtime.",
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
              title={text("暂无设备数据", "No mapped devices yet")}
              description={text(
                "当前没有设备上下文可展示。",
                "No device context is available right now.",
              )}
            />
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/monitor">
              {text("回到监控中心看实时画面", "Back To Monitoring")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </TaskSection>
    </div>
  );
}
