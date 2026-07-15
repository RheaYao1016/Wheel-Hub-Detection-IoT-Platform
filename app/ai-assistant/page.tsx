"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  BrainCircuit,
  CheckCircle2,
  ClipboardList,
  Database,
  FileText,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  Sparkles,
  Target,
  Workflow,
} from "lucide-react";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import EmptyStateCard from "../components/Layout/EmptyStateCard";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import SectionSkeleton from "../components/Layout/SectionSkeleton";
import TaskSection from "../components/Layout/TaskSection";
import WorkflowHero, { type WorkflowHeroStat } from "../components/Layout/WorkflowHero";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/Accordion";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Checkbox } from "../components/ui/Checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/Select";
import { Textarea } from "../components/ui/Textarea";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
import { enterpriseErrorMessage, enterpriseGet, enterprisePost } from "@/lib/enterprise-client";
import { buildReportHandoffSearch } from "@/lib/report-handoff";
import { cn } from "@/lib/utils";
import type {
  AiProviderProfile,
  ChatMessage,
  ChatSession,
  EnterpriseOverview,
  PromptPreset,
} from "@/types/enterprise";

type PersonaOption = {
  id: string;
  labelZh: string;
  labelEn: string;
  detailZh: string;
  detailEn: string;
};

type QuickPrompt = {
  labelZh: string;
  labelEn: string;
  promptZh: string;
  promptEn: string;
  tone: "info" | "warning" | "success" | "default";
};

const PERSONA_OPTIONS: PersonaOption[] = [
  {
    id: "operator",
    labelZh: "现场执行",
    labelEn: "Operator",
    detailZh: "先给判断，再给一线动作。",
    detailEn: "Lead with a decision, then recommend frontline action.",
  },
  {
    id: "engineer",
    labelZh: "工程复核",
    labelEn: "Engineer",
    detailZh: "更关注原因链、证据和后续训练影响。",
    detailEn: "Focus on causality, evidence, and downstream training impact.",
  },
  {
    id: "manager",
    labelZh: "管理复盘",
    labelEn: "Manager",
    detailZh: "适合形成正式结论、复盘与升级判断。",
    detailEn: "Best for formal conclusions, reviews, and escalation judgment.",
  },
];

const QUICK_PROMPTS: QuickPrompt[] = [
  {
    labelZh: "今日质量概览",
    labelEn: "Today posture",
    promptZh: "请根据当前已接入的数据源，给我一份今天的质量总览，先说最重要的风险。",
    promptEn: "Use the connected sources to summarize today's quality posture and lead with the highest risk.",
    tone: "info",
  },
  {
    labelZh: "异常处置顺序",
    labelEn: "Triage order",
    promptZh: "请按优先级列出今天最值得先处理的异常，并解释为什么。",
    promptEn: "Rank the most important anomalies to handle today and explain why.",
    tone: "warning",
  },
  {
    labelZh: "准备正式报告",
    labelEn: "Prepare report",
    promptZh: "请把当前最重要的问题整理成适合交给报告中心继续沉淀的结论框架。",
    promptEn: "Package the most important issue into a conclusion structure that can be handed off to Report Center.",
    tone: "success",
  },
];

const EMPTY_PROVIDERS: AiProviderProfile[] = [];
const EMPTY_PRESETS: PromptPreset[] = [];
const EMPTY_SOURCES: EnterpriseOverview["dataSources"] = [];
const EMPTY_ANALYSIS_JOBS: EnterpriseOverview["analysisJobs"] = [];
const EMPTY_REPORTS: EnterpriseOverview["reports"] = [];

