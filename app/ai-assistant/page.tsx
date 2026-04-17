"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import WorkflowSteps, {
  type WorkflowStep,
} from "../components/Layout/WorkflowSteps";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
import { readStoredAuthSession } from "@/lib/auth-session";
import {
  enterpriseErrorMessage,
  enterpriseGet,
  enterprisePost,
} from "@/lib/enterprise-client";
import { localizePromptPreset } from "@/lib/enterprise-localization";
import { readRuntimeEndpointConfig } from "@/lib/runtime-endpoint-config";
import type {
  AiProviderProfile,
  AnalysisJob,
  AssistantAction,
  ChatMessage,
  ChatSession,
  DataSourceProfile,
  IntentAssessment,
  PromptPreset,
} from "@/types/enterprise";

type AppLocale = "zh-CN" | "en-US";
type BusyState =
  | "idle"
  | "loading"
  | "creating-provider"
  | "testing-provider"
  | "saving-profile"
  | "sending"
  | "analyzing";

type TranslateFn = (
  key: string,
  values?: Record<string, string | number>,
  fallback?: string,
) => string;

function buildProviderForm(t: TranslateFn) {
  const runtimeConfig = readRuntimeEndpointConfig();
  return {
    name: t(
      "pages.ai_assistant.form.defaultProviderName",
      undefined,
      "OpenAI-Compatible Provider",
    ),
    baseUrl: runtimeConfig.aiProviderBaseUrl,
    apiKey: "",
    chatModel: runtimeConfig.chatModel,
    embeddingModel: runtimeConfig.embeddingModel,
    defaultStrategy: "strict-real-routing",
    systemPrompt: t(
      "pages.ai_assistant.form.defaultSystemPrompt",
      undefined,
      "You are an industrial quality analysis assistant. Ground every conclusion in the selected evidence, describe risk and impact, recommend next steps, and never fabricate data.",
    ),
  };
}

function buildProviderFormFromProfile(provider: AiProviderProfile, t: TranslateFn) {
  const defaults = buildProviderForm(t);
  return {
    name: provider.name || defaults.name,
    baseUrl: provider.baseUrl || defaults.baseUrl,
    apiKey: "",
    chatModel: provider.chatModel || defaults.chatModel,
    embeddingModel: provider.embeddingModel || defaults.embeddingModel,
    defaultStrategy: provider.defaultStrategy || defaults.defaultStrategy,
    systemPrompt: provider.systemPrompt || defaults.systemPrompt,
  };
}

function defaultPrompt(t: TranslateFn) {
  return t(
    "pages.ai_assistant.form.defaultPrompt",
    undefined,
    "Review the selected sources and explain the most important quality risk, who is affected, and what the frontline team should do first.",
  );
}

function buildTemplateOptions(t: TranslateFn) {
  return [
    { value: "quality-variance", label: t("pages.ai_assistant.copy001") },
    { value: "defect-trend", label: t("pages.ai_assistant.copy002") },
    { value: "shift-efficiency", label: t("pages.ai_assistant.copy003") },
    {
      value: "equipment-troubleshooting",
      label: t("pages.ai_assistant.copy004"),
    },
  ];
}

function buildPersonaOptions(t: TranslateFn) {
  return [
    { value: "operator", label: t("pages.ai_assistant.copy005") },
    { value: "engineer", label: t("pages.ai_assistant.copy006") },
    { value: "manager", label: t("pages.ai_assistant.copy007") },
  ];
}

function buildVerbosityOptions(t: TranslateFn) {
  return [
    { value: "brief", label: t("pages.ai_assistant.copy008") },
    { value: "standard", label: t("pages.ai_assistant.copy009") },
    { value: "deep", label: t("pages.ai_assistant.copy010") },
  ];
}

function splitMetaList(value?: string) {
  return (
    value
      ?.split("||")
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}

function safeArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

function formatDateTime(
  value: string | undefined,
  locale: AppLocale,
  t: TranslateFn,
) {
  if (!value) return t("common.justNow", undefined, "Just now");

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

function getRiskTone(level: string | undefined) {
  if (level === "high") return "warning";
  if (level === "medium") return "accent";
  return "neutral";
}

function localizeTemplateId(templateId: string, t: TranslateFn): string {
  const templateMap: Record<string, string> = {
    "quality-variance": t(
      "pages.ai_assistant.template.qualityVariance",
      undefined,
      "Quality Variance Diagnosis",
    ),
    "defect-trend": t(
      "pages.ai_assistant.template.defectTrend",
      undefined,
      "Defect Trend Review",
    ),
    "shift-efficiency": t(
      "pages.ai_assistant.template.shiftEfficiency",
      undefined,
      "Shift Efficiency Analysis",
    ),
    "equipment-troubleshooting": t(
      "pages.ai_assistant.template.equipmentTroubleshooting",
      undefined,
      "Equipment Troubleshooting",
    ),
  };
  return templateMap[templateId] ?? templateId;
}

function localizeStatus(status: string | undefined, t: TranslateFn): string {
  if (!status) return t("common.unknown", undefined, "Unknown");
  const statusMap: Record<string, string> = {
    low: t("pages.ai_assistant.status.low", undefined, "Low Risk"),
    medium: t("pages.ai_assistant.status.medium", undefined, "Medium Risk"),
    high: t("pages.ai_assistant.status.high", undefined, "High Risk"),
    pending: t("pages.ai_assistant.status.pending", undefined, "Pending"),
    running: t("pages.ai_assistant.status.running", undefined, "Running"),
    completed: t("pages.ai_assistant.status.completed", undefined, "Completed"),
    failed: t("pages.ai_assistant.status.failed", undefined, "Failed"),
    standard: t(
      "pages.ai_assistant.status.standard",
      undefined,
      "Standard Mode",
    ),
    brief: t("pages.ai_assistant.status.brief", undefined, "Brief Mode"),
    deep: t("pages.ai_assistant.status.deep", undefined, "Deep Mode"),
  };
  return statusMap[status.toLowerCase()] ?? status;
}

function renderIntent(intent: IntentAssessment | null | undefined, t: TranslateFn) {
  if (!intent) {
    return {
      title: t(
        "pages.ai_assistant.intent.waitingTitle",
        undefined,
        "Waiting for backend intent routing",
      ),
      detail: t(
        "pages.ai_assistant.intent.waitingDetail",
        undefined,
        "Send a real chat request or create a formal analysis to receive the backend intent classification, recommended template, and next actions.",
      ),
    };
  }

  const localizedIntent = localizeTemplateId(intent.intent, t);
  const localizedTemplate = localizeTemplateId(intent.suggestedTemplate, t);

  return {
    title: localizedIntent,
    detail: t(
      "pages.ai_assistant.intent.reasonWithTemplate",
      { reason: intent.reason, template: localizedTemplate },
      `${intent.reason} Suggested template: ${localizedTemplate}.`,
    ),
  };
}
function SectionHeader({
  kicker,
  title,
  caption,
  aside,
}: {
  kicker: string;
  title: string;
  caption?: string;
  aside?: React.ReactNode;
}) {
  return (
    <div className="panel-heading ai-assistant-panel-heading">
      <div>
        <span className="panel-kicker">{kicker}</span>
        <h2>{title}</h2>
        {caption ? <p className="ai-assistant-panel-copy">{caption}</p> : null}
      </div>
      {aside}
    </div>
  );
}

function MetricTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="ai-assistant-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <em>{detail}</em>
    </div>
  );
}

