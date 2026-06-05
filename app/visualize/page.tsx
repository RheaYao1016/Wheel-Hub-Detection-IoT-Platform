"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
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

const REFRESH_INTERVAL_MS = 12000;
const LOG_SCROLL_INTERVAL_MS = 2400;
const MAX_LOG_LINES = 12;

export default function VisualizePage() {
  const router = useRouter();
  const ready = useSessionGuard(["admin", "user"]);
  const { text, locale, t } = useLocale();
  const [snapshot, setSnapshot] = useState<CommandCenterSnapshot | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const logBoxRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const payload = await fetchPlatformData<CommandCenterSnapshot>(
        "/dashboard/command-center",
        "/api/command-center",
      );
      setSnapshot(payload);
      setLogs(payload.logs.slice(0, MAX_LOG_LINES));
      setLastRefreshed(new Date());
      setError("");
      setIsLoading(false);
    } catch (requestError) {
      if (requestError instanceof PlatformAuthError) {
        clearAuthSession();
        router.replace("/login");
        return;
      }
      console.error(requestError);
      setError(t("pages.visualize.dataLoadFailed"));
      setIsLoading(false);
    } finally {
      setIsRefreshing(false);
    }
  }, [router, t]);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const load = async () => {
      if (!active) return;
      await loadData();
    };

    load();
    const timer = window.setInterval(load, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [ready, loadData]);

  useEffect(() => {
    if (!snapshot?.logs.length) return;

    const timer = window.setInterval(() => {
      setLogs((previous) => {
        const sourceLogs = snapshot.logs;
        if (sourceLogs.length === 0) return previous;
        const nextIndex = previous.length % sourceLogs.length;
        const nextLine = sourceLogs[nextIndex];
        const next = [...previous, nextLine];
        return next.length > MAX_LOG_LINES ? next.slice(next.length - MAX_LOG_LINES) : next;
      });
    }, LOG_SCROLL_INTERVAL_MS);

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
    [t],
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
  }, [logs.length, snapshot, t]);

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    const headerOffset = 80;
    const elementPosition = target.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
    window.scrollTo({
      top: offsetPosition,
      behavior: "smooth",
    });
  };

  const formatRefreshTime = (date: Date) => {
    return date.toLocaleTimeString(locale === "zh-CN" ? "zh-CN" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/home"
        title={t("pages.visualize.title")}
        description={t("pages.visualize.subtitle")}
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

      {/* Quick Jump Navigation Strip */}
      <nav className="quick-jump-strip" aria-label={t("pages.visualize.copy022")}>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("cmd-hero")}
          aria-label={t("pages.visualize.copy024")}
        >
          {t("pages.visualize.copy024")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("cmd-quality")}
          aria-label={t("pages.visualize.copy025")}
        >
          {t("pages.visualize.copy025")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("cmd-queue")}
          aria-label={t("pages.visualize.copy026")}
        >
          {t("pages.visualize.copy026")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("cmd-log")}
          aria-label={t("pages.visualize.copy027")}
        >
          {t("pages.visualize.copy027")}
        </button>
      </nav>

      {/* Hero Section */}
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

          {/* Story Cards */}
          <div className="command-story-strip">
            {storyCards.map((item, index) => (
              <div
                key={item.label}
                className={`command-story-card hover-lift stagger-${(index % 3) + 1}`}
              >
                <span>{item.label}</span>
                <strong className="text-gradient">{item.value}</strong>
                <em>{item.note}</em>
              </div>
            ))}
          </div>

          {/* Metric Tiles */}
          <div className="command-metric-row">
            {snapshot?.metrics.map((metric, index) => (
              <div
                key={metric.label}
                className={`command-metric-tile hover-lift stagger-${(index % 4) + 1}`}
              >
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <em className={`trend-${metric.trend}`}>{metric.delta}</em>
              </div>
            )) ?? (
              <div className="loading-state loading-skeleton">
                {t("pages.visualize.loadingKPI")}
              </div>
            )}
          </div>
        </div>

        {/* Operations Scope Card */}
        <Card className="command-hero-visual glow-border animate-scale-in stagger-2">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {t("pages.visualize.opsScope")}
              </span>
              <h2>{t("pages.visualize.responsibility")}</h2>
            </div>
            <Badge variant="success">{t("pages.visualize.confirmed")}</Badge>
          </div>
          <div className="enterprise-highlight-list">
            <div className="hover-lift">
              <strong className="text-gradient">
                {t("pages.visualize.keepHere")}
              </strong>
              <p>
                {t("pages.visualize.keepHereDesc")}
              </p>
            </div>
            <div className="hover-lift">
              <strong className="text-gradient">
                {t("pages.visualize.moveOut")}
              </strong>
              <p>
                {t("pages.visualize.moveOutDesc")}
              </p>
            </div>
            <div className="hover-lift">
              <strong className="text-gradient">
                {t("pages.visualize.suggestedRoute")}
              </strong>
              <p>
                {t("pages.visualize.suggestedRouteDesc")}
              </p>
            </div>
          </div>
        </Card>
      </section>

      {/* Error State */}
      {error ? (
        <div className="empty-state animate-scale-in" role="alert">
          <span>!</span>
          <p>{error}</p>
          <button
            type="button"
            className="enterprise-secondary-button mt-4"
            onClick={loadData}
          >
            {t("common.refresh")}
          </button>
        </div>
      ) : null}

      {/* Charts Row - Quality & Throughput */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Quality Pie Chart */}
        <Card
          id="cmd-quality"
          className="xl:col-span-5 lg:col-span-6 chart-card animate-fade-in-up stagger-1"
        >
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {t("pages.visualize.qualityMix")}
              </span>
              <h2>{t("pages.visualize.qualityOverview")}</h2>
            </div>
          </div>
          <div className="chart-body">
            {snapshot && !isLoading ? (
              <PieChart
                title={t("pages.visualize.qualityMix")}
                data={snapshot.quality}
                height="340px"
              />
            ) : (
              <div className="loading-state loading-skeleton chart-skeleton">
                <div className="skeleton-pulse" />
                <p>{t("pages.visualize.loadingChart")}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Throughput Line Chart */}
        <Card
          id="cmd-throughput"
          className="xl:col-span-7 lg:col-span-6 chart-card animate-fade-in-up stagger-2"
        >
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {t("pages.visualize.throughputTrend")}
              </span>
              <h2>{t("pages.visualize.last30Days")}</h2>
            </div>
            <div className="panel-actions">
              <Badge variant="outline">
                {t("pages.visualize.autoRefresh")}
              </Badge>
              {lastRefreshed && (
                <span className="refresh-timestamp">
                  {t("common.now")}: {formatRefreshTime(lastRefreshed)}
                </span>
              )}
              {isRefreshing && <span className="refresh-spinner" />}
            </div>
          </div>
          <div className="chart-body">
            {snapshot && !isLoading ? (
              <LineChart
                data={snapshot.trend}
                height="340px"
              />
            ) : (
              <div className="loading-state loading-skeleton chart-skeleton">
                <div className="skeleton-pulse" />
                <p>{t("pages.visualize.loadingTrend")}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Queue & Decision Notes Row */}
      <div id="cmd-queue" className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Live Queue */}
        <Card className="xl:col-span-5 lg:col-span-6 animate-fade-in-up stagger-3">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {t("pages.visualize.liveQueue")}
              </span>
              <h2>{t("pages.visualize.liveQueueTitle")}</h2>
            </div>
            <Badge variant="outline">
              {t("pages.visualize.rollingBatches")}
            </Badge>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="live-queue pr-4">
              {snapshot?.liveProjects?.length ? (
                snapshot.liveProjects.map((project, index) => (
                  <div
                    key={project.id}
                    className={`live-queue-item hover-lift stagger-${(index % 6) + 1}`}
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
                ))
              ) : (
                <div className="loading-state loading-skeleton">
                  {t("pages.visualize.copy029")}
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Decision Notes */}
        <Card className="xl:col-span-7 lg:col-span-6 animate-fade-in-up stagger-4">
          <div className="panel-heading">
            <div>
              <span className="panel-kicker">
                {t("pages.visualize.decisionNotes")}
              </span>
              <h2>{t("pages.visualize.nextActions")}</h2>
            </div>
          </div>
          <div className="enterprise-highlight-list">
            <div className="hover-lift">
              <strong className="text-gradient">
                {t("pages.visualize.startFromQuality")}
              </strong>
              <p>
                {t("pages.visualize.startFromQualityDesc")}
              </p>
            </div>
            <div className="hover-lift">
              <strong className="text-gradient">
                {t("pages.visualize.inspectTrend")}
              </strong>
              <p>
                {t("pages.visualize.inspectTrendDesc")}
              </p>
            </div>
            <div className="hover-lift">
              <strong className="text-gradient">
                {t("pages.visualize.checkQueue")}
              </strong>
              <p>
                {t("pages.visualize.checkQueueDesc")}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Execution Log */}
      <Card id="cmd-log" className="animate-scale-in stagger-5">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">
              {t("pages.visualize.executionLog")}
            </span>
            <h2>{t("pages.visualize.executionStream")}</h2>
          </div>
          <Badge variant="outline">
            {t("pages.visualize.logSimulation")}
          </Badge>
        </div>
        <ScrollArea className="h-[200px]">
          <div ref={logBoxRef} className="logbox command-logbox pr-4" role="log" aria-live="polite">
            {logs.length ? (
              logs.map((line, index) => (
                <div key={`${line}-${index}`} className="log-entry">
                  {line}
                </div>
              ))
            ) : (
              <div className="loading-state loading-skeleton">
                {t("pages.visualize.loadingLogs")}
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>
    </div>
  );
}
