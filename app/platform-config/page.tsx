"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Bot,
  Cable,
  CheckCircle2,
  Globe,
  Layers3,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import TaskSection from "../components/Layout/TaskSection";
import WorkflowHero, {
  type WorkflowHeroStat,
} from "../components/Layout/WorkflowHero";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { useLocale } from "../components/Locale/LocaleProvider";
import { readStoredAuthSession } from "@/lib/auth-session";
import {
  getDefaultRuntimeEndpointConfig,
  readRuntimeEndpointConfig,
  resetRuntimeEndpointConfig,
  saveRuntimeEndpointConfig,
  type RuntimeEndpointConfig,
} from "@/lib/runtime-endpoint-config";

type PlatformHealthPayload = {
  backend: {
    status: string;
    time: string;
  };
  aiMl: {
    status: string;
    baseUrl: string;
  };
  auth: {
    loginEndpoint: string;
    sessionEndpoint: string;
    logoutEndpoint: string;
  };
  enterprise: {
    overviewEndpoint: string;
    providersEndpoint: string;
    promptPresetsEndpoint: string;
  };
};

type ProbeState = {
  status: "idle" | "checking" | "success" | "error";
  message: string;
  payload: PlatformHealthPayload | null;
};

const INITIAL_PROBE_STATE: ProbeState = {
  status: "idle",
  message: "",
  payload: null,
};