function createSessionTitle(preset: PromptPreset | undefined, text: (zh: string, en: string) => string) {
  const prefix = preset
    ? text(preset.name, preset.name)
    : text("AI 分析会话", "AI analysis session");
  return `${prefix} ${new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatConversationTime(value: string, locale: "zh-CN" | "en-US") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function roleTone(role: ChatMessage["role"]) {
  return role === "assistant"
    ? "border-border/70 bg-card/70"
    : "border-primary/25 bg-primary/10";
}

export default function AiAssistantPage() {
  const ready = useSessionGuard(["admin", "engineer", "operator", "viewer"]);
  const { locale, text } = useLocale();
  const router = useRouter();
  const [overview, setOverview] = useState<EnterpriseOverview | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [promptPresetId, setPromptPresetId] = useState("");
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [persona, setPersona] = useState("operator");
  const [verbosity, setVerbosity] = useState("standard");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [savingContext, setSavingContext] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const providers = overview?.providers ?? EMPTY_PROVIDERS;
  const promptPresets = overview?.promptPresets ?? EMPTY_PRESETS;
  const sources = overview?.dataSources ?? EMPTY_SOURCES;
  const analysisJobs = overview?.analysisJobs ?? EMPTY_ANALYSIS_JOBS;
  const reports = overview?.reports ?? EMPTY_REPORTS;

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId) ?? null,
    [activeSessionId, sessions],
  );

  const selectedPromptPreset = useMemo(
    () => promptPresets.find((preset) => preset.id === promptPresetId) ?? null,
    [promptPresetId, promptPresets],
  );

  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((item) => item.role === "assistant") ?? null,
    [messages],
  );

  const latestUserMessage = useMemo(
    () => [...messages].reverse().find((item) => item.role === "user") ?? null,
    [messages],
  );

  const heroStats = useMemo<WorkflowHeroStat[]>(
    () => [
      {
        label: text("会话队列", "Session queue"),
        value: `${sessions.length}`,
        detail: text("可继续追问的工作会话", "Work sessions ready for follow-up"),
        icon: <MessageSquare className="h-5 w-5" />,
        tone: sessions.length ? "info" : "default",
      },
      {
        label: text("可用数据源", "Available sources"),
        value: `${sources.length}`,
        detail: text("已接入 AI 上下文的业务数据", "Business sources available to AI"),
        icon: <Database className="h-5 w-5" />,
        tone: sources.length ? "success" : "warning",
      },
      {
        label: text("正式分析", "Formal analyses"),
        value: `${analysisJobs.length}`,
        detail: text("可继续沉淀成报告的正式任务", "Formal jobs available for reporting"),
        icon: <BrainCircuit className="h-5 w-5" />,
      },
      {
        label: text("报告产物", "Report artifacts"),
        value: `${reports.length}`,
        detail: text("适合交接与归档", "Ready for handoff and archive"),
        icon: <FileText className="h-5 w-5" />,
        tone: reports.length ? "success" : "info",
      },
    ],
    [analysisJobs.length, reports.length, sessions.length, sources.length, text],
  );

  const handoffHref = useMemo(() => {
    const fallbackPrompt =
      latestUserMessage?.content ||
      latestAssistantMessage?.intentAssessment?.suggestedTemplate ||
      text("请根据当前会话内容形成正式分析。", "Turn the current session into a formal analysis.");

    return `/reports${buildReportHandoffSearch({
      from: "assistant",
      sessionId: activeSessionId || undefined,
      providerId: providerId || undefined,
      promptPresetId: promptPresetId || undefined,
      sourceIds: selectedSourceIds,
      prompt: fallbackPrompt,
      persona,
      verbosity,
      title: activeSession?.title,
      summary: latestAssistantMessage?.content,
    })}`;
  }, [
    activeSession?.title,
    activeSessionId,
    latestAssistantMessage?.content,
    latestAssistantMessage?.intentAssessment?.suggestedTemplate,
    latestUserMessage?.content,
    persona,
    promptPresetId,
    providerId,
    selectedSourceIds,
    text,
    verbosity,
  ]);

  const applySessionProfile = useCallback(
    (session: ChatSession, presetList: PromptPreset[], sourceList: EnterpriseOverview["dataSources"]) => {
      setActiveSessionId(session.id);
      setPromptPresetId(session.promptPresetId || presetList[0]?.id || "");
      setSelectedSourceIds(
        session.sourceIds?.length
          ? session.sourceIds
          : sourceList.slice(0, 2).map((item) => item.id),
      );
      setPersona(session.persona || "operator");
    },
    [],
  );

  const loadMessages = useCallback(async (sessionId: string) => {
    setLoadingMessages(true);
    try {
      const data = await enterpriseGet<ChatMessage[]>(`/ai/chat/sessions/${sessionId}`);
      setMessages(data);
      setMessage("");
    } catch (error) {
      console.error(error);
      setMessage(
        enterpriseErrorMessage(
          error,
          text("会话消息暂时不可用。", "Conversation messages are temporarily unavailable."),
        ),
      );
    } finally {
      setLoadingMessages(false);
    }
  }, [text]);

  const createSession = useCallback(async (seedOverview?: EnterpriseOverview | null) => {
    const data = seedOverview ?? overview;
    const presets = data?.promptPresets ?? [];
    const dataSources = data?.dataSources ?? [];
    const nextPreset = presets[0];
    const created = await enterprisePost<ChatSession>("/ai/chat/sessions", {
      title: createSessionTitle(nextPreset, text),
      persona: "operator",
      locale,
      promptPresetId: nextPreset?.id || "quality-ops-briefing",
      sourceIds: dataSources.slice(0, 2).map((item) => item.id),
    });

    setSessions((current) => [created, ...current]);
    applySessionProfile(created, presets, dataSources);
    setMessages([]);
    setMessage(text("已创建新的分析会话。", "A new analysis session has been created."));
    return created;
  }, [applySessionProfile, locale, overview, text]);

  useEffect(() => {
    if (!ready) return;

    let active = true;

    const load = async () => {
      setLoading(true);

      try {
        const [overviewData, sessionData] = await Promise.all([
          enterpriseGet<EnterpriseOverview>("/enterprise/overview"),
          enterpriseGet<ChatSession[]>("/ai/chat/sessions"),
        ]);

        if (!active) return;

        setOverview(overviewData);
        setSessions(sessionData);
        setProviderId((current) => current || overviewData.providers[0]?.id || "");

        if (sessionData.length) {
          const preferredSession =
            sessionData.find((item) => item.id === activeSessionId) ?? sessionData[0];
          applySessionProfile(preferredSession, overviewData.promptPresets, overviewData.dataSources);
          await loadMessages(preferredSession.id);
        } else {
          const created = await createSession(overviewData);
          if (!active) return;
          await loadMessages(created.id);
        }
      } catch (error) {
        if (!active) return;
        console.error(error);
        setMessage(
          enterpriseErrorMessage(
            error,
            text("AI 工作台暂时不可用。", "AI workbench is temporarily unavailable."),
          ),
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load().catch(console.error);

    return () => {
      active = false;
    };
  }, [activeSessionId, applySessionProfile, createSession, loadMessages, ready, text]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingMessages, sending]);

  const handleOpenSession = useCallback(async (session: ChatSession) => {
    applySessionProfile(session, promptPresets, sources);
    await loadMessages(session.id);
  }, [applySessionProfile, loadMessages, promptPresets, sources]);

  const syncSessionProfile = useCallback(async () => {
    if (!activeSession) return activeSession;

    const currentSourceIds = activeSession.sourceIds ?? [];
    const sourceChanged =
      currentSourceIds.length !== selectedSourceIds.length ||
      currentSourceIds.some((item) => !selectedSourceIds.includes(item));
    const presetChanged = activeSession.promptPresetId !== promptPresetId;
    const personaChanged = (activeSession.persona || "operator") !== persona;
    const localeChanged = (activeSession.locale || locale) !== locale;

    if (!sourceChanged && !presetChanged && !personaChanged && !localeChanged) {
      return activeSession;
    }

    setSavingContext(true);
    try {
      const updated = await enterprisePost<ChatSession>(
        `/ai/chat/sessions/${activeSession.id}/profile`,
        {
          persona,
          locale,
          promptPresetId,
          sourceIds: selectedSourceIds,
        },
      );

      setSessions((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setMessage(text("会话上下文已更新。", "Session context has been updated."));
      return updated;
    } catch (error) {
      console.error(error);
      setMessage(
        enterpriseErrorMessage(
          error,
          text("更新会话上下文失败。", "Failed to update session context."),
        ),
      );
      throw error;
    } finally {
      setSavingContext(false);
    }
  }, [activeSession, locale, persona, promptPresetId, selectedSourceIds, text]);

  const sendMessage = useCallback(async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || sending) return;

    let sessionId = activeSessionId;
    try {
      setSending(true);
      setMessage("");

      if (!sessionId) {
        const created = await createSession();
        sessionId = created.id;
      }

      await syncSessionProfile();

      const data = await enterprisePost<ChatMessage[]>(
        `/ai/chat/sessions/${sessionId}/messages`,
        {
          content: trimmed,
          verbosity,
          providerId,
          promptPresetId,
          persona,
          locale,
        },
      );

      setMessages(data);
      setInputValue("");

      const lastAssistant = [...data].reverse().find((item) => item.role === "assistant");
      setSessions((current) =>
        current
          .map((item) =>
            item.id === sessionId
              ? {
                  ...item,
                  updatedAt: new Date().toISOString(),
                  lastMessagePreview: lastAssistant?.content || trimmed,
                }
              : item,
          )
          .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
      );
    } catch (error) {
      console.error(error);
      setMessage(
        enterpriseErrorMessage(
          error,
          text("发送消息失败。", "Failed to send the message."),
        ),
      );
    } finally {
      setSending(false);
    }
  }, [
    activeSessionId,
    createSession,
    locale,
    persona,
    promptPresetId,
    providerId,
    sending,
    syncSessionProfile,
    text,
    verbosity,
  ]);

  const handleAssistantAction = useCallback(async (action: ChatMessage["actions"][number], messageItem: ChatMessage) => {
    const route = action.target || action.payload.route || messageItem.responseProtocol?.route || "";
    const prompt =
      action.payload.prompt ||
      action.payload.query ||
      action.payload.message ||
      action.label;

    if (
      action.type.toLowerCase().includes("report") ||
      action.type.toLowerCase().includes("export") ||
      route === "/reports"
    ) {
      router.push(handoffHref);
      return;
    }

    if (route.startsWith("/")) {
      router.push(route);
      return;
    }

    if (action.type.toLowerCase().includes("link") && action.target.startsWith("/")) {
      router.push(action.target);
      return;
    }

    await sendMessage(prompt);
  }, [handoffHref, router, sendMessage]);

  const toggleSource = useCallback((sourceId: string) => {
    setSelectedSourceIds((current) =>
      current.includes(sourceId)
        ? current.filter((item) => item !== sourceId)
        : [...current, sourceId],
    );
  }, []);

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/workspace"
        title={text("AI 助手加载中", "Loading AI assistant")}
        description={text(
          "正在校验会话权限并准备真实 AI 工作台…",
          "Validating access and preparing the real AI workbench...",
        )}
      />
    );
  }

  if (loading) {
    return (
      <div className="relative mx-auto max-w-[1920px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
        <BackButton fallbackHref="/workspace" />
        <SectionSkeleton title="Loading AI workbench" blocks={4} />
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-[1920px] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary/10 blur-[110px]" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-accent/10 blur-[110px]" />
      </div>

      <BackButton fallbackHref="/workspace" />

      <WorkflowHero
        eyebrow={text("AI Control Desk", "AI Control Desk")}
        title={text(
          "把真实会话、上下文控制和报告交接放进一个 AI 工作台",
          "Bring real conversations, context controls, and report handoff into one AI workbench",
        )}
        description={text(
          "这一页现在不再是本地模拟聊天，而是直接连接后端真实会话、数据源和提示词预设。你可以在这里组织上下文、提问、复追原因，并把结果无缝交给报告中心继续沉淀。",
          "This page now connects to real backend conversations, data sources, and prompt presets. Use it to shape context, ask questions, drill into causes, and hand conclusions directly into Report Center.",
        )}
        badgeVariant="glow"
        stats={heroStats}
        actions={
          <>
            <Button
              onClick={() => {
                createSession().catch(console.error);
              }}
            >
              <Plus className="h-4 w-4" />
              {text("新建分析会话", "New Session")}
            </Button>
            <Button asChild variant="outline">
              <Link href={handoffHref}>
                <FileText className="h-4 w-4" />
                {text("交给报告中心", "Hand Off To Reports")}
              </Link>
            </Button>
          </>
        }
        aside={
          <Card variant="glass" className="h-full border-border/60">
            <div className="space-y-4">
              <Badge variant="secondary" className="w-fit">
                {text("当前交接姿态", "Current handoff posture")}
              </Badge>
              <div className="space-y-2">
                <h2 className="text-2xl font-black tracking-tight">
                  {activeSession?.title || text("等待会话", "Waiting for session")}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
                  {latestAssistantMessage
                    ? text(
                        "当前会话已经有 AI 结论，可以继续追问，也可以直接交给报告中心形成正式产物。",
                        "This session already has AI output, so you can keep drilling down or hand it to Report Center for formal output.",
                      )
                    : text(
                        "先组织上下文和来源数据，再发出第一条问题，让会话从一开始就有正确边界。",
                        "Set the context and sources first so the very first question starts with the right boundaries.",
                      )}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-border/60 bg-background/55 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    {text("当前视角", "Current lens")}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {PERSONA_OPTIONS.find((item) => item.id === persona)
                      ? text(
                          PERSONA_OPTIONS.find((item) => item.id === persona)!.detailZh,
                          PERSONA_OPTIONS.find((item) => item.id === persona)!.detailEn,
                        )
                      : text("为当前角色准备最合适的回答粒度。", "Match the answer depth to the current role.")}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/55 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    {text("上下文来源", "Context scope")}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {text(
                      `当前选中 ${selectedSourceIds.length} 个数据源，正式交接时会沿用这批来源。`,
                      `${selectedSourceIds.length} sources are selected and will carry into the formal handoff.`,
                    )}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        }
      />

      {message ? (
        <div className="mb-6 rounded-2xl border border-border/60 bg-background/40 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.9fr)]">
        <TaskSection
          title={text("真实会话", "Live conversation")}
          description={text(
            "每条提问都会走真实后端会话，而不是本地模拟。对话结果会保留提示词预设、来源引用和下一步动作，方便继续分析或交接。",
            "Every message goes through the real backend session instead of a local mock. Results retain presets, source references, and next actions for follow-up or handoff.",
          )}
          action={
            <Button
              variant="outline"
              onClick={() => {
                createSession().catch(console.error);
              }}
            >
              <Plus className="h-4 w-4" />
              {text("新会话", "New session")}
            </Button>
          }
        >
          <Card className="flex min-h-[860px] flex-col p-0" variant="glass">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <strong className="block">
                    {activeSession?.title || text("会话空间", "Conversation space")}
                  </strong>
                  <span className="text-xs text-muted-foreground">
                    {activeSession
                      ? text(
                          `上次更新 ${formatConversationTime(activeSession.updatedAt, locale)}`,
                          `Updated ${formatConversationTime(activeSession.updatedAt, locale)}`,
                        )
                      : text("正在准备会话", "Preparing session")}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedPromptPreset ? (
                  <Badge variant="info">{selectedPromptPreset.name}</Badge>
                ) : null}
                <Badge variant={sending || loadingMessages ? "warning" : "success"}>
                  {sending || loadingMessages ? text("处理中", "Processing") : text("可继续", "Ready")}
                </Badge>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
              {loadingMessages ? (
                <SectionSkeleton title="Loading messages" blocks={2} />
              ) : messages.length ? (
                messages.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex",
                      item.role === "user" ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[92%] rounded-3xl border px-4 py-4 shadow-card",
                        roleTone(item.role),
                      )}
                    >
                      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                        {item.role === "assistant" ? (
                          <>
                            <Bot className="h-3.5 w-3.5 text-primary" />
                            <span>{text("AI 助手", "AI assistant")}</span>
                          </>
                        ) : (
                          <>
                            <MessageSquare className="h-3.5 w-3.5 text-primary" />
                            <span>{text("你", "You")}</span>
                          </>
                        )}
                        <span>{formatConversationTime(item.createdAt, locale)}</span>
                      </div>
                      <div className="whitespace-pre-wrap text-sm leading-7 text-foreground">
                        {item.content}
                      </div>

                      {item.role === "assistant" ? (
                        <>
                          {item.actions.length ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {item.actions.map((action) => (
                                <Button
                                  key={`${item.id}-${action.id || action.label}`}
                                  variant={
                                    action.type.toLowerCase().includes("report") ||
                                    action.type.toLowerCase().includes("export")
                                      ? "outline"
                                      : "default"
                                  }
                                  size="sm"
                                  onClick={() => {
                                    handleAssistantAction(action, item).catch(console.error);
                                  }}
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          ) : null}

                          {(item.intentAssessment || item.sourceRefs.length || item.responseProtocol) ? (
                            <Accordion type="single" collapsible className="mt-4 rounded-2xl border border-border/60 bg-background/35 px-4">
                              <AccordionItem value={`details-${item.id}`} className="border-none">
                                <AccordionTrigger className="py-3 text-sm">
                                  {text("查看这条回复的上下文与建议动作", "Inspect context and suggested actions")}
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pb-4">
                                  {item.intentAssessment ? (
                                    <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
                                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                                        {text("意图判断", "Intent assessment")}
                                      </p>
                                      <p className="mt-2 text-sm text-muted-foreground">
                                        {item.intentAssessment.reason}
                                      </p>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        <Badge variant="outline">{item.intentAssessment.intent}</Badge>
                                        {item.intentAssessment.suggestedTemplate ? (
                                          <Badge variant="secondary">{item.intentAssessment.suggestedTemplate}</Badge>
                                        ) : null}
                                      </div>
                                    </div>
                                  ) : null}

                                  {item.sourceRefs.length ? (
                                    <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
                                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                                        {text("引用来源", "Referenced sources")}
                                      </p>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        {item.sourceRefs.map((ref) => (
                                          <Badge key={ref} variant="outline">
                                            {ref}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  ) : null}

                                  {item.responseProtocol ? (
                                    <div className="rounded-2xl border border-border/60 bg-background/60 p-3">
                                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                                        {text("系统级建议动作", "System routing suggestion")}
                                      </p>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                        <Badge variant="secondary">{item.responseProtocol.intentCategory}</Badge>
                                        <Badge variant="outline">{item.responseProtocol.responseKind}</Badge>
                                        {item.responseProtocol.route && item.responseProtocol.route !== "NONE" ? (
                                          <Badge variant="info">{item.responseProtocol.route}</Badge>
                                        ) : null}
                                      </div>
                                      {item.responseProtocol.options.length ? (
                                        <div className="mt-3 grid gap-2">
                                          {item.responseProtocol.options.map((option) => (
                                            <button
                                              key={option.id}
                                              type="button"
                                              className="rounded-2xl border border-border/60 bg-background/55 px-3 py-3 text-left transition hover:border-primary/35 hover:bg-card"
                                              onClick={() => {
                                                sendMessage(option.label).catch(console.error);
                                              }}
                                            >
                                              <div className="font-semibold">{option.label}</div>
                                              <p className="mt-1 text-sm text-muted-foreground">{option.description}</p>
                                            </button>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </AccordionContent>
                              </AccordionItem>
                            </Accordion>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyStateCard
                  icon={<Sparkles className="h-6 w-6" />}
                  title={text("从一个真实问题开始", "Start from a real question")}
                  description={text(
                    "先在右侧设定本次会话的角色、提示词预设和数据源，再发出第一条问题。这样后续所有追问和交接都会更稳定。",
                    "Set the role, prompt preset, and data sources first, then send the first question so every follow-up and handoff stays grounded.",
                  )}
                />
              )}

              {sending ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                  <div className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:120ms]" />
                  <div className="h-2 w-2 animate-pulse rounded-full bg-primary [animation-delay:240ms]" />
                  <span>{text("真实 AI 正在生成回复", "The real AI service is generating a reply")}</span>
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-border/70 px-5 py-5">
              <div className="rounded-3xl border border-border/70 bg-background/70 p-2">
                <div className="flex items-end gap-3">
                  <Textarea
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage(inputValue).catch(console.error);
                      }
                    }}
                    className="min-h-[96px] border-none bg-transparent shadow-none focus-visible:ring-0"
                    placeholder={text(
                      "输入你要分析的问题，例如：今天哪些异常最值得先处理，并且应该交给谁？",
                      "Ask the question you want analyzed, for example: which anomalies matter most today and who should own them?",
                    )}
                    disabled={sending}
                  />
                  <Button
                    className="rounded-2xl"
                    disabled={!inputValue.trim() || sending}
                    onClick={() => {
                      sendMessage(inputValue).catch(console.error);
                    }}
                  >
                    {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {text("发送", "Send")}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </TaskSection>

        <div className="space-y-6">
          <TaskSection
            title={text("上下文控制", "Context controls")}
            description={text(
              "先定好提示词、角色和来源，再发问。这样 AI 输出才更适合真实协作，不会越问越散。",
              "Set the preset, role, and sources before asking. That keeps AI output aligned with real collaboration instead of drifting over time.",
            )}
            action={
              <Button
                variant="outline"
                disabled={!activeSession || savingContext}
                onClick={() => {
                  syncSessionProfile().catch(console.error);
                }}
              >
                {savingContext ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Settings2 className="h-4 w-4" />}
                {text("保存上下文", "Save Context")}
              </Button>
            }
          >
            <Card variant="glass" className="border-border/60">
              <div className="grid gap-4">
                <label className="space-y-2">
                  <span className="text-sm font-medium">{text("模型服务", "Provider")}</span>
                  <Select value={providerId} onValueChange={setProviderId}>
                    <SelectTrigger>
                      <SelectValue placeholder={text("选择模型服务", "Select a provider")} />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((provider: AiProviderProfile) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name} / {provider.chatModel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">{text("提示词预设", "Prompt preset")}</span>
                  <Select value={promptPresetId} onValueChange={setPromptPresetId}>
                    <SelectTrigger>
                      <SelectValue placeholder={text("选择预设", "Select a preset")} />
                    </SelectTrigger>
                    <SelectContent>
                      {promptPresets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium">{text("回答深度", "Verbosity")}</span>
                  <Select value={verbosity} onValueChange={setVerbosity}>
                    <SelectTrigger>
                      <SelectValue placeholder={text("选择深度", "Select depth")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="brief">{text("简要", "Brief")}</SelectItem>
                      <SelectItem value="standard">{text("标准", "Standard")}</SelectItem>
                      <SelectItem value="deep">{text("深度", "Deep")}</SelectItem>
                    </SelectContent>
                  </Select>
                </label>

                <div className="space-y-2">
                  <span className="text-sm font-medium">{text("回答视角", "Answering lens")}</span>
                  <div className="grid gap-3">
                    {PERSONA_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setPersona(option.id)}
                        className={cn(
                          "rounded-2xl border p-4 text-left transition",
                          persona === option.id
                            ? "border-primary/40 bg-primary/10"
                            : "border-border/60 bg-background/40 hover:border-primary/30",
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-bold">{text(option.labelZh, option.labelEn)}</div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {text(option.detailZh, option.detailEn)}
                            </p>
                          </div>
                          <Badge variant={persona === option.id ? "glow" : "outline"}>
                            {persona === option.id ? text("已选中", "Active") : text("可切换", "Available")}
                          </Badge>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">
                    {text("来源数据", "Source scope")} · {selectedSourceIds.length}
                  </span>
                  <div className="grid gap-3">
                    {sources.slice(0, 8).map((source) => {
                      const active = selectedSourceIds.includes(source.id);
                      return (
                        <label
                          key={source.id}
                          className={cn(
                            "flex items-start gap-3 rounded-2xl border p-3 transition",
                            active
                              ? "border-primary/40 bg-primary/10"
                              : "border-border/60 bg-background/40",
                          )}
                        >
                          <Checkbox
                            checked={active}
                            onCheckedChange={() => toggleSource(source.id)}
                            className="mt-1"
                          />
                          <div>
                            <div className="font-semibold">{source.name}</div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              {source.type.toUpperCase()} / {text("质量", "Quality")} {source.qualityScore}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {selectedPromptPreset ? (
                  <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      {text("预设目标", "Preset objective")}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {selectedPromptPreset.objective}
                    </p>
                  </div>
                ) : null}
              </div>
            </Card>
          </TaskSection>

          <TaskSection
            title={text("高频问题", "High-value prompts")}
            description={text(
              "这些提问是为真实班次交接、异常排查和正式报告准备的，不是演示话术。",
              "These prompts are tuned for real shift handoff, anomaly triage, and formal reporting rather than demo conversation.",
            )}
          >
            <div className="grid gap-3">
              {QUICK_PROMPTS.map((item) => (
                <Card
                  key={item.labelZh}
                  variant="glass"
                  className="cursor-pointer border-border/60"
                  onClick={() => {
                    sendMessage(text(item.promptZh, item.promptEn)).catch(console.error);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong>{text(item.labelZh, item.labelEn)}</strong>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        {text(item.promptZh, item.promptEn)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        item.tone === "warning"
                          ? "warning"
                          : item.tone === "success"
                            ? "success"
                            : item.tone === "info"
                              ? "info"
                              : "outline"
                      }
                    >
                      {item.tone === "warning"
                        ? text("优先", "Priority")
                        : item.tone === "success"
                          ? text("交付", "Delivery")
                          : text("判断", "Insight")}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          </TaskSection>

          <TaskSection
            title={text("会话队列", "Session queue")}
            description={text(
              "不同问题应该分到不同会话里，而不是把所有追问都塞进一条长对话。",
              "Different problems should live in separate sessions instead of collapsing into one endlessly long conversation.",
            )}
          >
            <Card variant="glass" className="border-border/60">
              <div className="space-y-3">
                {sessions.length ? (
                  sessions.slice(0, 6).map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      className={cn(
                        "w-full rounded-2xl border px-4 py-3 text-left transition",
                        session.id === activeSessionId
                          ? "border-primary/40 bg-primary/10"
                          : "border-border/60 bg-background/50 hover:border-primary/30",
                      )}
                      onClick={() => {
                        handleOpenSession(session).catch(console.error);
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{session.title}</div>
                          <p className="mt-1 truncate text-sm text-muted-foreground">
                            {session.lastMessagePreview}
                          </p>
                        </div>
                        <Badge variant={session.id === activeSessionId ? "glow" : "outline"}>
                          {session.id === activeSessionId ? text("当前", "Active") : text("切换", "Open")}
                        </Badge>
                      </div>
                    </button>
                  ))
                ) : (
                  <EmptyStateCard
                    icon={<Workflow className="h-6 w-6" />}
                    title={text("还没有会话队列", "No sessions yet")}
                    description={text(
                      "创建第一个真实分析会话后，后续问题就能按主题分开追踪。",
                      "Create the first real analysis session to keep future questions separated by topic.",
                    )}
                    action={
                      <Button
                        onClick={() => {
                          createSession().catch(console.error);
                        }}
                      >
                        {text("创建会话", "Create session")}
                      </Button>
                    }
                  />
                )}
              </div>
            </Card>
          </TaskSection>

          <TaskSection
            title={text("正式交接", "Formal handoff")}
            description={text(
              "当当前会话已经形成结论时，不要继续靠聊天传达，把它交给报告中心沉淀成正式产物。",
              "Once the session has a conclusion, stop relying on chat alone and hand it to Report Center for formal output.",
            )}
          >
            <Card variant="gradient" className="border-border/60">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold">{text("交接包", "Handoff packet")}</h3>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/55 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                    {text("将会带过去的内容", "What will be carried forward")}
                  </p>
                  <div className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                    <p>{text("1. 当前会话的提示词预设、数据源和回答视角。", "1. The current session's preset, source scope, and answer lens.")}</p>
                    <p>{text("2. 最近一次用户问题，作为正式分析的起点。", "2. The latest user question as the starting point for formal analysis.")}</p>
                    <p>{text("3. 最近一次 AI 结论摘要，方便报告页直接承接。", "3. The latest AI conclusion summary so Report Center can pick up immediately.")}</p>
                  </div>
                </div>

                {latestAssistantMessage ? (
                  <div className="rounded-2xl border border-border/60 bg-background/55 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      {text("最近结论摘要", "Latest conclusion preview")}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {latestAssistantMessage.content}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-border/60 bg-background/55 p-4 text-sm leading-6 text-muted-foreground">
                    {text(
                      "当前还没有 AI 结论。先发出一条真实问题，等结论出来后再交给报告中心。",
                      "There is no AI conclusion yet. Ask a real question first, then hand it off once the conclusion is ready.",
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button asChild disabled={!latestAssistantMessage}>
                    <Link href={handoffHref}>{text("继续到报告中心", "Continue in Report Center")}</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/workspace">{text("回到工作台总览", "Back to Workspace")}</Link>
                  </Button>
                </div>
              </div>
            </Card>
          </TaskSection>
        </div>
      </div>
    </div>
  );
}
