"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Database,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  Zap,
} from "lucide-react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import EmptyStateCard from "../components/Layout/EmptyStateCard";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import TaskSection from "../components/Layout/TaskSection";
import WorkflowHero from "../components/Layout/WorkflowHero";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import {
  PlatformAuthError,
  fetchPlatformData,
  requestPlatformJson,
} from "@/lib/dashboard-client";
import { clearAuthSession } from "@/lib/auth-session";
import { useAdminGuard } from "./hooks/useAdminGuard";
import type { AdminSnapshot } from "@/types/platform";
import { useLocale } from "../components/Locale/LocaleProvider";

type ToastState = {
  message: string;
  type: "success" | "error";
};

const TOAST_DURATION = 2600;

export default function AdminDashboard() {
  const ready = useAdminGuard();
  const { text, t } = useLocale();
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [error, setError] = useState("");
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const load = async () => {
      try {
        const payload = await fetchPlatformData<AdminSnapshot>("/dashboard/admin", "/api/admin");
        if (!active) return;
        setSnapshot(payload);
        setError("");
      } catch (requestError) {
        if (!active) return;
        if (requestError instanceof PlatformAuthError) {
          clearAuthSession();
          window.location.replace("/login");
          return;
        }
        console.error(requestError);
        setError(t("pages.admin.copy017", undefined, "Admin data is temporarily unavailable."));
      }
    };

    load().catch(console.error);
    const timer = window.setInterval(() => {
      load().catch(console.error);
    }, 15000);

    return () => {
      active = false;
      window.clearInterval(timer);
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [ready, t]);

  const showToast = useCallback((message: string, type: ToastState["type"]) => {
    setToast({ message, type });
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, TOAST_DURATION);
  }, []);

  const handleSync = useCallback(async () => {
    try {
      await requestPlatformJson<{ success?: boolean; message?: string }>(
        "/dashboard/sync",
        "/api/sync",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ triggeredAt: new Date().toISOString() }),
        },
      );
      showToast(text("平台同步完成。", "Platform sync completed."), "success");
    } catch (requestError) {
      if (requestError instanceof PlatformAuthError) {
        clearAuthSession();
        window.location.replace("/login");
        return;
      }
      console.error(requestError);
      showToast(text("同步失败，请重试。", "Sync failed. Please retry."), "error");
    }
  }, [showToast, text]);

  const governanceSummary = useMemo(() => {
    const alerts = snapshot?.alerts.length ?? 0;
    const maintenanceDevices =
      snapshot?.devices.filter((device) =>
        String(device.status).toLowerCase().includes("maint"),
      ).length ?? 0;
    const watchMetrics =
      snapshot?.metrics.filter((metric) => metric.trend !== "up").length ?? 0;

    return { alerts, maintenanceDevices, watchMetrics };
  }, [snapshot]);

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/home"
        title={text("加载治理后台", "Loading Admin Console")}
        description={text(
          "正在验证管理员权限并准备治理、导入和告警控制台…",
          "Validating admin access and preparing governance, import, and alert controls...",
        )}
      />
    );
  }

  return (
    <div className="relative mx-auto max-w-[1920px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <BackButton fallbackHref="/home" />

      <WorkflowHero
        eyebrow={text("治理后台", "Governance console")}
        title={text(
          "把治理动作从日常操作里拆出来，单独管理警报、导入和策略压力",
          "Separate governance from daily operations so alerts, imports, and policy pressure are handled intentionally",
        )}
        description={text(
          "治理后台不应该成为所有人的起点。它服务于管理员，用来关闭跨团队、跨班次和跨系统的问题，并确保导入、设备和指标都能被审计。",
          "The admin console should not be everyone’s starting point. It exists for administrators to close cross-team, cross-shift, and cross-system issues with clear accountability.",
        )}
        stats={[
          {
            label: text("待处理告警", "Queued alerts"),
            value: `${governanceSummary.alerts}`,
            detail: text("优先处理跨页面影响的警报", "Alerts with workflow impact"),
            icon: <Bell className="h-5 w-5" />,
            tone: governanceSummary.alerts > 0 ? "warning" : "success",
          },
          {
            label: text("维护设备", "Maintenance devices"),
            value: `${governanceSummary.maintenanceDevices}`,
            detail: text("反映设备层面的治理压力", "Device-level governance pressure"),
            icon: <Server className="h-5 w-5" />,
            tone: governanceSummary.maintenanceDevices > 0 ? "warning" : "success",
          },
          {
            label: text("关注指标", "Watch metrics"),
            value: `${governanceSummary.watchMetrics}`,
            detail: text("趋势异常需要同步核查", "Metrics with non-up trend"),
            icon: <Activity className="h-5 w-5" />,
            tone: governanceSummary.watchMetrics > 0 ? "warning" : "info",
          },
        ]}
        actions={
          <>
            <Button onClick={handleSync}>
              <RefreshCw className="h-4 w-4" />
              {text("立即同步平台", "Sync Platform")}
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/alerts">{text("打开告警队列", "Open Alert Queue")}</Link>
            </Button>
          </>
        }
        aside={
          <Card variant="glass" className="h-full border-border/60">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                {text("治理顺序", "Governance order")}
              </Badge>
              <div className="space-y-3 text-sm leading-6 text-muted-foreground">
                <p>{text("1. 先看告警和趋势是否跨页面扩散。", "1. Confirm whether issues are spreading across workflows.")}</p>
                <p>{text("2. 再看导入和设备是否成为根因。", "2. Check whether imports or devices are the root cause.")}</p>
                <p>{text("3. 最后触发同步或配置动作并留下审计痕迹。", "3. Trigger sync or configuration changes and keep an audit trail.")}</p>
              </div>
            </div>
          </Card>
        }
      />

      <TaskSection
        eyebrow={text("治理动作", "Governance actions")}
        title={text("把高风险动作放到明确入口", "Put risky actions behind explicit entry points")}
        description={text(
          "借鉴成熟企业后台常见的治理分工，告警、导入和同步都应该有自己的入口，不应该混进普通工作页。",
          "Borrowing from established enterprise console patterns, alerts, imports, and sync are treated as explicit admin actions rather than mixed into normal pages.",
        )}
      >
        <div className="grid gap-4 xl:grid-cols-3">
          {[
            {
              href: "/admin/alerts",
              title: text("告警处置", "Alert triage"),
              body: text("集中处理高优先级警报、状态变化和升级决策。", "Concentrate high-priority alert handling, status changes, and escalation decisions."),
              icon: <ShieldAlert className="h-5 w-5" />,
              badge: `${governanceSummary.alerts}`,
            },
            {
              href: "/admin/data-import",
              title: text("数据导入治理", "Data import governance"),
              body: text("把导入质量、回滚和审核动作集中到一个页里处理。", "Keep import quality, rollback, and approval actions in one dedicated surface."),
              icon: <Database className="h-5 w-5" />,
              badge: text("导入", "Imports"),
            },
            {
              href: "/platform-config",
              title: text("平台与策略配置", "Platform and policy config"),
              body: text("当问题已经涉及供应商、端点或系统策略时，再进入配置页。", "Go to configuration only when the issue touches providers, endpoints, or system policy."),
              icon: <Shield className="h-5 w-5" />,
              badge: text("配置", "Config"),
            },
          ].map((item) => (
            <Card key={item.href} variant="glass" className="h-full border-border/60">
              <div className="mb-4 flex items-center justify-between">
                <div className="rounded-2xl border border-border/60 bg-background/70 p-2.5 text-primary">
                  {item.icon}
                </div>
                <Badge variant="secondary">{item.badge}</Badge>
              </div>
              <h3 className="text-lg font-bold">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p>
              <Button asChild className="mt-5 w-fit">
                <Link href={item.href}>
                  {text("进入处理", "Open")}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </Card>
          ))}
        </div>
      </TaskSection>

      <TaskSection
        className="mt-10"
        eyebrow={text("治理摘要", "Governance posture")}
        title={text("只保留会改变管理员决策的信息", "Keep only the information that changes admin decisions")}
        description={text(
          "管理员在这里需要的是风险方向，而不是重新浏览一遍业务页面。",
          "Admins need risk direction here, not another copy of operational dashboards.",
        )}
      >
        {error ? (
          <EmptyStateCard
            icon={<AlertTriangle className="h-6 w-6" />}
            title={text("治理数据暂时不可用", "Governance data is unavailable")}
            description={error}
            action={<Button onClick={() => window.location.reload()}>{text("重新加载", "Reload")}</Button>}
          />
        ) : !snapshot ? (
          <PageLoadFallback
            fallbackHref="/home"
            title={text("加载治理摘要", "Loading governance posture")}
            description={text("正在准备治理摘要信息…", "Preparing governance posture...")}
          />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.8fr)]">
            <div className="grid gap-4 md:grid-cols-2">
              <Card variant="gradient" className="border-border/60">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-warning" />
                  <h3 className="text-lg font-bold">{text("告警压力", "Alert pressure")}</h3>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {text(
                    `当前共有 ${governanceSummary.alerts} 条告警需要管理员关注。高优先级告警应优先转入专门的告警队列页。`,
                    `${governanceSummary.alerts} alerts currently need administrative attention. High-priority items should move straight into the alert queue.`,
                  )}
                </p>
              </Card>

              <Card variant="gradient" className="border-border/60">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-info" />
                  <h3 className="text-lg font-bold">{text("同步压力", "Sync pressure")}</h3>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">
                  {text(
                    `当前有 ${governanceSummary.watchMetrics} 项指标趋势不理想。适合在治理侧统一发起同步与复核。`,
                    `${governanceSummary.watchMetrics} metrics are trending poorly, which makes this a good time to trigger sync and review from governance.`,
                  )}
                </p>
              </Card>
            </div>

            <Card variant="glass" className="border-border/60">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold">{text("设备治理关注项", "Device governance watchlist")}</h3>
                </div>
                <Badge variant="outline">{governanceSummary.maintenanceDevices}</Badge>
              </div>
              <div className="space-y-3">
                {snapshot.devices.slice(0, 4).map((device) => (
                  <div key={device.name} className="rounded-2xl border border-border/60 bg-background/50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold">{device.name}</span>
                      <Badge variant="secondary">{device.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{device.note}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </TaskSection>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-50">
          <div
            className={`rounded-2xl border px-4 py-3 shadow-card-hover ${
              toast.type === "success"
                ? "border-success/40 bg-success/10 text-success"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}
    </div>
  );
}