export default function PlatformConfigPage() {
  const { text, t } = useLocale();
  const [form, setForm] = useState<RuntimeEndpointConfig>(() =>
    readRuntimeEndpointConfig(),
  );
  const [notice, setNotice] = useState("");
  const [probe, setProbe] = useState<ProbeState>(INITIAL_PROBE_STATE);
  const [hasSession, setHasSession] = useState(false);

  const defaults = useMemo(() => getDefaultRuntimeEndpointConfig(), []);

  useEffect(() => {
    setHasSession(Boolean(readStoredAuthSession()));

    const syncConfig = () => {
      setForm(readRuntimeEndpointConfig());
    };

    syncConfig();
    window.addEventListener(
      "app:endpoints-change",
      syncConfig as EventListener,
    );
    return () => {
      window.removeEventListener(
        "app:endpoints-change",
        syncConfig as EventListener,
      );
    };
  }, []);

  const probeHealth = useCallback(async (apiBaseUrl: string) => {
    setProbe({
      status: "checking",
      message: t(
        "pages.platform_config.copy001",
        undefined,
        "正在检查平台连接状态",
      ),
      payload: null,
    });

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 6000);
      const response = await fetch(`${apiBaseUrl.replace(/\/$/, "")}/health`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });
      window.clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as {
        data?: PlatformHealthPayload;
        message?: string;
      };

      setProbe({
        status: "success",
        message:
          payload.message ||
          t(
            "pages.platform_config.copy002",
            undefined,
            "连接成功，已获取平台健康信息",
          ),
        payload: payload.data ?? null,
      });
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? t(
              "pages.platform_config.copy003",
              undefined,
              "请求超时，请确认后端健康接口可达",
            )
          : error instanceof Error
            ? error.message
            : t(
                "pages.platform_config.copy004",
                undefined,
                "无法完成连接探测",
              );

      setProbe({
        status: "error",
        message,
        payload: null,
      });
    }
  }, [t]);

  useEffect(() => {
    probeHealth(form.apiBaseUrl).catch(console.error);
  }, [form.apiBaseUrl, probeHealth]);

  const handleSave = async () => {
    saveRuntimeEndpointConfig(form);
    setNotice(
      t(
        "pages.platform_config.copy005",
        undefined,
        "配置已保存，运行时缓存已刷新",
      ),
    );
    await probeHealth(form.apiBaseUrl);
  };

  const handleReset = async () => {
    resetRuntimeEndpointConfig();
    setForm(defaults);
    setNotice(
      t(
        "pages.platform_config.copy006",
        undefined,
        "已恢复默认端点配置",
      ),
    );
    await probeHealth(defaults.apiBaseUrl);
  };

  const updateField = <K extends keyof RuntimeEndpointConfig>(
    key: K,
    value: RuntimeEndpointConfig[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const probeVariant =
    probe.status === "success"
      ? "success"
      : probe.status === "error"
        ? "destructive"
        : probe.status === "checking"
          ? "info"
          : "outline";

  const backendUp = probe.payload?.backend.status === "up";
  const aiUp = probe.payload?.aiMl.status === "up";

  const heroStats = useMemo(
    () => {
      const stats: WorkflowHeroStat[] = [
        {
          label: text("后端入口", "Backend"),
          value: form.apiBaseUrl,
          detail: text("当前 API 基地址", "Current API base URL"),
          tone: probe.status === "error" ? "warning" : "default",
          icon: <Globe className="h-5 w-5" />,
        },
        {
          label: text("AI Provider", "AI Provider"),
          value: form.aiProviderBaseUrl,
          detail: text("模型请求出口", "Model request endpoint"),
          tone: aiUp ? "success" : "default",
          icon: <Bot className="h-5 w-5" />,
        },
        {
          label: text("聊天模型", "Chat model"),
          value: form.chatModel,
          detail: text("用于工作台对话", "Used by the assistant"),
          tone: "info",
          icon: <Sparkles className="h-5 w-5" />,
        },
        {
          label: text("Embedding", "Embedding"),
          value: form.embeddingModel,
          detail: text("用于检索与语义匹配", "Used for retrieval"),
          tone: "default",
          icon: <Layers3 className="h-5 w-5" />,
        },
      ];

      return stats;
    },
    [aiUp, form.aiProviderBaseUrl, form.apiBaseUrl, form.chatModel, form.embeddingModel, probe.status, text],
  );

  const endpointCards = [
    {
      title: text("平台健康接口", "Health endpoint"),
      value: `${form.apiBaseUrl}/health`,
      icon: Activity,
    },
    {
      title: text("登录接口", "Login endpoint"),
      value: probe.payload
        ? `${form.apiBaseUrl}${probe.payload.auth.loginEndpoint.replace("/api", "")}`
        : `${form.apiBaseUrl}/auth/login`,
      icon: ShieldCheck,
    },
    {
      title: text("会话接口", "Session endpoint"),
      value: probe.payload
        ? `${form.apiBaseUrl}${probe.payload.auth.sessionEndpoint.replace("/api", "")}`
        : `${form.apiBaseUrl}/auth/session`,
      icon: Cable,
    },
    {
      title: text("AI 实际出口", "Resolved AI endpoint"),
      value:
        probe.payload?.aiMl.baseUrl ||
        t(
          "pages.platform_config.copy033",
          undefined,
          "尚未返回 AI 服务地址",
        ),
      icon: Bot,
    },
  ];

  const governanceRules = [
    text("先保存配置，再验证连通性，最后切换业务页面。", "Save, validate, then switch pages."),
    text("后端与 AI Provider 都必须可达，才能稳定执行工作流。", "Both backend and AI provider should be reachable."),
    text("模型切换属于运行时动作，建议在业务低峰期进行。", "Switch models during low-traffic windows."),
  ];

  return (
    <div className="page-shell pb-10 pt-0">
      <BackButton fallbackHref={hasSession ? "/workspace" : "/login"} />

      <WorkflowHero
        eyebrow={text("Runtime Control", "Runtime Control")}
        title={text("平台运行时配置台", "Platform Runtime Control")}
        description={text(
          "这个页面不再只是修改几个地址，而是作为平台环境切换、连通性验证与风险确认的统一入口，让研发、实施和运维能在一个地方完成切换动作。",
          "A single console for environment switching, validation, and operational checks."
        )}
        badgeVariant="info"
        stats={heroStats}
        actions={
          <>
            <Button onClick={handleSave}>
              <CheckCircle2 className="h-4 w-4" />
              {text("保存并刷新缓存", "Save and refresh")}
            </Button>
            <Button variant="outline" onClick={() => probeHealth(form.apiBaseUrl)}>
              <Activity className="h-4 w-4" />
              {text("重新探测连接", "Probe connection")}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
              {text("恢复默认配置", "Reset to defaults")}
            </Button>
          </>
        }
        aside={
          <Card variant="glass" className="h-full border-border/70">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    {text("环境健康", "Environment health")}
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">
                    {text("连接验证与切换规则", "Validation and switching rules")}
                  </h2>
                </div>
                <Badge variant={probeVariant}>
                  {probe.status === "success"
                    ? text("已连通", "Healthy")
                    : probe.status === "error"
                      ? text("异常", "Error")
                      : probe.status === "checking"
                        ? text("检查中", "Checking")
                        : text("待检查", "Idle")}
                </Badge>
              </div>
              <div className="space-y-3">
                {governanceRules.map((rule, index) => (
                  <div
                    key={rule}
                    className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/55 p-4"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-sm font-black text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{rule}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        }
      />

      {notice ? (
        <div className="rounded-2xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
          {notice}
        </div>
      ) : null}

      <TaskSection
        title={text("环境与模型配置", "Environment and model settings")}
        description={text(
          "按企业级控制台的结构，把运行时配置、连通性结果和路由切换拆开，避免把风险操作堆在一个表单里。",
          "Configuration, health, and switching actions are separated to reduce operational risk."
        )}
      >
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)]">
          <Card variant="glass" className="space-y-5 border-border/70">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {text("配置编辑区", "Configuration editor")}
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                {text("运行时端点", "Runtime endpoints")}
              </h2>
            </div>

            <div className="grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">
                  {text("平台 API 基地址", "Platform API base URL")}
                </span>
                <input
                  value={form.apiBaseUrl}
                  onChange={(event) => updateField("apiBaseUrl", event.target.value)}
                  placeholder="http://localhost:18081/api"
                  className="w-full rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-foreground">
                  {text("AI Provider 地址", "AI provider base URL")}
                </span>
                <input
                  value={form.aiProviderBaseUrl}
                  onChange={(event) =>
                    updateField("aiProviderBaseUrl", event.target.value)
                  }
                  placeholder="https://api.openai.com/v1"
                  className="w-full rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    {text("聊天模型", "Chat model")}
                  </span>
                  <input
                    value={form.chatModel}
                    onChange={(event) => updateField("chatModel", event.target.value)}
                    placeholder="gpt-4o-mini"
                    className="w-full rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-foreground">
                    {text("Embedding 模型", "Embedding model")}
                  </span>
                  <input
                    value={form.embeddingModel}
                    onChange={(event) =>
                      updateField("embeddingModel", event.target.value)
                    }
                    placeholder="text-embedding-3-small"
                    className="w-full rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm outline-none transition focus:border-primary/40"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
              <strong className="block text-sm">
                {text("操作提示", "Operational note")}
              </strong>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {text(
                  "如果你要切换到新的后端环境，建议先替换 API 地址并做健康探测，确认成功后再切换 AI Provider 或模型配置。",
                  "When moving to a new environment, validate the backend first before switching provider or model settings."
                )}
              </p>
            </div>
          </Card>

          <div className="space-y-6">
            <Card variant="glass" className="space-y-5 border-border/70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    {text("连通性快照", "Connectivity snapshot")}
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight">
                    {text("探测结果", "Probe result")}
                  </h2>
                </div>
                <Badge variant={probeVariant}>
                  {probe.status === "success"
                    ? text("成功", "Success")
                    : probe.status === "error"
                      ? text("失败", "Error")
                      : probe.status === "checking"
                        ? text("检查中", "Checking")
                        : text("待执行", "Idle")}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {text("后端状态", "Backend")}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant={backendUp ? "success" : "outline"}>
                      {probe.payload?.backend.status ?? "--"}
                    </Badge>
                    {probe.payload?.backend.time ? (
                      <span className="text-xs text-muted-foreground">
                        {probe.payload.backend.time}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    {text("AI 服务", "AI service")}
                  </p>
                  <div className="mt-2">
                    <Badge variant={aiUp ? "success" : "outline"}>
                      {probe.payload?.aiMl.status ?? "--"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/55 p-4">
                <strong className="block text-sm">
                  {text("探测说明", "Probe note")}
                </strong>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {probe.message ||
                    t(
                      "pages.platform_config.copy028",
                      undefined,
                      "保存后可以在这里看到健康探测结果。",
                    )}
                </p>
              </div>
            </Card>

            <Card variant="glass" className="space-y-4 border-border/70">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                  {text("端点清单", "Endpoint inventory")}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  {text("解析后的实际地址", "Resolved endpoints")}
                </h2>
              </div>
              <div className="space-y-3">
                {endpointCards.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="rounded-2xl border border-border/70 bg-background/55 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-2xl border border-border/60 bg-card p-2.5 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <strong className="block">{item.title}</strong>
                          <p className="mt-2 break-all text-sm leading-6 text-muted-foreground">
                            {item.value}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      </TaskSection>

      <TaskSection
        title={text("切换后的下一步", "Next steps after switching")}
        description={text(
          "把配置动作和业务动作衔接起来，避免切完环境后还要手动找入口验证。",
          "Bridge environment switching with the next operational checks."
        )}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card variant="glass" className="border-border/70">
            <div className="space-y-4">
              <div>
                <strong className="block text-lg">
                  {hasSession
                    ? text("返回工作台验证业务流", "Return to workspace")
                    : text("登录并进入工作台", "Login to continue")}
                </strong>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {hasSession
                    ? text(
                        "完成配置后，建议回到工作台快速验证首页、告警页和数据面板是否都能正常加载。",
                        "Return to the workspace and verify the main dashboards."
                      )
                    : text(
                        "配置完成后请先登录，以便验证会话、路由和业务接口是否都能正常工作。",
                        "Sign in after configuration to validate session and business routes."
                      )}
                </p>
              </div>
              <Button asChild>
                <Link href={hasSession ? "/workspace" : "/login"}>
                  <Wrench className="h-4 w-4" />
                  {hasSession
                    ? text("进入工作台", "Open workspace")
                    : text("前往登录", "Go to login")}
                </Link>
              </Button>
            </div>
          </Card>

          <Card variant="glass" className="border-border/70">
            <div className="space-y-4">
              <div>
                <strong className="block text-lg">
                  {text("用 AI 助手做连通性复核", "Use AI assistant for validation")}
                </strong>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {text(
                    "如果你要快速验证模型与业务数据是否协同可用，可以直接进入 AI 助手页做一轮质量概览或报告生成测试。",
                    "Open the AI assistant to validate model + business-data flow in one pass."
                  )}
                </p>
              </div>
              <Button variant="outline" asChild>
                <Link href="/ai-assistant">
                  <Bot className="h-4 w-4" />
                  {text("打开 AI 助手", "Open AI assistant")}
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </TaskSection>
    </div>
  );
}
