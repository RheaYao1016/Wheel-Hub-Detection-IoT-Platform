"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BellRing,
  CheckCircle2,
  Download,
  Eye,
  Filter,
  Megaphone,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import BackButton from "../../components/Layout/BackButton";
import Card from "../../components/Layout/Card";
import EmptyStateCard from "../../components/Layout/EmptyStateCard";
import PageLoadFallback from "../../components/Layout/PageLoadFallback";
import TaskSection from "../../components/Layout/TaskSection";
import WorkflowHero from "../../components/Layout/WorkflowHero";
import { Badge } from "@/app/components/ui/Badge";
import { Button } from "@/app/components/ui/Button";
import ExportButton from "@/app/components/Controls/ExportButton";
import { buildExportFilename, exportToCsv } from "@/app/utils/export";
import { clearAuthSession } from "@/lib/auth-session";
import {
  PlatformAuthError,
  requestPlatformJson,
} from "@/lib/dashboard-client";
import { parseGovernanceHandoffSearch, type GovernanceHandoffPayload } from "@/lib/governance-handoff";
import type { AlertLevel, AlertRecord, AlertStatus } from "@/types/alerts";
import { useLocale } from "@/app/components/Locale/LocaleProvider";
import { useAdminGuard } from "../hooks/useAdminGuard";

type ToastState = {
  message: string;
  type: "success" | "error";
};

type CanonicalAlertLevel = "HIGH" | "MEDIUM" | "LOW";
type CanonicalAlertStatus = "PENDING" | "READ" | "DISPATCHED" | "IGNORED";

const SAMPLE_ALERTS: AlertRecord[] = [
  {
    id: "AL-2025-0311-01",
    timestamp: "2025-03-11 08:42:11",
    station: "ST-01",
    level: "HIGH",
    description: "Radial runout reached 0.32mm, above the 0.25mm threshold.",
    status: "PENDING",
  },
  {
    id: "AL-2025-0311-02",
    timestamp: "2025-03-11 09:07:18",
    station: "ST-02",
    level: "MEDIUM",
    description: "Camera exposure drift detected. Verify illumination module.",
    status: "PENDING",
  },
  {
    id: "AL-2025-0311-03",
    timestamp: "2025-03-11 09:25:54",
    station: "ST-03",
    level: "LOW",
    description: "Buffer queue is close to threshold; cleanup is recommended.",
    status: "PENDING",
  },
];

const levelMap: Record<string, CanonicalAlertLevel> = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  高: "HIGH",
  中: "MEDIUM",
  低: "LOW",
};

const statusMap: Record<string, CanonicalAlertStatus> = {
  PENDING: "PENDING",
  READ: "READ",
  DISPATCHED: "DISPATCHED",
  IGNORED: "IGNORED",
  待处理: "PENDING",
  已读: "READ",
  已派发: "DISPATCHED",
  已忽略: "IGNORED",
};

const backendStatusMap: Record<CanonicalAlertStatus, string> = {
  PENDING: "待处理",
  READ: "已读",
  DISPATCHED: "已派发",
  IGNORED: "已忽略",
};

function normalizeLevel(value: AlertLevel): CanonicalAlertLevel {
  return levelMap[value] ?? "LOW";
}

function normalizeStatus(value: AlertStatus): CanonicalAlertStatus {
  return statusMap[value] ?? "PENDING";
}

function severityScore(level: CanonicalAlertLevel) {
  return level === "HIGH" ? 3 : level === "MEDIUM" ? 2 : 1;
}

export default function AlertsPage() {
  return (
    <Suspense
      fallback={
        <PageLoadFallback
          fallbackHref="/admin"
          title="Alert triage"
          description="Preparing governance alert triage..."
        />
      }
    >
      <AlertsPageContent />
    </Suspense>
  );
}

function AlertsPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const ready = useAdminGuard();
  const { text, t } = useLocale();
  const [records, setRecords] = useState<AlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<"ALL" | CanonicalAlertLevel>(
    "ALL",
  );
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | CanonicalAlertStatus
  >("ALL");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [handoff, setHandoff] = useState<GovernanceHandoffPayload | null>(null);
  const toastTimerRef = useRef<number>();

  const showToast = useCallback((message: string, type: ToastState["type"]) => {
    setToast({ message, type });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  const localizeLevel = useCallback(
    (level: CanonicalAlertLevel) =>
      ({
        HIGH: t("pages.admin.alerts.copy001", undefined, "高"),
        MEDIUM: t("pages.admin.alerts.copy002", undefined, "中"),
        LOW: t("pages.admin.alerts.copy003", undefined, "低"),
      })[level],
    [t],
  );

  const localizeStatus = useCallback(
    (status: CanonicalAlertStatus) =>
      ({
        PENDING: t("pages.admin.alerts.copy004", undefined, "待处理"),
        READ: t("pages.admin.alerts.copy005", undefined, "已读"),
        DISPATCHED: t("pages.admin.alerts.copy006", undefined, "已派发"),
        IGNORED: t("pages.admin.alerts.copy007", undefined, "已忽略"),
      })[status],
    [t],
  );

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (levelFilter !== "ALL") {
        params.set("level", localizeLevel(levelFilter));
      }
      if (statusFilter !== "ALL") {
        params.set("status", backendStatusMap[statusFilter]);
      }
      const query = params.toString();

      const data = await requestPlatformJson<AlertRecord[]>(
        `/admin/alerts${query ? `?${query}` : ""}`,
        "",
      );
      setRecords(
        data.map((item) => ({
          ...item,
          level: normalizeLevel(item.level),
          status: normalizeStatus(item.status),
        })),
      );
    } catch (error) {
      if (error instanceof PlatformAuthError) {
        clearAuthSession();
        router.replace("/login");
        return;
      }
      console.error("load alerts failed", error);
      const fallback = SAMPLE_ALERTS.filter((item) => {
        const levelPass =
          levelFilter === "ALL" || normalizeLevel(item.level) === levelFilter;
        const statusPass =
          statusFilter === "ALL" ||
          normalizeStatus(item.status) === statusFilter;
        return levelPass && statusPass;
      });
      setRecords(fallback);
      showToast(
        t("pages.admin.alerts.copy008", undefined, "告警接口异常，已显示示例数据"),
        "error",
      );
    } finally {
      setLoading(false);
    }
  }, [levelFilter, localizeLevel, router, showToast, statusFilter, t]);

  useEffect(() => {
    const nextHandoff = parseGovernanceHandoffSearch(params);
    setHandoff(nextHandoff);
    if (nextHandoff?.riskLevel?.toLowerCase() === "high") {
      setLevelFilter("HIGH");
      setStatusFilter("PENDING");
    }
  }, [params]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    loadAlerts();
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [loadAlerts, ready]);

  const sortedRecords = useMemo(
    () =>
      [...records].sort((left, right) => {
        const severityGap =
          severityScore(normalizeLevel(right.level)) -
          severityScore(normalizeLevel(left.level));
        if (severityGap !== 0) {
          return severityGap;
        }
        if (
          normalizeStatus(left.status) === "PENDING" &&
          normalizeStatus(right.status) !== "PENDING"
        ) {
          return -1;
        }
        if (
          normalizeStatus(right.status) === "PENDING" &&
          normalizeStatus(left.status) !== "PENDING"
        ) {
          return 1;
        }
        return right.timestamp.localeCompare(left.timestamp);
      }),
    [records],
  );

  const pendingCount = useMemo(
    () =>
      sortedRecords.filter((item) => normalizeStatus(item.status) === "PENDING")
        .length,
    [sortedRecords],
  );

  const highPriorityCount = useMemo(
    () =>
      sortedRecords.filter((item) => normalizeLevel(item.level) === "HIGH")
        .length,
    [sortedRecords],
  );

  const dispatchedCount = useMemo(
    () =>
      sortedRecords.filter(
        (item) => normalizeStatus(item.status) === "DISPATCHED",
      ).length,
    [sortedRecords],
  );

  const queueSummary = useMemo(
    () => [
      {
        label: text("全部告警", "All alerts"),
        value: String(sortedRecords.length),
        detail: text("当前筛选结果", "Current filtered set"),
      },
      {
        label: text("待处理", "Pending"),
        value: String(pendingCount),
        detail: text("优先处理项", "Needs action now"),
      },
      {
        label: text("高优先级", "High severity"),
        value: String(highPriorityCount),
        detail: text("建议立即派发", "Should be dispatched first"),
      },
      {
        label: text("已派发", "Dispatched"),
        value: String(dispatchedCount),
        detail: text("正在跟进", "Already assigned"),
      },
    ],
    [dispatchedCount, highPriorityCount, pendingCount, sortedRecords.length, text],
  );

  const handleAction = useCallback(
    async (id: string, status: CanonicalAlertStatus) => {
      try {
        await requestPlatformJson<AlertRecord>(`/admin/alerts/${id}`, "", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: backendStatusMap[status] }),
        });
        setRecords((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status } : item)),
        );
        showToast(
          t("pages.admin.alerts.copy009", undefined, "告警状态已更新"),
          "success",
        );
      } catch (error) {
        if (error instanceof PlatformAuthError) {
          clearAuthSession();
          router.replace("/login");
          return;
        }
        console.error("alert update failed", error);
        setRecords((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status } : item)),
        );
        showToast(
          t("pages.admin.alerts.copy010", undefined, "接口异常，已在本地更新状态"),
          "error",
        );
      }
    },
    [router, showToast, t],
  );

  const handleExport = useCallback(() => {
    if (!sortedRecords.length) {
      showToast(
        t("pages.admin.alerts.copy011", undefined, "暂无可导出的告警"),
        "error",
      );
      return;
    }
    exportToCsv({
      filename: buildExportFilename("alerts"),
      header: [
        t("pages.admin.alerts.copy012", undefined, "告警编号"),
        t("pages.admin.alerts.copy013", undefined, "时间"),
        t("pages.admin.alerts.copy014", undefined, "工位"),
        t("pages.admin.alerts.copy015", undefined, "级别"),
        t("pages.admin.alerts.copy016", undefined, "描述"),
        t("pages.admin.alerts.copy017", undefined, "状态"),
      ],
      rows: sortedRecords.map((alert) => [
        alert.id,
        alert.timestamp,
        alert.station,
        localizeLevel(normalizeLevel(alert.level)),
        alert.description,
        localizeStatus(normalizeStatus(alert.status)),
      ]),
    });
    showToast(
      t("pages.admin.alerts.copy018", undefined, "告警清单已导出"),
      "success",
    );
  }, [localizeLevel, localizeStatus, showToast, sortedRecords, t]);

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/admin"
        title={t("pages.admin.alerts.copy019", undefined, "告警页加载中")}
        description={t(
          "pages.admin.alerts.copy020",
          undefined,
          "正在准备告警调度工作台",
        )}
      />
    );
  }

  return (
    <div className="page-shell pb-10 pt-0">
      <BackButton fallbackHref="/admin" />

      {handoff ? (
        <Card variant="glass" className="mb-6 border-warning/35 bg-warning/5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="warning">
                  {text("来自报告中心的治理交接", "Governance handoff from Reports")}
                </Badge>
                {handoff.riskLevel ? <Badge variant="outline">{handoff.riskLevel}</Badge> : null}
                {handoff.jobId ? <Badge variant="secondary">{handoff.jobId.slice(0, 8)}</Badge> : null}
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">
                  {handoff.headline || text("新的高风险分析已进入治理队列", "A new high-risk analysis has entered the governance queue")}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                  {handoff.summary ||
                    text(
                      "这次治理交接来自正式报告。请先确认是否需要派发、升级，或者回到报告中心继续补充证据。",
                      "This governance handoff came from formal reporting. Confirm whether it should be dispatched, escalated, or sent back for more evidence.",
                    )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={loadAlerts}>
                <RefreshCw className="h-4 w-4" />
                {text("刷新治理队列", "Refresh queue")}
              </Button>
              <Button asChild variant="outline">
                <Link href="/reports">{text("回到报告中心", "Back to Reports")}</Link>
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <WorkflowHero
        eyebrow={text("Alert Triage", "Alert Triage")}
        title={t("pages.admin.alerts.copy022", undefined, "告警调度工作台")}
        description={text(
          "参考企业级告警台的分流模式，页面优先展示处置顺序和责任动作，而不是让你先掉进一整张密表里逐行看。",
          "An alert triage surface that prioritizes action order over raw rows."
        )}
        badgeVariant="warning"
        stats={queueSummary.map((item, index) => ({
          label: item.label,
          value: item.value,
          detail: item.detail,
          tone:
            index === 1 || index === 2
              ? "warning"
              : index === 3
                ? "success"
                : "default",
          icon:
            index === 0 ? (
              <BellRing className="h-5 w-5" />
            ) : index === 1 ? (
              <ShieldAlert className="h-5 w-5" />
            ) : index === 2 ? (
              <AlertTriangle className="h-5 w-5" />
            ) : (
              <Megaphone className="h-5 w-5" />
            ),
        }))}
        actions={
          <>
            <Button onClick={loadAlerts}>
              <RefreshCw className="h-4 w-4" />
              {t("pages.admin.alerts.copy028", undefined, "刷新队列")}
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4" />
              {text("导出清单", "Export list")}
            </Button>
          </>
        }
        aside={
          <Card variant="glass" className="h-full border-border/70">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {text("推荐顺序", "Recommended order")}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  {text("先高危，再待处理，再复核", "High risk first")}
                </h2>
              </div>
              <div className="space-y-3">
                {sortedRecords.slice(0, 3).map((record, index) => {
                  const level = normalizeLevel(record.level);
                  return (
                    <div
                      key={record.id}
                      className="rounded-2xl border border-border/70 bg-background/55 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-black text-primary">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong>{record.station}</strong>
                            <Badge
                              variant={
                                level === "HIGH"
                                  ? "destructive"
                                  : level === "MEDIUM"
                                    ? "warning"
                                    : "info"
                              }
                            >
                              {localizeLevel(level)}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {record.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!sortedRecords.length ? (
                  <p className="text-sm text-muted-foreground">
                    {text("当前没有告警需要排序。", "No alerts to prioritize right now.")}
                  </p>
                ) : null}
              </div>
            </div>
          </Card>
        }
      />

      <TaskSection
        title={text("筛选与分流", "Filters and triage")}
        description={text(
          "先确定你想看的级别和状态，再进入卡片化的处置视图，比传统表格更容易做优先级判断。",
          "Filter first, then act from a triage-oriented queue."
        )}
        action={<ExportButton onClick={handleExport} disabled={!sortedRecords.length} />}
      >
        <div className="grid gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
          <Card variant="glass" className="space-y-5 border-border/70">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {text("筛选面板", "Filter panel")}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                {text("告警范围", "Alert scope")}
              </h2>
            </div>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">
                {t("pages.admin.alerts.copy015", undefined, "级别")}
              </span>
              <select
                className="w-full rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                value={levelFilter}
                onChange={(event) =>
                  setLevelFilter(event.target.value as "ALL" | CanonicalAlertLevel)
                }
              >
                <option value="ALL">
                  {t("pages.admin.alerts.copy027", undefined, "全部")}
                </option>
                <option value="HIGH">{localizeLevel("HIGH")}</option>
                <option value="MEDIUM">{localizeLevel("MEDIUM")}</option>
                <option value="LOW">{localizeLevel("LOW")}</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-foreground">
                {t("pages.admin.alerts.copy017", undefined, "状态")}
              </span>
              <select
                className="w-full rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "ALL" | CanonicalAlertStatus,
                  )
                }
              >
                <option value="ALL">
                  {t("pages.admin.alerts.copy027", undefined, "全部")}
                </option>
                <option value="PENDING">{localizeStatus("PENDING")}</option>
                <option value="READ">{localizeStatus("READ")}</option>
                <option value="DISPATCHED">{localizeStatus("DISPATCHED")}</option>
                <option value="IGNORED">{localizeStatus("IGNORED")}</option>
              </select>
            </label>

            <div className="grid gap-3">
              <Button onClick={loadAlerts}>
                <Filter className="h-4 w-4" />
                {text("应用筛选并刷新", "Apply and refresh")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setLevelFilter("ALL");
                  setStatusFilter("ALL");
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                {text("恢复全部范围", "Reset filters")}
              </Button>
            </div>
          </Card>

          <div className="space-y-4">
            {loading ? (
              <Card variant="glass" className="border-border/70 p-6">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  {t("pages.admin.alerts.copy029", undefined, "正在加载告警队列")}
                </div>
              </Card>
            ) : null}

            {!loading && !sortedRecords.length ? (
              <EmptyStateCard
                icon={<BellRing className="h-6 w-6" />}
                title={t("pages.admin.alerts.copy034", undefined, "暂无告警")}
                description={text(
                  "当前筛选条件下没有需要处理的告警。你可以恢复筛选范围，或者稍后重新刷新队列。",
                  "No alerts match the current filters."
                )}
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      setLevelFilter("ALL");
                      setStatusFilter("ALL");
                      loadAlerts().catch(console.error);
                    }}
                  >
                    {text("查看全部告警", "View all alerts")}
                  </Button>
                }
              />
            ) : null}

            {!loading &&
              sortedRecords.map((alert) => {
                const level = normalizeLevel(alert.level);
                const status = normalizeStatus(alert.status);

                return (
                  <Card
                    key={alert.id}
                    variant="glass"
                    className="border-border/70"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-lg">{alert.station}</strong>
                          <Badge
                            variant={
                              level === "HIGH"
                                ? "destructive"
                                : level === "MEDIUM"
                                  ? "warning"
                                  : "info"
                            }
                          >
                            {localizeLevel(level)}
                          </Badge>
                          <Badge
                            variant={
                              status === "DISPATCHED"
                                ? "success"
                                : status === "IGNORED"
                                  ? "outline"
                                  : status === "READ"
                                    ? "info"
                                    : "warning"
                            }
                          >
                            {localizeStatus(status)}
                          </Badge>
                        </div>

                        <p className="text-sm leading-7 text-foreground">
                          {alert.description}
                        </p>

                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>{alert.id}</span>
                          <span>{alert.timestamp}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction(alert.id, "READ")}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {t("pages.admin.alerts.copy031", undefined, "标记已读")}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction(alert.id, "IGNORED")}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t("pages.admin.alerts.copy032", undefined, "忽略")}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAction(alert.id, "DISPATCHED")}
                        >
                          <Megaphone className="h-3.5 w-3.5" />
                          {t("pages.admin.alerts.copy033", undefined, "派发处理")}
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
          </div>
        </div>
      </TaskSection>

      {toast ? (
        <div
          className={`floating-toast ${toast.type === "success" ? "success" : "error"}`}
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