function getPageCount(length: number, pageSize: number) {
  return Math.max(1, Math.ceil(length / pageSize));
}

function getPagedItems<T>(items: T[], page: number, pageSize: number) {
  const pageCount = getPageCount(items.length, pageSize);
  const safePage = Math.min(page, pageCount - 1);
  const start = safePage * pageSize;
  return {
    pageCount,
    safePage,
    items: items.slice(start, start + pageSize),
  };
}

function shouldCollapseMessage(item: ChatMessage) {
  const lineCount = item.content.split(/\r?\n/).length;
  return (
    item.role === "assistant" &&
    (item.content.length > 220 ||
      lineCount > 4 ||
      safeArray(item.actions).length > 0)
  );
}

function buildMessagePreview(content: string, maxLength = 220) {
  const normalized = content.trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function PaginatedBlockControls({
  count,
  page,
  pageCount,
  expanded,
  onPrev,
  onNext,
  onToggle,
  t,
}: {
  count: number;
  page: number;
  pageCount: number;
  expanded: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggle: () => void;
  t: (
    key: string,
    values?: Record<string, string | number>,
    fallback?: string,
  ) => string;
}) {
  return (
    <div className="ai-assistant-block-toolbar">
      <span className="ai-assistant-block-count">
        {t("pages.ai_assistant.copy011")} {count}{" "}
        {t("pages.ai_assistant.copy012")}
      </span>
      <div className="ai-assistant-block-actions">
        <button
          type="button"
          className="enterprise-secondary-button ai-assistant-mini-button"
          onClick={onToggle}
        >
          {expanded
            ? t("pages.ai_assistant.copy013")
            : t("pages.ai_assistant.copy014")}
        </button>
        <button
          type="button"
          className="enterprise-secondary-button ai-assistant-mini-button"
          disabled={page <= 0}
          onClick={onPrev}
        >
          {t("pages.ai_assistant.copy015")}
        </button>
        <span className="ai-assistant-page-indicator">
          {page + 1} / {pageCount}
        </span>
        <button
          type="button"
          className="enterprise-secondary-button ai-assistant-mini-button"
          disabled={page >= pageCount - 1}
          onClick={onNext}
        >
          {t("pages.ai_assistant.copy016")}
        </button>
      </div>
    </div>
  );
}

export default function AiAssistantPage() {
  return <AiAssistantContent />;
}

function AiAssistantContent() {
  const ready = useSessionGuard(["admin", "engineer", "operator", "viewer"]);
  const router = useRouter();
  const { locale, text, t } = useLocale();
  const [canManageProviders, setCanManageProviders] = useState(false);

  const [providers, setProviders] = useState<AiProviderProfile[]>([]);
  const [promptPresets, setPromptPresets] = useState<PromptPreset[]>([]);
  const [sources, setSources] = useState<DataSourceProfile[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [analysisJobs, setAnalysisJobs] = useState<AnalysisJob[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [providerId, setProviderId] = useState("");
  const [promptPresetId, setPromptPresetId] = useState("");
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [persona, setPersona] = useState("operator");
  const [verbosity, setVerbosity] = useState("standard");
  const [template, setTemplate] = useState("quality-variance");
  const [prompt, setPrompt] = useState(defaultPrompt(t));
  const [providerForm, setProviderForm] = useState(() =>
    buildProviderForm(t),
  );
  const [notice, setNotice] = useState("");
  const [pageError, setPageError] = useState("");
  const [loadingState, setLoadingState] = useState(
    t("pages.ai_assistant.copy017"),
  );
  const [busy, setBusy] = useState<BusyState>("idle");
  const [sessionPage, setSessionPage] = useState(0);
  const [presetPage, setPresetPage] = useState(0);
  const [sourcePage, setSourcePage] = useState(0);
  const [messagePage, setMessagePage] = useState(0);
  const [actionPage, setActionPage] = useState(0);
  const [analysisPage, setAnalysisPage] = useState(0);
  const [providerPage, setProviderPage] = useState(0);
  const [sessionsExpanded, setSessionsExpanded] = useState(false);
  const [presetsExpanded, setPresetsExpanded] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);
  const [messagesExpanded, setMessagesExpanded] = useState(true);
  const [actionsExpanded, setActionsExpanded] = useState(false);
  const [analysisExpanded, setAnalysisExpanded] = useState(false);
  const [providersExpanded, setProvidersExpanded] = useState(false);
  const [expandedMessages, setExpandedMessages] = useState<
    Record<string, boolean>
  >({});

  const analysisTemplates = useMemo(() => buildTemplateOptions(t), [t]);
  const personaOptions = useMemo(() => buildPersonaOptions(t), [t]);
  const verbosityOptions = useMemo(() => buildVerbosityOptions(t), [t]);
  const localizedPromptPresets = useMemo(
    () => promptPresets.map((item) => localizePromptPreset(item, locale)),
    [promptPresets, locale],
  );
  const activeSession = useMemo(
    () => sessions.find((item) => item.id === activeSessionId) ?? null,
    [sessions, activeSessionId],
  );
  const selectedPreset = useMemo(
    () =>
      localizedPromptPresets.find((item) => item.id === promptPresetId) ??
      localizedPromptPresets[0] ??
      null,
    [localizedPromptPresets, promptPresetId],
  );
  const selectedProvider = useMemo(
    () => providers.find((item) => item.id === providerId) ?? null,
    [providers, providerId],
  );
  const providerHasCredential = Boolean(
    selectedProvider?.apiKeyMasked?.trim() || providerForm.apiKey.trim(),
  );
  const selectedSources = useMemo(
    () => sources.filter((source) => selectedSourceIds.includes(source.id)),
    [sources, selectedSourceIds],
  );
  const latestAnalysis = analysisJobs[0] ?? null;
  const latestAnalysisResult = latestAnalysis?.result ?? null;
  const lastAssistantMessage = useMemo(
    () =>
      [...messages].reverse().find((item) => item.role === "assistant") ?? null,
    [messages],
  );
  const intentCard = renderIntent(
    lastAssistantMessage?.intentAssessment ??
      latestAnalysisResult?.intentAssessment,
    t,
  );
  const suggestedActions = safeArray(
    safeArray(lastAssistantMessage?.actions).length
      ? lastAssistantMessage?.actions
      : latestAnalysisResult?.actions,
  );
  const pagedSessions = useMemo(
    () => getPagedItems(sessions, sessionPage, 4),
    [sessions, sessionPage],
  );
  const pagedPresets = useMemo(
    () => getPagedItems(localizedPromptPresets, presetPage, 4),
    [localizedPromptPresets, presetPage],
  );
  const pagedSources = useMemo(
    () => getPagedItems(sources, sourcePage, 4),
    [sources, sourcePage],
  );
  const pagedMessages = useMemo(
    () => getPagedItems(messages, messagePage, 8),
    [messages, messagePage],
  );
  const pagedActions = useMemo(
    () => getPagedItems(suggestedActions, actionPage, 4),
    [suggestedActions, actionPage],
  );
  const pagedAnalysis = useMemo(
    () => getPagedItems(analysisJobs, analysisPage, 4),
    [analysisJobs, analysisPage],
  );
  const pagedProviders = useMemo(
    () => getPagedItems(providers, providerPage, 4),
    [providers, providerPage],
  );
  const canCreateSession = Boolean(promptPresetId && selectedSourceIds.length);
  const canSend = Boolean(
    providerId &&
      providerHasCredential &&
      promptPresetId &&
      selectedSourceIds.length &&
      prompt.trim(),
  );

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages((current) => ({
      ...current,
      [messageId]: !current[messageId],
    }));
  };

  const actionHint = useMemo(() => {
    if (!providers.length) {
      return t("pages.ai_assistant.copy018");
    }
    if (!providerId) {
      return t("pages.ai_assistant.copy019");
    }
    if (!providerHasCredential) {
      return t("pages.ai_assistant.copy020");
    }
    if (!promptPresetId) {
      return t("pages.ai_assistant.copy021");
    }
    if (!selectedSourceIds.length) {
      return t("pages.ai_assistant.copy022");
    }
    if (!prompt.trim()) {
      return t("pages.ai_assistant.copy023");
    }
    return "";
  }, [
    prompt,
    promptPresetId,
    providerHasCredential,
    providerId,
    providers.length,
    selectedSourceIds.length,
    t,
  ]);

  const scrollToId = (id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const workflowSteps = useMemo<WorkflowStep[]>(
    () => [
      {
        id: "ai-context",
        title: t("pages.ai_assistant.copy024"),
        detail: selectedSourceIds.length
          ? t("pages.ai_assistant.copy025", { p1: selectedSourceIds.length })
          : t("pages.ai_assistant.copy026"),
        state: selectedSourceIds.length && promptPresetId ? "done" : "active",
        onClick: () => scrollToId("ai-flow-session"),
      },
      {
        id: "ai-profile",
        title: t("pages.ai_assistant.copy027"),
        detail: activeSessionId
          ? t("pages.ai_assistant.copy028")
          : t("pages.ai_assistant.copy029"),
        state: activeSessionId ? "done" : "active",
        onClick: () => scrollToId("ai-flow-workspace"),
      },
      {
        id: "ai-chat",
        title: t("pages.ai_assistant.copy030"),
        detail: messages.length
          ? t("pages.ai_assistant.copy031", { p1: messages.length })
          : t("pages.ai_assistant.copy032"),
        state: messages.length ? "done" : canSend ? "active" : "upcoming",
        onClick: () => scrollToId("ai-flow-chat"),
      },
      {
        id: "ai-analysis",
        title: t("pages.ai_assistant.copy033"),
        detail: analysisJobs.length
          ? t("pages.ai_assistant.copy034", { p1: analysisJobs.length })
          : t("pages.ai_assistant.copy035"),
        state: analysisJobs.length ? "done" : canSend ? "active" : "upcoming",
        onClick: () => scrollToId("ai-flow-advanced"),
      },
    ],
    [
      activeSessionId,
      analysisJobs.length,
      canSend,
      messages.length,
      promptPresetId,
      selectedSourceIds.length,
    ],
  );

  useEffect(() => {
    const authSession = readStoredAuthSession();
    setCanManageProviders(
      authSession?.role === "admin" || authSession?.role === "engineer",
    );
  }, []);

  useEffect(() => {
    if (!providerId) {
      setProviderForm(buildProviderForm(t));
      return;
    }

    const provider = providers.find((item) => item.id === providerId);
    if (provider) {
      setProviderForm(buildProviderFormFromProfile(provider, t));
    }
  }, [locale, providerId, providers, t]);

  const selectProviderForEditing = (nextProviderId: string) => {
    setProviderId(nextProviderId);
    const nextProvider = providers.find((item) => item.id === nextProviderId);
    setProviderForm(
      nextProvider
        ? buildProviderFormFromProfile(nextProvider, t)
        : buildProviderForm(t),
    );
  };

  const startNewProviderDraft = () => {
    setProviderId("");
    setProviderForm(buildProviderForm(t));
    setNotice("");
  };

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const sourceId = params.get("sourceId");
    const presetId = params.get("preset");
    const nextTemplate = params.get("template");
    const nextPrompt = params.get("prompt");

    if (sourceId) setSelectedSourceIds([sourceId]);
    if (presetId) setPromptPresetId(presetId);
    if (nextTemplate) setTemplate(nextTemplate);
    if (nextPrompt) setPrompt(nextPrompt);
  }, []);

  const loadMessages = async (sessionId: string) => {
    const sessionMessages = await enterpriseGet<ChatMessage[]>(
      `/ai/chat/sessions/${sessionId}`,
    );
    setMessages(sessionMessages);
  };

  const loadAssistantData = async (attempt = 1) => {
    setBusy("loading");
    setPageError("");
    setNotice("");
    setLoadingState(
      attempt > 1
        ? t("pages.ai_assistant.copy036", { p1: attempt })
        : t("pages.ai_assistant.copy017"),
    );

    try {
      const [
        providerResult,
        presetResult,
        sourceResult,
        sessionResult,
        analysisResult,
      ] = await Promise.allSettled([
        enterpriseGet<AiProviderProfile[]>("/ai/providers"),
        enterpriseGet<PromptPreset[]>("/ai/prompt-presets"),
        enterpriseGet<DataSourceProfile[]>("/data-sources"),
        enterpriseGet<ChatSession[]>("/ai/chat/sessions"),
        enterpriseGet<AnalysisJob[]>("/analysis/jobs"),
      ]);

      const errors = [
        providerResult,
        presetResult,
        sourceResult,
        sessionResult,
        analysisResult,
      ]
        .filter(
          (item): item is PromiseRejectedResult => item.status === "rejected",
        )
        .map((item) => item.reason);

      if (errors.length && attempt < 5) {
        throw errors[0];
      }

      const providerData =
        providerResult.status === "fulfilled" ? providerResult.value : [];
      const presetData =
        presetResult.status === "fulfilled" ? presetResult.value : [];
      const sourceData =
        sourceResult.status === "fulfilled" ? sourceResult.value : [];
      const sessionData =
        sessionResult.status === "fulfilled" ? sessionResult.value : [];
      const jobData =
        analysisResult.status === "fulfilled" ? analysisResult.value : [];

      setProviders(providerData);
      setPromptPresets(presetData);
      setSources(sourceData);
      setSessions(sessionData);
      setAnalysisJobs(jobData);

      setProviderId((current) => current || providerData[0]?.id || "");
      setPromptPresetId(
        (current) =>
          current || sessionData[0]?.promptPresetId || presetData[0]?.id || "",
      );
      setSelectedSourceIds((current) =>
        current.length
          ? current
          : sourceData.slice(0, 3).map((item) => item.id),
      );

      const nextSessionId = activeSessionId || sessionData[0]?.id || "";
      if (nextSessionId && nextSessionId !== activeSessionId) {
        setActiveSessionId(nextSessionId);
      }

      setLoadingState("");
      setBusy("idle");
    } catch (error) {
      if (attempt < 6) {
        window.setTimeout(
          () => {
            loadAssistantData(attempt + 1).catch(console.error);
          },
          Math.min(1800, 450 + attempt * 220),
        );
        return;
      }

      setBusy("idle");
      setLoadingState("");
      setPageError(
        enterpriseErrorMessage(error, t("pages.ai_assistant.copy037")),
      );
    }
  };

  useEffect(() => {
    if (!ready) return;
    loadAssistantData().catch(console.error);
  }, [ready]);

  useEffect(() => {
    if (!activeSessionId) {
      setMessages([]);
      return;
    }

    loadMessages(activeSessionId).catch((error) => {
      setNotice(enterpriseErrorMessage(error, t("pages.ai_assistant.copy038")));
    });
  }, [activeSessionId, t]);

  useEffect(() => {
    if (!activeSession) return;
    if (activeSession.promptPresetId)
      setPromptPresetId(activeSession.promptPresetId);
    if (activeSession.persona) setPersona(activeSession.persona);
    if (activeSession.sourceIds?.length)
      setSelectedSourceIds(activeSession.sourceIds);
  }, [activeSession]);

  useEffect(() => {
    if (selectedPreset?.recommendedTemplate) {
      setTemplate(selectedPreset.recommendedTemplate);
    }
  }, [selectedPreset]);

  const createSession = async () => {
    const session = await enterprisePost<ChatSession>("/ai/chat/sessions", {
      title: `${selectedPreset?.name ?? t("pages.ai_assistant.copy039")} ${sessions.length + 1}`,
      persona,
      locale,
      promptPresetId,
      sourceIds: selectedSourceIds,
    });
    setSessions((current) => [session, ...current]);
    setActiveSessionId(session.id);
    setMessages([]);
    return session;
  };

  const ensureSession = async () => {
    if (activeSessionId) return activeSessionId;
    const created = await createSession();
    return created.id;
  };

  const handleCreateProvider = async () => {
    if (!canManageProviders) {
      setNotice(t("pages.ai_assistant.copy040"));
      return;
    }

    setBusy("creating-provider");
    setNotice("");
    try {
      const saved = await enterprisePost<AiProviderProfile>("/ai/providers", {
        id: providerId || undefined,
        ...providerForm,
        enabled: true,
      });
      setProviders((current) => [
        saved,
        ...current.filter((item) => item.id !== saved.id),
      ]);
      selectProviderForEditing(saved.id);
      setNotice(t("pages.ai_assistant.copy041"));
    } catch (error) {
      setNotice(enterpriseErrorMessage(error, t("pages.ai_assistant.copy042")));
    } finally {
      setBusy("idle");
    }
  };

  const handleTestProvider = async () => {
    if (!providerId) return;

    setBusy("testing-provider");
    setNotice("");
    try {
      const result = await enterprisePost<{
        provider: AiProviderProfile;
        sampleReply: string;
      }>("/ai/providers/test", {
        providerId,
        prompt: t("pages.ai_assistant.copy043"),
      });
      setNotice(t("pages.ai_assistant.copy044", { p1: result.sampleReply }));
    } catch (error) {
      setNotice(enterpriseErrorMessage(error, t("pages.ai_assistant.copy045")));
    } finally {
      setBusy("idle");
    }
  };

  const handleSaveProfile = async () => {
    setBusy("saving-profile");
    setNotice("");
    try {
      const sessionId = await ensureSession();
      const updated = await enterprisePost<ChatSession>(
        `/ai/chat/sessions/${sessionId}/profile`,
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
      setActiveSessionId(updated.id);
      setNotice(t("pages.ai_assistant.copy046"));
    } catch (error) {
      setNotice(enterpriseErrorMessage(error, t("pages.ai_assistant.copy047")));
    } finally {
      setBusy("idle");
    }
  };

  const handleSendChat = async () => {
    if (!canSend) return;

    setBusy("sending");
    setNotice("");
    try {
      const sessionId = await ensureSession();
      const reply = await enterprisePost<ChatMessage[]>(
        `/ai/chat/sessions/${sessionId}/messages`,
        {
          content: prompt,
          verbosity,
          providerId,
          promptPresetId,
          persona,
          locale,
        },
      );

      setMessages(reply);
      setActiveSessionId(sessionId);
      const refreshedSessions =
        await enterpriseGet<ChatSession[]>("/ai/chat/sessions");
      setSessions(refreshedSessions);
      setNotice(t("pages.ai_assistant.copy048"));
    } catch (error) {
      setNotice(enterpriseErrorMessage(error, t("pages.ai_assistant.copy049")));
    } finally {
      setBusy("idle");
    }
  };

  const handleCreateAnalysis = async () => {
    if (!canSend) return;

    setBusy("analyzing");
    setNotice("");
    try {
      const created = await enterprisePost<AnalysisJob>("/analysis/jobs", {
        prompt,
        template,
        verbosity,
        providerId,
        persona,
        locale,
        promptPresetId,
        sourceIds: selectedSourceIds,
      });

      setAnalysisJobs((current) => [created, ...current]);
      setNotice(t("pages.ai_assistant.copy050"));
    } catch (error) {
      setNotice(enterpriseErrorMessage(error, t("pages.ai_assistant.copy051")));
    } finally {
      setBusy("idle");
    }
  };

  const handleSelectSession = (session: ChatSession) => {
    setActiveSessionId(session.id);
    setPromptPresetId(session.promptPresetId || promptPresetId);
    setPersona(session.persona || persona);
    if (session.sourceIds?.length) {
      setSelectedSourceIds(session.sourceIds);
    }
  };

  const toggleSource = (sourceId: string) => {
    setSelectedSourceIds((current) =>
      current.includes(sourceId)
        ? current.filter((item) => item !== sourceId)
        : [...current, sourceId],
    );
  };

  useEffect(() => {
    setExpandedMessages({});
  }, [activeSessionId]);

  useEffect(() => {
    setMessagePage(Math.max(0, getPageCount(messages.length, 8) - 1));
  }, [messages.length]);

  const handleAction = (action: AssistantAction) => {
    if (!action.target.startsWith("/")) {
      setNotice(t("pages.ai_assistant.copy052", { p1: action.target }));
      return;
    }

    const query = new URLSearchParams(action.payload ?? {});
    router.push(
      query.size ? `${action.target}?${query.toString()}` : action.target,
    );
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/workspace"
        title={t("pages.ai_assistant.copy053")}
        description={t("pages.ai_assistant.copy054")}
      />
    );
  }

  return (
    <div className="enterprise-shell ai-assistant-shell">
      <BackButton fallbackHref="/workspace" />

      <WorkflowSteps
        title={t(
          "pages.ai_assistant.flow.title",
          undefined,
          "AI Assistant Flow",
        )}
        subtitle={t(
          "pages.ai_assistant.flow.subtitle",
          undefined,
          "Move in this sequence to keep outputs stable and presentation-ready.",
        )}
        steps={workflowSteps}
      />

      <section id="ai-flow-brief" className="ai-assistant-topbar">
        <div className="ai-assistant-topbar-copy">
          <span className="eyebrow">{t("pages.ai_assistant.copy055")}</span>
          <h1>{text("对话工作台", "Conversation Workspace")}</h1>
          <p>
            {text(
              "把会话、上下文和执行动作收在同一屏里，便于边配置边对话，也更适合直接发起正式分析。",
              "Keep conversation, context, and execution controls on one screen so you can configure, chat, and launch formal analysis without switching views.",
            )}
          </p>
        </div>

        <div className="ai-assistant-topbar-meta">
          <span className="enterprise-chip enterprise-chip-static">
            {selectedPreset?.name ?? t("pages.ai_assistant.copy058")}
          </span>
          <span className="enterprise-chip enterprise-chip-static">
            {selectedProvider
              ? `${selectedProvider.chatModel}${providerHasCredential ? "" : ` | ${t("pages.ai_assistant.copy059")}`}`
              : t("pages.ai_assistant.copy060")}
          </span>
          <span className="enterprise-chip enterprise-chip-static">
            {t("pages.ai_assistant.copy061")} {sessions.length}
          </span>
          <span className="enterprise-chip enterprise-chip-static">
            {t("pages.ai_assistant.copy062")} {selectedSourceIds.length}
          </span>
          <span className="enterprise-chip enterprise-chip-static">
            {t("pages.ai_assistant.copy063")}{" "}
            {personaOptions.find((item) => item.value === persona)?.label}
          </span>
        </div>
      </section>

      <section className="enterprise-hero ai-assistant-hero">
        <div className="ai-assistant-hero-copy">
          <span className="eyebrow">{t("pages.ai_assistant.copy055")}</span>
          <h1>{text("对话工作台", "Conversation Workspace")}</h1>
          <p>
            {text(
              "把会话、上下文和执行动作收在同一屏里，便于边配置边对话，也更适合直接发起正式分析。",
              "Keep conversation, context, and execution controls on one screen so you can configure, chat, and launch formal analysis without switching views.",
            )}
          </p>

          <div className="ai-assistant-status-strip">
            <span className="enterprise-chip enterprise-chip-static">
              {selectedPreset?.name ?? t("pages.ai_assistant.copy066")}
            </span>
            <span className="enterprise-chip enterprise-chip-static">
              {selectedProvider
                ? `${selectedProvider.name} / ${selectedProvider.chatModel}${providerHasCredential ? "" : ` | ${t("pages.ai_assistant.copy067")}`}`
                : t("pages.ai_assistant.copy068")}
            </span>
            <span className="enterprise-chip enterprise-chip-static">
              {t("pages.ai_assistant.copy069")} {selectedSourceIds.length}
            </span>
            <span className="enterprise-chip enterprise-chip-static">
              {t("pages.ai_assistant.copy070")}{" "}
              {personaOptions.find((item) => item.value === persona)?.label}
            </span>
          </div>
        </div>

        <div className="ai-assistant-hero-metrics">
          <MetricTile
            label={t("pages.ai_assistant.copy071")}
            value={providers.length}
            detail={
              providers.length
                ? t("pages.ai_assistant.copy072")
                : t("pages.ai_assistant.copy073")
            }
          />
          <MetricTile
            label={t("pages.ai_assistant.copy074")}
            value={sessions.length}
            detail={
              activeSession
                ? formatDateTime(activeSession.updatedAt, locale, t)
                : t("pages.ai_assistant.copy075")
            }
          />
          <MetricTile
            label={t("pages.ai_assistant.copy076")}
            value={analysisJobs.length}
            detail={
              latestAnalysis
                ? latestAnalysis.status
                : t("pages.ai_assistant.copy077")
            }
          />
          <MetricTile
            label={t("pages.ai_assistant.copy078")}
            value={selectedSourceIds.length}
            detail={selectedSources[0]?.name ?? t("pages.ai_assistant.copy079")}
          />
        </div>
      </section>

      {loadingState ? (
        <div className="empty-state">
          <span>...</span>
          {loadingState}
        </div>
      ) : null}
      {pageError ? (
        <div className="empty-state">
          <span>!</span>
          {pageError}
        </div>
      ) : null}
      {notice ? <div className="auth-message">{notice}</div> : null}

      <div className="ai-assistant-layout">
        <div className="ai-assistant-column ai-assistant-column-side">
          <Card
            id="ai-flow-session"
            className="enterprise-side-card ai-assistant-card ai-assistant-control-card"
          >
            <SectionHeader
              kicker={t("pages.ai_assistant.copy080")}
              title={activeSession?.title ?? t("pages.ai_assistant.copy081")}
              caption={t("pages.ai_assistant.copy082")}
              aside={
                <button
                  type="button"
                  className="enterprise-secondary-button ai-assistant-inline-button"
                  disabled={busy !== "idle" || !canCreateSession}
                  onClick={() =>
                    createSession()
                      .then(() => setNotice(t("pages.ai_assistant.copy083")))
                      .catch((error) =>
                        setNotice(
                          enterpriseErrorMessage(
                            error,
                            t("pages.ai_assistant.copy084"),
                          ),
                        ),
                      )
                  }
                >
                  {t("pages.ai_assistant.copy085")}
                </button>
              }
            />

            <div className="ai-assistant-summary-grid">
              <div className="enterprise-summary-tile">
                <span>{t("pages.ai_assistant.copy086")}</span>
                <strong>
                  {activeSession?.title ?? t("pages.ai_assistant.copy087")}
                </strong>
              </div>
              <div className="enterprise-summary-tile">
                <span>{t("pages.ai_assistant.copy088")}</span>
                <strong>
                  {activeSession
                    ? formatDateTime(activeSession.updatedAt, locale, t)
                    : t("pages.ai_assistant.copy089")}
                </strong>
              </div>
            </div>

            <div className="ai-assistant-chat-stage">
              <span className="enterprise-chip enterprise-chip-static">
                {selectedPreset?.name ?? t("pages.ai_assistant.copy058")}
              </span>
              <span className="enterprise-chip enterprise-chip-static">
                {selectedProvider?.chatModel ?? t("pages.ai_assistant.copy060")}
              </span>
              <span className="enterprise-chip enterprise-chip-static">
                {t("pages.ai_assistant.copy062")} {selectedSources.length}
              </span>
              <span className="enterprise-chip enterprise-chip-static">
                {personaOptions.find((item) => item.value === persona)?.label}
              </span>
            </div>

            <PaginatedBlockControls
              count={sessions.length}
              page={pagedSessions.safePage}
              pageCount={pagedSessions.pageCount}
              expanded={sessionsExpanded}
              onPrev={() =>
                setSessionPage((current) => Math.max(0, current - 1))
              }
              onNext={() =>
                setSessionPage((current) =>
                  Math.min(pagedSessions.pageCount - 1, current + 1),
                )
              }
              onToggle={() => setSessionsExpanded((current) => !current)}
              t={t}
            />

            {sessionsExpanded ? (
              <div className="enterprise-card-stack ai-assistant-scroll-stack">
                {sessions.length ? (
                  pagedSessions.items.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      className={`enterprise-session-item ${activeSessionId === session.id ? "enterprise-session-item-active" : ""}`}
                      onClick={() => handleSelectSession(session)}
                    >
                      <strong>{session.title}</strong>
                      <span>
                        {session.lastMessagePreview ||
                          t("pages.ai_assistant.copy090")}
                      </span>
                      <em className="ai-assistant-meta-line">
                          {formatDateTime(session.updatedAt, locale, t)} |{" "}
                        {personaOptions.find(
                          (item) => item.value === session.persona,
                        )?.label ?? session.persona}
                      </em>
                    </button>
                  ))
                ) : (
                  <div className="enterprise-note-card ai-assistant-empty-card">
                    <strong>{t("pages.ai_assistant.copy091")}</strong>
                    <span>{t("pages.ai_assistant.copy092")}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="ai-assistant-collapsed-note">
                {t("pages.ai_assistant.copy093")}
              </div>
            )}
          </Card>

          <Card
            id="ai-flow-presets"
            className="enterprise-side-card ai-assistant-card ai-assistant-control-card"
          >
            <SectionHeader
              kicker={t("pages.ai_assistant.copy094")}
              title={t("pages.ai_assistant.copy095")}
              caption={t("pages.ai_assistant.copy096")}
            />

            <PaginatedBlockControls
              count={localizedPromptPresets.length}
              page={pagedPresets.safePage}
              pageCount={pagedPresets.pageCount}
              expanded={presetsExpanded}
              onPrev={() =>
                setPresetPage((current) => Math.max(0, current - 1))
              }
              onNext={() =>
                setPresetPage((current) =>
                  Math.min(pagedPresets.pageCount - 1, current + 1),
                )
              }
              onToggle={() => setPresetsExpanded((current) => !current)}
              t={t}
            />

            {presetsExpanded ? (
              <div className="enterprise-card-stack">
                {pagedPresets.items.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`enterprise-source-card ${promptPresetId === preset.id ? "enterprise-source-card-active" : ""}`}
                    onClick={() => setPromptPresetId(preset.id)}
                  >
                    <strong>{preset.name}</strong>
                    <span>{preset.objective}</span>
                    <em className="ai-assistant-meta-line">
                      {t("pages.ai_assistant.copy097")} |{" "}
                      {preset.recommendedTemplate}
                    </em>
                  </button>
                ))}
              </div>
            ) : (
              <div className="ai-assistant-collapsed-note">
                {t("pages.ai_assistant.copy098")}
              </div>
            )}
          </Card>

          <Card
            id="ai-flow-sources"
            className="enterprise-side-card ai-assistant-card ai-assistant-control-card"
          >
            <SectionHeader
              kicker={t("pages.ai_assistant.copy099")}
              title={t("pages.ai_assistant.copy100")}
              caption={t("pages.ai_assistant.copy101")}
            />

            <PaginatedBlockControls
              count={sources.length}
              page={pagedSources.safePage}
              pageCount={pagedSources.pageCount}
              expanded={sourcesExpanded}
              onPrev={() =>
                setSourcePage((current) => Math.max(0, current - 1))
              }
              onNext={() =>
                setSourcePage((current) =>
                  Math.min(pagedSources.pageCount - 1, current + 1),
                )
              }
              onToggle={() => setSourcesExpanded((current) => !current)}
              t={t}
            />

            {sourcesExpanded ? (
              <div className="enterprise-card-stack ai-assistant-scroll-stack">
                {sources.length ? (
                  pagedSources.items.map((source) => {
                    const active = selectedSourceIds.includes(source.id);
                    const findings = splitMetaList(
                      source.connectionMeta?.qualityFindings,
                    );
                    const summary =
                      source.connectionMeta?.analysisSummary ??
                      findings[0] ??
                      t("pages.ai_assistant.copy102");

                    return (
                      <button
                        key={source.id}
                        type="button"
                        className={`enterprise-source-card ${active ? "enterprise-source-card-active" : ""}`}
                        onClick={() => toggleSource(source.id)}
                      >
                        <strong>{source.name}</strong>
                        <span>{`${(source.type ?? "source").toUpperCase()} | ${t("pages.ai_assistant.copy103")} ${source.qualityScore ?? "-"} | ${source.rowCount ?? 0} ${t("pages.ai_assistant.copy104")}`}</span>
                        <em className="ai-assistant-meta-line">{summary}</em>
                      </button>
                    );
                  })
                ) : (
                  <div className="enterprise-note-card ai-assistant-empty-card">
                    <strong>{t("pages.ai_assistant.copy105")}</strong>
                    <span>{t("pages.ai_assistant.copy106")}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="ai-assistant-collapsed-note">
                {t("pages.ai_assistant.copy107")}
              </div>
            )}
          </Card>
        </div>

        <div className="ai-assistant-column ai-assistant-column-main">
          <Card
            id="ai-flow-workspace"
            className="enterprise-main-card ai-assistant-card ai-assistant-workspace-card"
          >
            <SectionHeader
              kicker={text("工作台", "Workspace")}
              title={text(
                "对话、配置与正式分析",
                "Conversation, Configuration, and Formal Analysis",
              )}
              caption={text(
                "先完成配置，再发起对话或正式分析，让上下文更稳定、操作也更集中。",
                "Save configuration first, then start chat or formal analysis so context stays stable and actions stay focused.",
              )}
            />

            <div className="ai-assistant-composer-meta">
              <span className="enterprise-chip enterprise-chip-static">
                {t("pages.ai_assistant.copy111")}{" "}
                {selectedPreset?.name ?? t("pages.ai_assistant.copy112")}
              </span>
              <span className="enterprise-chip enterprise-chip-static">
                {t("pages.ai_assistant.copy062")} {selectedSources.length}
              </span>
              <span className="enterprise-chip enterprise-chip-static">
                {t("pages.ai_assistant.copy113")}{" "}
                {selectedProvider?.chatModel ?? t("pages.ai_assistant.copy114")}
              </span>
            </div>

            <details className="ai-assistant-composer-details" open>
              <summary>{t("pages.ai_assistant.copy115")}</summary>
              <div className="enterprise-form-grid ai-assistant-form-grid">
                <label>
                  <span>{t("pages.ai_assistant.copy116")}</span>
                  <select
                    value={persona}
                    onChange={(event) => setPersona(event.target.value)}
                  >
                    {personaOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("pages.ai_assistant.copy117")}</span>
                  <select
                    value={verbosity}
                    onChange={(event) => setVerbosity(event.target.value)}
                  >
                    {verbosityOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("pages.ai_assistant.copy118")}</span>
                  <select
                    value={template}
                    onChange={(event) => setTemplate(event.target.value)}
                  >
                    {analysisTemplates.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>{t("pages.ai_assistant.copy119")}</span>
                  <select
                    value={providerId}
                    onChange={(event) =>
                      selectProviderForEditing(event.target.value)
                    }
                  >
                    <option value="">{t("pages.ai_assistant.copy120")}</option>
                    {providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name} / {provider.chatModel}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="ai-assistant-context-strip">
                <div className="enterprise-note-card">
                  <strong>{t("pages.ai_assistant.copy121")}</strong>
                  <span>
                    {selectedPreset?.objective ??
                      t("pages.ai_assistant.copy122")}
                  </span>
                </div>
                <div className="enterprise-note-card">
                  <strong>{t("pages.ai_assistant.copy123")}</strong>
                  <span>
                    {selectedSources.length
                      ? selectedSources.map((item) => item.name).join(" / ")
                      : t("pages.ai_assistant.copy124")}
                  </span>
                </div>
              </div>
            </details>

            <label className="ai-assistant-prompt-block">
              <span>{t("pages.ai_assistant.copy125")}</span>
              <textarea
                className="enterprise-textarea ai-assistant-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
              />
            </label>

            {actionHint ? (
              <div className="panel-caption ai-assistant-action-hint">
                {actionHint}
              </div>
            ) : null}

            <div className="enterprise-action-row ai-assistant-composer-actions">
              <button
                type="button"
                className="enterprise-secondary-button"
                disabled={busy !== "idle" || !canCreateSession}
                onClick={handleSaveProfile}
              >
                {busy === "saving-profile"
                  ? t("pages.ai_assistant.copy126")
                  : t("pages.ai_assistant.copy127")}
              </button>
              <button
                type="button"
                className="enterprise-primary-button"
                disabled={busy !== "idle" || !canSend}
                onClick={handleSendChat}
              >
                {busy === "sending"
                  ? t("pages.ai_assistant.copy128")
                  : t("pages.ai_assistant.copy129")}
              </button>
              <button
                type="button"
                className="enterprise-secondary-button"
                disabled={busy !== "idle" || !canSend}
                onClick={handleCreateAnalysis}
              >
                {busy === "analyzing"
                  ? t("pages.ai_assistant.copy130")
                  : t("pages.ai_assistant.copy131")}
              </button>
            </div>
          </Card>

          <Card
            id="ai-flow-chat"
            className="enterprise-main-card ai-assistant-card ai-assistant-chat-card"
          >
            <SectionHeader
              kicker={t("pages.ai_assistant.copy132")}
              title={activeSession?.title ?? t("pages.ai_assistant.copy133")}
              caption={t("pages.ai_assistant.copy134")}
              aside={
                activeSession ? (
                  <span className="enterprise-chip enterprise-chip-static">
                {formatDateTime(activeSession.updatedAt, locale, t)}
                  </span>
                ) : null
              }
            />

            <div className="ai-assistant-chat-stage">
              <span className="enterprise-chip enterprise-chip-static">
                {selectedPreset?.name ?? t("pages.ai_assistant.copy058")}
              </span>
              <span className="enterprise-chip enterprise-chip-static">
                {selectedProvider?.chatModel ?? t("pages.ai_assistant.copy060")}
              </span>
              <span className="enterprise-chip enterprise-chip-static">
                {t("pages.ai_assistant.copy062")} {selectedSources.length}
              </span>
              <span className="enterprise-chip enterprise-chip-static">
                {personaOptions.find((item) => item.value === persona)?.label}
              </span>
            </div>

            <PaginatedBlockControls
              count={messages.length}
              page={pagedMessages.safePage}
              pageCount={pagedMessages.pageCount}
              expanded={messagesExpanded}
              onPrev={() =>
                setMessagePage((current) => Math.max(0, current - 1))
              }
              onNext={() =>
                setMessagePage((current) =>
                  Math.min(pagedMessages.pageCount - 1, current + 1),
                )
              }
              onToggle={() => setMessagesExpanded((current) => !current)}
              t={t}
            />

            {messagesExpanded ? (
              <div className="ai-assistant-message-list">
                {messages.length ? (
                  pagedMessages.items.map((item) => {
                    const collapsible = shouldCollapseMessage(item);
                    const expanded = expandedMessages[item.id] ?? !collapsible;
                    const preview = expanded
                      ? item.content
                      : buildMessagePreview(item.content);
                    const hasDetails = Boolean(
                      safeArray(item.sourceRefs).length ||
                        item.promptTokens ||
                        item.completionTokens ||
                        item.intentAssessment ||
                        safeArray(item.actions).length,
                    );

                    return (
                      <article
                        key={item.id}
                        className={`ai-assistant-message ai-assistant-message-${item.role}`}
                      >
                        <div className="ai-assistant-message-head">
                          <strong>
                            {item.role === "assistant"
                              ? t("pages.ai_assistant.copy135")
                              : t("pages.ai_assistant.copy136")}
                          </strong>
                          <span>{formatDateTime(item.createdAt, locale, t)}</span>
                        </div>

                        <div
                          className={`ai-assistant-message-body ${expanded ? "" : "ai-assistant-message-body-collapsed"}`}
                        >
                          {preview}
                        </div>

                        {collapsible ? (
                          <div className="ai-assistant-message-toolbar">
                            <button
                              type="button"
                              className="enterprise-secondary-button ai-assistant-mini-button"
                              onClick={() => toggleMessageExpansion(item.id)}
                            >
                              {expanded
                                ? t("pages.ai_assistant.copy137")
                                : t("pages.ai_assistant.copy138")}
                            </button>
                          </div>
                        ) : null}

                        {hasDetails ? (
                          <details className="ai-assistant-message-details">
                            <summary>{t("pages.ai_assistant.copy139")}</summary>

                            <div className="ai-assistant-message-meta">
                              {safeArray(item.sourceRefs).length ? (
                                <span>
                                  {t("pages.ai_assistant.copy140")}{" "}
                                  {safeArray(item.sourceRefs).length}
                                </span>
                              ) : null}
                              {item.promptTokens ? (
                                <span>Prompt {item.promptTokens}</span>
                              ) : null}
                              {item.completionTokens ? (
                                <span>Completion {item.completionTokens}</span>
                              ) : null}
                              {item.intentAssessment ? (
                                <span>
                                  {item.intentAssessment.suggestedTemplate}
                                </span>
                              ) : null}
                            </div>

                            {safeArray(item.actions).length ? (
                              <div className="ai-assistant-inline-actions">
                                {safeArray(item.actions).map((action) => (
                                  <button
                                    key={action.id}
                                    type="button"
                                    className="enterprise-list-item ai-assistant-action-chip"
                                    onClick={() => handleAction(action)}
                                  >
                                    <strong>{action.label}</strong>
                                    <span>
                                      {action.type} |{" "}
                                      {t("pages.ai_assistant.copy141")}{" "}
                                      {(action.confidence * 100).toFixed(0)}%
                                    </span>
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </details>
                        ) : null}
                      </article>
                    );
                  })
                ) : (
                  <div className="enterprise-note-card ai-assistant-empty-card">
                    <strong>{t("pages.ai_assistant.copy142")}</strong>
                    <span>{t("pages.ai_assistant.copy143")}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="ai-assistant-collapsed-note">
                {t("pages.ai_assistant.copy144")}
              </div>
            )}
          </Card>
        </div>
      </div>

      <details id="ai-flow-advanced" className="ai-assistant-advanced">
        <summary>{t("pages.ai_assistant.copy145")}</summary>
        <div className="ai-assistant-advanced-grid">
          <Card className="enterprise-side-card ai-assistant-card">
            <SectionHeader
              kicker={t("pages.ai_assistant.copy146")}
              title={t("pages.ai_assistant.copy147")}
              caption={t("pages.ai_assistant.copy148")}
            />

            <div className="enterprise-note-card">
              <strong>{intentCard.title}</strong>
              <span>{intentCard.detail}</span>
            </div>

            <PaginatedBlockControls
              count={suggestedActions.length}
              page={pagedActions.safePage}
              pageCount={pagedActions.pageCount}
              expanded={actionsExpanded}
              onPrev={() =>
                setActionPage((current) => Math.max(0, current - 1))
              }
              onNext={() =>
                setActionPage((current) =>
                  Math.min(pagedActions.pageCount - 1, current + 1),
                )
              }
              onToggle={() => setActionsExpanded((current) => !current)}
              t={t}
            />

            {actionsExpanded ? (
              <div className="enterprise-card-stack">
                {suggestedActions.length ? (
                  pagedActions.items.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      className="enterprise-list-item"
                      onClick={() => handleAction(action)}
                    >
                      <strong>{action.label}</strong>
                      <span>
                        {action.type} | {action.target} |{" "}
                        {t("pages.ai_assistant.copy141")}{" "}
                        {(action.confidence * 100).toFixed(0)}%
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="enterprise-note-card ai-assistant-empty-card">
                    <strong>{t("pages.ai_assistant.copy149")}</strong>
                    <span>{t("pages.ai_assistant.copy150")}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="ai-assistant-collapsed-note">
                {t("pages.ai_assistant.copy151")}
              </div>
            )}
          </Card>

          <Card className="enterprise-side-card ai-assistant-card">
            <SectionHeader
              kicker={t("pages.ai_assistant.copy033")}
              title={t("pages.ai_assistant.copy152")}
              caption={t("pages.ai_assistant.copy153")}
              aside={
                <button
                  type="button"
                  className="enterprise-secondary-button ai-assistant-inline-button"
                  onClick={() => router.push("/reports")}
                >
                  {t("pages.ai_assistant.copy154")}
                </button>
              }
            />

            {latestAnalysisResult ? (
              <div className="enterprise-note-card">
                <strong>
                  {latestAnalysisResult.headline ||
                    t("pages.ai_assistant.copy155")}
                </strong>
                <span>
                  {latestAnalysisResult.summary ||
                    t("pages.ai_assistant.copy156")}
                </span>
                <div className="ai-assistant-message-meta">
                  <span
                    className={`ai-assistant-tone-pill ai-assistant-tone-${getRiskTone(latestAnalysisResult.riskLevel)}`}
                  >
                    {t("pages.ai_assistant.copy157")}{" "}
                    {latestAnalysisResult.riskLevel ||
                      t("pages.ai_assistant.copy158")}
                  </span>
                  <span>
                    {t("pages.ai_assistant.copy141")}{" "}
                    {typeof latestAnalysisResult.confidence === "number"
                      ? `${(latestAnalysisResult.confidence * 100).toFixed(0)}%`
                      : "--"}
                  </span>
                  <span>
                    {latestAnalysisResult.tokenUsage?.totalTokens ?? 0} tokens
                  </span>
                </div>
              </div>
            ) : (
              <div className="enterprise-note-card ai-assistant-empty-card">
                <strong>{t("pages.ai_assistant.copy077")}</strong>
                <span>{t("pages.ai_assistant.copy159")}</span>
              </div>
            )}

            <PaginatedBlockControls
              count={analysisJobs.length}
              page={pagedAnalysis.safePage}
              pageCount={pagedAnalysis.pageCount}
              expanded={analysisExpanded}
              onPrev={() =>
                setAnalysisPage((current) => Math.max(0, current - 1))
              }
              onNext={() =>
                setAnalysisPage((current) =>
                  Math.min(pagedAnalysis.pageCount - 1, current + 1),
                )
              }
              onToggle={() => setAnalysisExpanded((current) => !current)}
              t={t}
            />

            {analysisExpanded ? (
              <div className="enterprise-card-stack">
                {pagedAnalysis.items.map((job) => (
                  <div key={job.id} className="enterprise-list-item">
                    <strong>
                      {job.result?.headline ??
                        localizeTemplateId(job.template, t)}
                    </strong>
                    <span>
                      {localizeTemplateId(job.template, t)} |{" "}
                      {localizeStatus(job.status, t)} |{" "}
                      {formatDateTime(job.updatedAt, locale, t)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ai-assistant-collapsed-note">
                {t("pages.ai_assistant.copy160")}
              </div>
            )}
          </Card>

          <Card className="enterprise-side-card ai-assistant-card">
            <SectionHeader
              kicker={t("pages.ai_assistant.copy161")}
              title={t("pages.ai_assistant.copy162")}
              caption={t("pages.ai_assistant.copy163")}
            />

            <PaginatedBlockControls
              count={providers.length}
              page={pagedProviders.safePage}
              pageCount={pagedProviders.pageCount}
              expanded={providersExpanded}
              onPrev={() =>
                setProviderPage((current) => Math.max(0, current - 1))
              }
              onNext={() =>
                setProviderPage((current) =>
                  Math.min(pagedProviders.pageCount - 1, current + 1),
                )
              }
              onToggle={() => setProvidersExpanded((current) => !current)}
              t={t}
            />

            {providersExpanded ? (
              <div className="enterprise-card-stack">
                {providers.length ? (
                  pagedProviders.items.map((provider) => (
                    <button
                      key={provider.id}
                      type="button"
                      className={`enterprise-source-card ${providerId === provider.id ? "enterprise-source-card-active" : ""}`}
                      onClick={() => selectProviderForEditing(provider.id)}
                    >
                      <strong>{provider.name}</strong>
                      <span>
                        {provider.chatModel} | {provider.embeddingModel}
                      </span>
                      <em className="ai-assistant-meta-line">
                        {provider.apiKeyMasked?.trim()
                          ? provider.lastVerifiedAt
                            ? `${t("pages.ai_assistant.copy164")} | ${formatDateTime(provider.lastVerifiedAt, locale, t)}`
                            : t("pages.ai_assistant.copy165")
                          : t("pages.ai_assistant.copy166")}
                      </em>
                    </button>
                  ))
                ) : (
                  <div className="enterprise-note-card ai-assistant-empty-card">
                    <strong>{t("pages.ai_assistant.copy167")}</strong>
                    <span>{t("pages.ai_assistant.copy168")}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="ai-assistant-collapsed-note">
                {t("pages.ai_assistant.copy169")}
              </div>
            )}

            <div className="enterprise-form-grid ai-assistant-provider-grid">
              <label>
                <span>{t("pages.ai_assistant.copy170")}</span>
                <input
                  value={providerForm.name}
                  onChange={(event) =>
                    setProviderForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>{t("pages.ai_assistant.provider.baseUrl", undefined, "Base URL")}</span>
                <input
                  value={providerForm.baseUrl}
                  onChange={(event) =>
                    setProviderForm((current) => ({
                      ...current,
                      baseUrl: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>{t("pages.ai_assistant.provider.apiKey", undefined, "API Key")}</span>
                <input
                  type="password"
                  autoComplete="off"
                  value={providerForm.apiKey}
                  onChange={(event) =>
                    setProviderForm((current) => ({
                      ...current,
                      apiKey: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>{t("pages.ai_assistant.copy171")}</span>
                <input
                  value={providerForm.chatModel}
                  onChange={(event) =>
                    setProviderForm((current) => ({
                      ...current,
                      chatModel: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                <span>{t("pages.ai_assistant.copy172")}</span>
                <input
                  value={providerForm.embeddingModel}
                  onChange={(event) =>
                    setProviderForm((current) => ({
                      ...current,
                      embeddingModel: event.target.value,
                    }))
                  }
                />
              </label>
            </div>

            <div className="panel-caption">
              {providerId
                ? t("pages.ai_assistant.copy173")
                : t("pages.ai_assistant.copy174")}
            </div>

            <label className="ai-assistant-prompt-block">
              <span>{t("pages.ai_assistant.copy175")}</span>
              <textarea
                className="enterprise-textarea ai-assistant-provider-prompt"
                value={providerForm.systemPrompt}
                onChange={(event) =>
                  setProviderForm((current) => ({
                    ...current,
                    systemPrompt: event.target.value,
                  }))
                }
              />
            </label>

            <div className="enterprise-action-row">
              <button
                type="button"
                className="enterprise-secondary-button"
                disabled={!canManageProviders || busy !== "idle"}
                onClick={handleCreateProvider}
              >
                {busy === "creating-provider"
                  ? t("pages.ai_assistant.copy126")
                  : t("pages.ai_assistant.copy176")}
              </button>
              <button
                type="button"
                className="enterprise-secondary-button"
                disabled={!canManageProviders || busy !== "idle"}
                onClick={startNewProviderDraft}
              >
                {t("pages.ai_assistant.copy177")}
              </button>
              <button
                type="button"
                className="enterprise-secondary-button"
                disabled={
                  !canManageProviders ||
                  !providerId ||
                  !providerHasCredential ||
                  busy !== "idle"
                }
                onClick={handleTestProvider}
              >
                {busy === "testing-provider"
                  ? t("pages.ai_assistant.copy178")
                  : t("pages.ai_assistant.copy179")}
              </button>
            </div>
          </Card>
        </div>
      </details>
    </div>
  );
}



