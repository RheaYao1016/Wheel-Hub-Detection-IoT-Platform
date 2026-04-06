"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import PageLoadFallback from "../components/Layout/PageLoadFallback";
import { useSessionGuard } from "../hooks/useSessionGuard";
import { useLocale } from "../components/Locale/LocaleProvider";
import { readStoredAuthSession } from "@/lib/auth-session";
import { enterpriseErrorMessage, enterpriseGet, enterprisePost } from "@/lib/enterprise-client";
import { localizePromptPreset } from "@/lib/enterprise-localization";
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
type BusyState = "idle" | "loading" | "creating-provider" | "testing-provider" | "saving-profile" | "sending" | "analyzing";

function buildProviderForm(locale: AppLocale) {
  return {
    name: locale === "zh-CN" ? "OpenAI 兼容模型服务" : "OpenAI-Compatible Provider",
    baseUrl: "https://api.openai.com/v1",
    apiKey: "",
    chatModel: "gpt-4o-mini",
    embeddingModel: "text-embedding-3-small",
    defaultStrategy: "strict-real-routing",
    systemPrompt:
      locale === "zh-CN"
        ? "你是工业质量分析助手。所有结论都必须基于已选数据源中的证据，输出风险、影响、建议和下一步动作，绝不编造数据。"
        : "You are an industrial quality analysis assistant. Ground every conclusion in the selected evidence, describe risk and impact, recommend next steps, and never fabricate data.",
  };
}

function buildProviderFormFromProfile(provider: AiProviderProfile, locale: AppLocale) {
  const defaults = buildProviderForm(locale);
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

function defaultPrompt(locale: AppLocale) {
  return locale === "zh-CN"
    ? "请结合当前已选数据源，说明最重要的质量风险、影响范围，以及现场团队现在应该先做什么。"
    : "Review the selected sources and explain the most important quality risk, who is affected, and what the frontline team should do first.";
}

function buildTemplateOptions(text: (zh: string, en: string) => string) {
  return [
    { value: "quality-variance", label: text("质量波动诊断", "Quality variance diagnosis") },
    { value: "defect-trend", label: text("缺陷趋势复盘", "Defect trend review") },
    { value: "shift-efficiency", label: text("班次效率分析", "Shift efficiency analysis") },
    { value: "equipment-troubleshooting", label: text("设备异常排查", "Equipment troubleshooting") },
  ];
}

function buildPersonaOptions(text: (zh: string, en: string) => string) {
  return [
    { value: "operator", label: text("操作员视角", "Operator view") },
    { value: "engineer", label: text("工程师视角", "Engineer view") },
    { value: "manager", label: text("管理层视角", "Manager view") },
  ];
}

function buildVerbosityOptions(text: (zh: string, en: string) => string) {
  return [
    { value: "brief", label: text("简要", "Brief") },
    { value: "standard", label: text("标准", "Standard") },
    { value: "deep", label: text("深入", "Deep") },
  ];
}

function splitMetaList(value?: string) {
  return value?.split("||").map((item) => item.trim()).filter(Boolean) ?? [];
}

function safeArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

function formatDateTime(value: string | undefined, locale: AppLocale) {
  if (!value) {
    return locale === "zh-CN" ? "刚刚" : "Just now";
  }

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

function renderIntent(intent: IntentAssessment | null | undefined, locale: AppLocale) {
  if (!intent) {
    return {
      title: locale === "zh-CN" ? "等待后端意图路由" : "Waiting for backend intent routing",
      detail:
        locale === "zh-CN"
          ? "发送真实对话或创建正式分析后，这里会显示后端判断出的意图、推荐模板和下一步动作。"
          : "Send a real chat request or create a formal analysis to receive the backend intent classification, recommended template, and next actions.",
    };
  }

  return {
    title: intent.intent.replaceAll("-", " "),
    detail:
      locale === "zh-CN"
        ? `${intent.reason} 推荐模板：${intent.suggestedTemplate}。`
        : `${intent.reason} Suggested template: ${intent.suggestedTemplate}.`,
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
  return item.role === "assistant" && (item.content.length > 220 || lineCount > 4 || safeArray(item.actions).length > 0);
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
  text,
}: {
  count: number;
  page: number;
  pageCount: number;
  expanded: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggle: () => void;
  text: (zh: string, en: string) => string;
}) {
  return (
    <div className="ai-assistant-block-toolbar">
      <span className="ai-assistant-block-count">
        {text("共", "Total")} {count} {text("项", "items")}
      </span>
      <div className="ai-assistant-block-actions">
        <button type="button" className="enterprise-secondary-button ai-assistant-mini-button" onClick={onToggle}>
          {expanded ? text("收起", "Collapse") : text("展开", "Expand")}
        </button>
        <button type="button" className="enterprise-secondary-button ai-assistant-mini-button" disabled={page <= 0} onClick={onPrev}>
          {text("上一页", "Prev")}
        </button>
        <span className="ai-assistant-page-indicator">
          {page + 1} / {pageCount}
        </span>
        <button type="button" className="enterprise-secondary-button ai-assistant-mini-button" disabled={page >= pageCount - 1} onClick={onNext}>
          {text("下一页", "Next")}
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
  const { locale, text } = useLocale();
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
  const [prompt, setPrompt] = useState(defaultPrompt(locale));
  const [providerForm, setProviderForm] = useState(() => buildProviderForm(locale));
  const [notice, setNotice] = useState("");
  const [pageError, setPageError] = useState("");
  const [loadingState, setLoadingState] = useState(text("正在连接 AI 与后端服务...", "Connecting to the backend and AI services..."));
  const [busy, setBusy] = useState<BusyState>("idle");
  const [sessionPage, setSessionPage] = useState(0);
  const [presetPage, setPresetPage] = useState(0);
  const [sourcePage, setSourcePage] = useState(0);
  const [messagePage, setMessagePage] = useState(0);
  const [actionPage, setActionPage] = useState(0);
  const [analysisPage, setAnalysisPage] = useState(0);
  const [providerPage, setProviderPage] = useState(0);
  const [sessionsExpanded, setSessionsExpanded] = useState(true);
  const [presetsExpanded, setPresetsExpanded] = useState(true);
  const [sourcesExpanded, setSourcesExpanded] = useState(true);
  const [messagesExpanded, setMessagesExpanded] = useState(true);
  const [actionsExpanded, setActionsExpanded] = useState(true);
  const [analysisExpanded, setAnalysisExpanded] = useState(true);
  const [providersExpanded, setProvidersExpanded] = useState(true);
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});

  const analysisTemplates = useMemo(() => buildTemplateOptions(text), [text]);
  const personaOptions = useMemo(() => buildPersonaOptions(text), [text]);
  const verbosityOptions = useMemo(() => buildVerbosityOptions(text), [text]);
  const localizedPromptPresets = useMemo(() => promptPresets.map((item) => localizePromptPreset(item, locale)), [promptPresets, locale]);
  const activeSession = useMemo(() => sessions.find((item) => item.id === activeSessionId) ?? null, [sessions, activeSessionId]);
  const selectedPreset = useMemo(
    () => localizedPromptPresets.find((item) => item.id === promptPresetId) ?? localizedPromptPresets[0] ?? null,
    [localizedPromptPresets, promptPresetId],
  );
  const selectedProvider = useMemo(() => providers.find((item) => item.id === providerId) ?? null, [providers, providerId]);
  const providerHasCredential = Boolean(selectedProvider?.apiKeyMasked?.trim() || providerForm.apiKey.trim());
  const selectedSources = useMemo(() => sources.filter((source) => selectedSourceIds.includes(source.id)), [sources, selectedSourceIds]);
  const latestAnalysis = analysisJobs[0] ?? null;
  const latestAnalysisResult = latestAnalysis?.result ?? null;
  const lastAssistantMessage = useMemo(() => [...messages].reverse().find((item) => item.role === "assistant") ?? null, [messages]);
  const intentCard = renderIntent(lastAssistantMessage?.intentAssessment ?? latestAnalysisResult?.intentAssessment, locale);
  const suggestedActions = safeArray(
    safeArray(lastAssistantMessage?.actions).length ? lastAssistantMessage?.actions : latestAnalysisResult?.actions,
  );
  const pagedSessions = useMemo(() => getPagedItems(sessions, sessionPage, 4), [sessions, sessionPage]);
  const pagedPresets = useMemo(() => getPagedItems(localizedPromptPresets, presetPage, 4), [localizedPromptPresets, presetPage]);
  const pagedSources = useMemo(() => getPagedItems(sources, sourcePage, 4), [sources, sourcePage]);
  const pagedMessages = useMemo(() => getPagedItems(messages, messagePage, 8), [messages, messagePage]);
  const pagedActions = useMemo(() => getPagedItems(suggestedActions, actionPage, 4), [suggestedActions, actionPage]);
  const pagedAnalysis = useMemo(() => getPagedItems(analysisJobs, analysisPage, 4), [analysisJobs, analysisPage]);
  const pagedProviders = useMemo(() => getPagedItems(providers, providerPage, 4), [providers, providerPage]);
  const canCreateSession = Boolean(promptPresetId && selectedSourceIds.length);
  const canSend = Boolean(providerId && providerHasCredential && promptPresetId && selectedSourceIds.length && prompt.trim());

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages((current) => ({ ...current, [messageId]: !current[messageId] }));
  };

  const actionHint = useMemo(() => {
    if (!providers.length) {
      return text("请先配置至少一个可用的模型服务。", "Configure at least one reachable model provider first.");
    }
    if (!providerId) {
      return text("请先选择一个模型服务。", "Select a provider first.");
    }
    if (!providerHasCredential) {
      return text("当前模型服务还没有 API Key，请先在右侧配置并保存。", "The selected provider does not have an API key yet. Add and save one in the provider panel first.");
    }
    if (!promptPresetId) {
      return text("请先选择一个提示词预设。", "Select a prompt preset first.");
    }
    if (!selectedSourceIds.length) {
      return text("请至少选择一个数据源。", "Select at least one data source.");
    }
    if (!prompt.trim()) {
      return text("请输入本次分析需求。", "Enter your analysis request.");
    }
    return "";
  }, [prompt, promptPresetId, providerHasCredential, providerId, providers.length, selectedSourceIds.length, text]);

  useEffect(() => {
    const authSession = readStoredAuthSession();
    setCanManageProviders(authSession?.role === "admin" || authSession?.role === "engineer");
  }, []);

  useEffect(() => {
    if (!providerId) {
      setProviderForm(buildProviderForm(locale));
      return;
    }

    const provider = providers.find((item) => item.id === providerId);
    if (provider) {
      setProviderForm(buildProviderFormFromProfile(provider, locale));
    }
  }, [locale, providerId, providers]);

  const selectProviderForEditing = (nextProviderId: string) => {
    setProviderId(nextProviderId);
    const nextProvider = providers.find((item) => item.id === nextProviderId);
    setProviderForm(nextProvider ? buildProviderFormFromProfile(nextProvider, locale) : buildProviderForm(locale));
  };

  const startNewProviderDraft = () => {
    setProviderId("");
    setProviderForm(buildProviderForm(locale));
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
    const sessionMessages = await enterpriseGet<ChatMessage[]>(`/ai/chat/sessions/${sessionId}`);
    setMessages(sessionMessages);
  };

  const loadAssistantData = async (attempt = 1) => {
    setBusy("loading");
    setPageError("");
    setNotice("");
    setLoadingState(
      attempt > 1
        ? text(`正在重试服务连接（第 ${attempt} 次）...`, `Retrying service connection (attempt ${attempt})...`)
        : text("正在连接 AI 与后端服务...", "Connecting to the backend and AI services..."),
    );

    try {
      const [providerResult, presetResult, sourceResult, sessionResult, analysisResult] = await Promise.allSettled([
        enterpriseGet<AiProviderProfile[]>("/ai/providers"),
        enterpriseGet<PromptPreset[]>("/ai/prompt-presets"),
        enterpriseGet<DataSourceProfile[]>("/data-sources"),
        enterpriseGet<ChatSession[]>("/ai/chat/sessions"),
        enterpriseGet<AnalysisJob[]>("/analysis/jobs"),
      ]);

      const errors = [providerResult, presetResult, sourceResult, sessionResult, analysisResult]
        .filter((item): item is PromiseRejectedResult => item.status === "rejected")
        .map((item) => item.reason);

      if (errors.length && attempt < 5) {
        throw errors[0];
      }

      const providerData = providerResult.status === "fulfilled" ? providerResult.value : [];
      const presetData = presetResult.status === "fulfilled" ? presetResult.value : [];
      const sourceData = sourceResult.status === "fulfilled" ? sourceResult.value : [];
      const sessionData = sessionResult.status === "fulfilled" ? sessionResult.value : [];
      const jobData = analysisResult.status === "fulfilled" ? analysisResult.value : [];

      setProviders(providerData);
      setPromptPresets(presetData);
      setSources(sourceData);
      setSessions(sessionData);
      setAnalysisJobs(jobData);

      setProviderId((current) => current || providerData[0]?.id || "");
      setPromptPresetId((current) => current || sessionData[0]?.promptPresetId || presetData[0]?.id || "");
      setSelectedSourceIds((current) => (current.length ? current : sourceData.slice(0, 3).map((item) => item.id)));

      const nextSessionId = activeSessionId || sessionData[0]?.id || "";
      if (nextSessionId && nextSessionId !== activeSessionId) {
        setActiveSessionId(nextSessionId);
      }

      setLoadingState("");
      setBusy("idle");
    } catch (error) {
      if (attempt < 6) {
        window.setTimeout(() => {
          loadAssistantData(attempt + 1).catch(console.error);
        }, Math.min(1800, 450 + attempt * 220));
        return;
      }

      setBusy("idle");
      setLoadingState("");
      setPageError(
        enterpriseErrorMessage(
          error,
          text(
            "加载 AI 助手失败，请确认后端、AI 服务和当前会话都处于可用状态。",
            "Failed to load the AI Assistant. Make sure the backend, AI service, and current session are all available.",
          ),
        ),
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
      setNotice(enterpriseErrorMessage(error, text("加载会话历史失败。", "Failed to load the selected chat history.")));
    });
  }, [activeSessionId, text]);

  useEffect(() => {
    if (!activeSession) return;
    if (activeSession.promptPresetId) setPromptPresetId(activeSession.promptPresetId);
    if (activeSession.persona) setPersona(activeSession.persona);
    if (activeSession.sourceIds?.length) setSelectedSourceIds(activeSession.sourceIds);
  }, [activeSession]);

  useEffect(() => {
    if (selectedPreset?.recommendedTemplate) {
      setTemplate(selectedPreset.recommendedTemplate);
    }
  }, [selectedPreset]);

  const createSession = async () => {
    const session = await enterprisePost<ChatSession>("/ai/chat/sessions", {
      title: `${selectedPreset?.name ?? text("AI 会话", "AI Session")} ${sessions.length + 1}`,
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
      setNotice(text("只有管理员或工程师可以维护模型服务。", "Only admins or engineers can manage providers."));
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
      setProviders((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      selectProviderForEditing(saved.id);
      setNotice(text("模型服务已保存，现在可以测试连通性。", "Provider saved. You can test the connection now."));
    } catch (error) {
      setNotice(enterpriseErrorMessage(error, text("保存模型服务失败。", "Failed to save the provider.")));
    } finally {
      setBusy("idle");
    }
  };

  const handleTestProvider = async () => {
    if (!providerId) return;

    setBusy("testing-provider");
    setNotice("");
    try {
      const result = await enterprisePost<{ provider: AiProviderProfile; sampleReply: string }>("/ai/providers/test", {
        providerId,
        prompt:
          locale === "zh-CN"
            ? "请用一句话确认当前模型接口可用，并给出一条面向工厂现场的诊断建议。"
            : "Confirm the current endpoint is reachable and return one practical diagnostic recommendation for the factory floor.",
      });
      setNotice(text(`模型测试成功：${result.sampleReply}`, `Provider test succeeded: ${result.sampleReply}`));
    } catch (error) {
      setNotice(enterpriseErrorMessage(error, text("模型服务测试失败。", "Provider test failed.")));
    } finally {
      setBusy("idle");
    }
  };

  const handleSaveProfile = async () => {
    setBusy("saving-profile");
    setNotice("");
    try {
      const sessionId = await ensureSession();
      const updated = await enterprisePost<ChatSession>(`/ai/chat/sessions/${sessionId}/profile`, {
        persona,
        locale,
        promptPresetId,
        sourceIds: selectedSourceIds,
      });

      setSessions((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setActiveSessionId(updated.id);
      setNotice(
        text(
          "AI 会话配置已保存。后续对话和正式分析都会沿用当前身份、语言、提示词预设和数据源。",
          "AI session profile saved. Future chats and formal analyses will use the selected audience, locale, prompt preset, and sources.",
        ),
      );
    } catch (error) {
      setNotice(enterpriseErrorMessage(error, text("保存 AI 会话配置失败。", "Failed to save the AI session profile.")));
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
      const reply = await enterprisePost<ChatMessage[]>(`/ai/chat/sessions/${sessionId}/messages`, {
        content: prompt,
        verbosity,
        providerId,
        promptPresetId,
        persona,
        locale,
      });

      setMessages(reply);
      setActiveSessionId(sessionId);
      const refreshedSessions = await enterpriseGet<ChatSession[]>("/ai/chat/sessions");
      setSessions(refreshedSessions);
      setNotice(text("真实对话已发送，结果来自后端分析链路。", "Chat request sent through the real backend analysis pipeline."));
    } catch (error) {
      setNotice(
        enterpriseErrorMessage(
          error,
          text("发送对话失败，请检查模型服务和后端状态。", "Failed to send the chat request. Check the provider and backend state."),
        ),
      );
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
      setNotice(text("正式分析已创建，可前往报告中心导出结果。", "Formal analysis created. You can continue in the Report Center to export results."));
    } catch (error) {
      setNotice(enterpriseErrorMessage(error, text("创建正式分析失败。", "Failed to create the formal analysis.")));
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
    setSelectedSourceIds((current) => (current.includes(sourceId) ? current.filter((item) => item !== sourceId) : [...current, sourceId]));
  };

  useEffect(() => {
    setExpandedMessages({});
  }, [activeSessionId]);

  useEffect(() => {
    setMessagePage(Math.max(0, getPageCount(messages.length, 8) - 1));
  }, [messages.length]);

  const handleAction = (action: AssistantAction) => {
    if (!action.target.startsWith("/")) {
      setNotice(text(`当前不支持动作目标 "${action.target}"。`, `Action target "${action.target}" is not supported yet.`));
      return;
    }

    const query = new URLSearchParams(action.payload ?? {});
    router.push(query.size ? `${action.target}?${query.toString()}` : action.target);
  };

  if (!ready) {
    return (
      <PageLoadFallback
        fallbackHref="/workspace"
        title={text("正在加载 AI 助手", "Loading AI Assistant")}
        description={text("正在校验会话并准备对话、数据源与模型服务布局...", "Verifying the session and preparing chats, sources, and provider layout...")}
      />
    );
  }

  return (
    <div className="enterprise-shell ai-assistant-shell">
      <BackButton fallbackHref="/workspace" />

      <section className="ai-assistant-topbar">
        <div className="ai-assistant-topbar-copy">
          <span className="eyebrow">{text("AI 助手", "AI Assistant")}</span>
          <h1>{text("Codex 风格对话工作台", "Codex-style conversation workspace")}</h1>
          <p>
            {text(
              "把会话、上下文和执行动作收在同一屏里，主区域专注消息流本身，侧栏负责切换会话、数据源和模型服务。",
              "Keep sessions, context, and execution controls inside one workspace, with the main area focused on the message stream and the sidebars handling sessions, sources, and providers.",
            )}
          </p>
        </div>

        <div className="ai-assistant-topbar-meta">
          <span className="enterprise-chip enterprise-chip-static">{selectedPreset?.name ?? text("未选择预设", "No preset selected")}</span>
          <span className="enterprise-chip enterprise-chip-static">
            {selectedProvider
              ? `${selectedProvider.chatModel}${providerHasCredential ? "" : ` · ${text("缺少 Key", "Missing key")}`}`
              : text("未选择模型", "No provider")}
          </span>
          <span className="enterprise-chip enterprise-chip-static">{text("会话", "Sessions")} {sessions.length}</span>
          <span className="enterprise-chip enterprise-chip-static">{text("数据源", "Sources")} {selectedSourceIds.length}</span>
          <span className="enterprise-chip enterprise-chip-static">{text("身份", "Audience")} {personaOptions.find((item) => item.value === persona)?.label}</span>
        </div>
      </section>

      <section className="enterprise-hero ai-assistant-hero">
        <div className="ai-assistant-hero-copy">
          <span className="eyebrow">{text("AI 助手", "AI Assistant")}</span>
          <h1>{text("面向真实工业数据的分析工作台", "A production-grade workspace for real industrial analysis")}</h1>
          <p>
            {text(
              "这里直接读取后端维护的提示词预设、数据源、会话和分析任务，并通过真实的 OpenAI 兼容服务完成对话、意图路由和正式分析。",
              "This workspace reads prompt presets, sources, sessions, and analysis jobs from the backend, then uses a real OpenAI-compatible provider for chat, intent routing, and formal analysis.",
            )}
          </p>

          <div className="ai-assistant-status-strip">
            <span className="enterprise-chip enterprise-chip-static">{selectedPreset?.name ?? text("未选择提示词预设", "No prompt preset selected")}</span>
            <span className="enterprise-chip enterprise-chip-static">
              {selectedProvider
                ? `${selectedProvider.name} / ${selectedProvider.chatModel}${providerHasCredential ? "" : ` · ${text("缺少 API Key", "Missing API key")}`}`
                : text("未选择模型服务", "No provider selected")}
            </span>
            <span className="enterprise-chip enterprise-chip-static">
              {text("已选数据源", "Selected sources")} {selectedSourceIds.length}
            </span>
            <span className="enterprise-chip enterprise-chip-static">{text("当前身份", "Audience")} {personaOptions.find((item) => item.value === persona)?.label}</span>
          </div>
        </div>

        <div className="ai-assistant-hero-metrics">
          <MetricTile
            label={text("模型服务", "Providers")}
            value={providers.length}
            detail={providers.length ? text("已接入实时推理端点", "Live inference endpoints are available") : text("需要至少一个可用服务", "At least one provider is required")}
          />
          <MetricTile
            label={text("会话数", "Sessions")}
            value={sessions.length}
            detail={activeSession ? formatDateTime(activeSession.updatedAt, locale) : text("等待新会话", "Waiting for a new session")}
          />
          <MetricTile
            label={text("分析任务", "Analysis jobs")}
            value={analysisJobs.length}
            detail={latestAnalysis ? latestAnalysis.status : text("暂无正式分析", "No formal analysis yet")}
          />
          <MetricTile
            label={text("数据源", "Data sources")}
            value={selectedSourceIds.length}
            detail={selectedSources[0]?.name ?? text("尚未选中", "None selected")}
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
          <Card className="enterprise-side-card ai-assistant-card">
            <SectionHeader
              kicker={text("会话驾驶舱", "Session cockpit")}
              title={activeSession?.title ?? text("准备新的 AI 会话", "Prepare a new AI session")}
              caption={text("切换会话时，页面会同步对应的提示词预设、角色和数据源。", "Switching sessions also synchronizes the related preset, audience, and sources.")}
              aside={
                <button
                  type="button"
                  className="enterprise-secondary-button ai-assistant-inline-button"
                  disabled={busy !== "idle" || !canCreateSession}
                  onClick={() =>
                    createSession()
                      .then(() => setNotice(text("新会话已创建。", "New session created.")))
                      .catch((error) => setNotice(enterpriseErrorMessage(error, text("创建新会话失败。", "Failed to create a new session."))))
                  }
                >
                  {text("新会话", "New session")}
                </button>
              }
            />

            <div className="ai-assistant-summary-grid">
              <div className="enterprise-summary-tile">
                <span>{text("活跃会话", "Active session")}</span>
                <strong>{activeSession?.title ?? text("未开始", "Not started")}</strong>
              </div>
              <div className="enterprise-summary-tile">
                <span>{text("最近更新", "Last update")}</span>
                <strong>{activeSession ? formatDateTime(activeSession.updatedAt, locale) : text("等待输入", "Waiting for input")}</strong>
              </div>
            </div>

            <div className="ai-assistant-chat-stage">
              <span className="enterprise-chip enterprise-chip-static">{selectedPreset?.name ?? text("未选择预设", "No preset selected")}</span>
              <span className="enterprise-chip enterprise-chip-static">{selectedProvider?.chatModel ?? text("未选择模型", "No provider")}</span>
              <span className="enterprise-chip enterprise-chip-static">{text("数据源", "Sources")} {selectedSources.length}</span>
              <span className="enterprise-chip enterprise-chip-static">{personaOptions.find((item) => item.value === persona)?.label}</span>
            </div>

            <PaginatedBlockControls
              count={sessions.length}
              page={pagedSessions.safePage}
              pageCount={pagedSessions.pageCount}
              expanded={sessionsExpanded}
              onPrev={() => setSessionPage((current) => Math.max(0, current - 1))}
              onNext={() => setSessionPage((current) => Math.min(pagedSessions.pageCount - 1, current + 1))}
              onToggle={() => setSessionsExpanded((current) => !current)}
              text={text}
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
                      <span>{session.lastMessagePreview || text("尚无消息，已保存会话配置。", "No messages yet. Session profile is saved.")}</span>
                      <em className="ai-assistant-meta-line">
                        {formatDateTime(session.updatedAt, locale)} · {personaOptions.find((item) => item.value === session.persona)?.label ?? session.persona}
                      </em>
                    </button>
                  ))
                ) : (
                  <div className="enterprise-note-card ai-assistant-empty-card">
                    <strong>{text("还没有会话", "No session yet")}</strong>
                    <span>{text("先选定提示词预设和数据源，再创建会话保存工作上下文。", "Choose a preset and data sources first, then create a session to save the working context.")}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="ai-assistant-collapsed-note">{text("会话列表已折叠", "Session list collapsed")}</div>
            )}
          </Card>

          <Card className="enterprise-side-card ai-assistant-card">
            <SectionHeader
              kicker={text("提示词编排", "Prompt orchestration")}
              title={text("后端预设与场景模板", "Backend presets and scenario templates")}
              caption={text("提示词预设决定系统角色、目标风格和推荐模板。", "Prompt presets define the system role, objective framing, and recommended template.")}
            />

            <PaginatedBlockControls
              count={localizedPromptPresets.length}
              page={pagedPresets.safePage}
              pageCount={pagedPresets.pageCount}
              expanded={presetsExpanded}
              onPrev={() => setPresetPage((current) => Math.max(0, current - 1))}
              onNext={() => setPresetPage((current) => Math.min(pagedPresets.pageCount - 1, current + 1))}
              onToggle={() => setPresetsExpanded((current) => !current)}
              text={text}
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
                      {text("推荐模板", "Recommended template")} · {preset.recommendedTemplate}
                    </em>
                  </button>
                ))}
              </div>
            ) : (
              <div className="ai-assistant-collapsed-note">{text("提示词预设已折叠", "Prompt preset list collapsed")}</div>
            )}
          </Card>

          <Card className="enterprise-side-card ai-assistant-card">
            <SectionHeader
              kicker={text("数据上下文", "Data context")}
              title={text("选择进入分析链路的数据源", "Select sources for the analysis chain")}
              caption={text("至少选择一个数据源，正式分析会继承这里的上下文。", "Select at least one data source. Formal analyses inherit the exact context chosen here.")}
            />

            <PaginatedBlockControls
              count={sources.length}
              page={pagedSources.safePage}
              pageCount={pagedSources.pageCount}
              expanded={sourcesExpanded}
              onPrev={() => setSourcePage((current) => Math.max(0, current - 1))}
              onNext={() => setSourcePage((current) => Math.min(pagedSources.pageCount - 1, current + 1))}
              onToggle={() => setSourcesExpanded((current) => !current)}
              text={text}
            />

            {sourcesExpanded ? (
              <div className="enterprise-card-stack ai-assistant-scroll-stack">
                {sources.length ? (
                  pagedSources.items.map((source) => {
                  const active = selectedSourceIds.includes(source.id);
                  const findings = splitMetaList(source.connectionMeta?.qualityFindings);
                  const summary =
                    source.connectionMeta?.analysisSummary ??
                    findings[0] ??
                    text("数据源已完成 profiling，可直接用于 AI 分析。", "Source profiling is complete and ready for AI analysis.");

                  return (
                      <button
                        key={source.id}
                        type="button"
                        className={`enterprise-source-card ${active ? "enterprise-source-card-active" : ""}`}
                        onClick={() => toggleSource(source.id)}
                      >
                        <strong>{source.name}</strong>
                        <span>{`${(source.type ?? "source").toUpperCase()} · ${text("质量等级", "Grade")} ${source.qualityScore ?? "-"} · ${source.rowCount ?? 0} ${text("行", "rows")}`}</span>
                        <em className="ai-assistant-meta-line">{summary}</em>
                      </button>
                  );
                  })
                ) : (
                  <div className="enterprise-note-card ai-assistant-empty-card">
                    <strong>{text("暂无数据源", "No data source yet")}</strong>
                    <span>{text("请先到 Data Hub 导入并完成 profiling，再回到这里发起 AI 分析。", "Add and profile sources in the Data Hub, then come back here to run AI analysis.")}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="ai-assistant-collapsed-note">{text("数据源列表已折叠", "Source list collapsed")}</div>
            )}
          </Card>
        </div>

        <div className="ai-assistant-column ai-assistant-column-main">
          <Card className="enterprise-main-card ai-assistant-card ai-assistant-workspace-card">
            <SectionHeader
              kicker={text("工作台", "Workspace")}
              title={text("对话、配置与正式分析", "Chat, configuration, and formal analysis")}
              caption={text("先保存 AI 会话配置，再发起对话或创建正式分析，可避免上下文漂移。", "Save the AI session profile before sending chat or creating a formal analysis to keep the context aligned.")}
            />

            <div className="ai-assistant-composer-meta">
              <span className="enterprise-chip enterprise-chip-static">
                {text("预设", "Preset")} {selectedPreset?.name ?? text("未选择", "None")}
              </span>
              <span className="enterprise-chip enterprise-chip-static">
                {text("数据源", "Sources")} {selectedSources.length}
              </span>
              <span className="enterprise-chip enterprise-chip-static">
                {text("模型", "Model")} {selectedProvider?.chatModel ?? text("未配置", "Unset")}
              </span>
            </div>

            <details className="ai-assistant-composer-details">
              <summary>{text("展开会话设置", "Expand session controls")}</summary>
              <div className="enterprise-form-grid ai-assistant-form-grid">
              <label>
                <span>{text("目标身份", "Audience")}</span>
                <select value={persona} onChange={(event) => setPersona(event.target.value)}>
                  {personaOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{text("说明深度", "Verbosity")}</span>
                <select value={verbosity} onChange={(event) => setVerbosity(event.target.value)}>
                  {verbosityOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{text("分析模板", "Analysis template")}</span>
                <select value={template} onChange={(event) => setTemplate(event.target.value)}>
                  {analysisTemplates.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{text("模型服务", "Provider")}</span>
                <select value={providerId} onChange={(event) => selectProviderForEditing(event.target.value)}>
                  <option value="">{text("请选择模型服务", "Select a provider")}</option>
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
                <strong>{text("当前提示词预设", "Current prompt preset")}</strong>
                <span>{selectedPreset?.objective ?? text("请选择一个后端提示词预设。", "Choose a backend prompt preset.")}</span>
              </div>
              <div className="enterprise-note-card">
                <strong>{text("当前数据上下文", "Current data context")}</strong>
                <span>
                  {selectedSources.length
                    ? selectedSources.map((item) => item.name).join(" / ")
                    : text("尚未选择数据源。", "No source is selected yet.")}
                </span>
              </div>
            </div>
            </details>

            <label className="ai-assistant-prompt-block">
              <span>{text("分析请求", "Analysis request")}</span>
              <textarea className="enterprise-textarea ai-assistant-prompt" value={prompt} onChange={(event) => setPrompt(event.target.value)} />
            </label>

            {actionHint ? <div className="panel-caption ai-assistant-action-hint">{actionHint}</div> : null}

            <div className="enterprise-action-row ai-assistant-composer-actions">
              <button type="button" className="enterprise-secondary-button" disabled={busy !== "idle" || !canCreateSession} onClick={handleSaveProfile}>
                {busy === "saving-profile" ? text("保存中...", "Saving...") : text("保存 AI 配置", "Save AI profile")}
              </button>
              <button type="button" className="enterprise-primary-button" disabled={busy !== "idle" || !canSend} onClick={handleSendChat}>
                {busy === "sending" ? text("发送中...", "Sending...") : text("发送对话", "Send chat")}
              </button>
              <button type="button" className="enterprise-secondary-button" disabled={busy !== "idle" || !canSend} onClick={handleCreateAnalysis}>
                {busy === "analyzing" ? text("分析中...", "Analyzing...") : text("创建正式分析", "Create formal analysis")}
              </button>
            </div>
          </Card>

          <Card className="enterprise-main-card ai-assistant-card ai-assistant-chat-card">
            <SectionHeader
              kicker={text("对话时间线", "Conversation timeline")}
              title={activeSession?.title ?? text("等待首条请求", "Waiting for the first request")}
              caption={text("这里展示真实往返消息、来源引用、意图判断和可执行动作。", "This timeline shows real messages, source references, intent classification, and executable actions.")}
              aside={
                activeSession ? (
                  <span className="enterprise-chip enterprise-chip-static">{formatDateTime(activeSession.updatedAt, locale)}</span>
                ) : null
              }
            />

            <div className="ai-assistant-chat-stage">
              <span className="enterprise-chip enterprise-chip-static">{selectedPreset?.name ?? text("未选择预设", "No preset selected")}</span>
              <span className="enterprise-chip enterprise-chip-static">{selectedProvider?.chatModel ?? text("未选择模型", "No provider")}</span>
              <span className="enterprise-chip enterprise-chip-static">{text("数据源", "Sources")} {selectedSources.length}</span>
              <span className="enterprise-chip enterprise-chip-static">{personaOptions.find((item) => item.value === persona)?.label}</span>
            </div>

            <PaginatedBlockControls
              count={messages.length}
              page={pagedMessages.safePage}
              pageCount={pagedMessages.pageCount}
              expanded={messagesExpanded}
              onPrev={() => setMessagePage((current) => Math.max(0, current - 1))}
              onNext={() => setMessagePage((current) => Math.min(pagedMessages.pageCount - 1, current + 1))}
              onToggle={() => setMessagesExpanded((current) => !current)}
              text={text}
            />

            {messagesExpanded ? (
              <div className="ai-assistant-message-list">
                {messages.length ? (
                  pagedMessages.items.map((item) => {
                    const collapsible = shouldCollapseMessage(item);
                    const expanded = expandedMessages[item.id] ?? !collapsible;
                    const preview = expanded ? item.content : buildMessagePreview(item.content);
                    const hasDetails = Boolean(
                      safeArray(item.sourceRefs).length ||
                      item.promptTokens ||
                      item.completionTokens ||
                      item.intentAssessment ||
                      safeArray(item.actions).length,
                    );

                    return (
                      <article key={item.id} className={`ai-assistant-message ai-assistant-message-${item.role}`}>
                        <div className="ai-assistant-message-head">
                          <strong>{item.role === "assistant" ? text("助手", "Assistant") : text("用户", "User")}</strong>
                          <span>{formatDateTime(item.createdAt, locale)}</span>
                        </div>

                        <div className={`ai-assistant-message-body ${expanded ? "" : "ai-assistant-message-body-collapsed"}`}>{preview}</div>

                        {collapsible ? (
                          <div className="ai-assistant-message-toolbar">
                            <button
                              type="button"
                              className="enterprise-secondary-button ai-assistant-mini-button"
                              onClick={() => toggleMessageExpansion(item.id)}
                            >
                              {expanded ? text("收起正文", "Collapse reply") : text("展开全文", "Expand reply")}
                            </button>
                          </div>
                        ) : null}

                        {hasDetails ? (
                          <details className="ai-assistant-message-details">
                            <summary>{text("查看来源、tokens 与动作", "View sources, tokens, and actions")}</summary>

                            <div className="ai-assistant-message-meta">
                              {safeArray(item.sourceRefs).length ? <span>{text("引用来源", "Source refs")} {safeArray(item.sourceRefs).length}</span> : null}
                              {item.promptTokens ? <span>Prompt {item.promptTokens}</span> : null}
                              {item.completionTokens ? <span>Completion {item.completionTokens}</span> : null}
                              {item.intentAssessment ? <span>{item.intentAssessment.suggestedTemplate}</span> : null}
                            </div>

                            {safeArray(item.actions).length ? (
                              <div className="ai-assistant-inline-actions">
                                {safeArray(item.actions).map((action) => (
                                  <button key={action.id} type="button" className="enterprise-list-item ai-assistant-action-chip" onClick={() => handleAction(action)}>
                                    <strong>{action.label}</strong>
                                    <span>
                                      {action.type} · {text("置信度", "Confidence")} {(action.confidence * 100).toFixed(0)}%
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
                    <strong>{text("还没有对话记录", "No conversation yet")}</strong>
                    <span>{text("保存当前会话配置后，发送一条真实请求，这里就会显示完整聊天时间线。", "Save the current session profile and send a real request to populate the timeline.")}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="ai-assistant-collapsed-note">{text("对话时间线已折叠", "Conversation timeline collapsed")}</div>
            )}
          </Card>
        </div>

        <div className="ai-assistant-column ai-assistant-column-side">
          <Card className="enterprise-side-card ai-assistant-card">
            <SectionHeader
              kicker={text("意图与动作", "Intent and actions")}
              title={text("后端返回的下一步路由", "Backend-returned next-step routing")}
              caption={text("最新的助手回复或正式分析结果会在这里汇总决策建议。", "The latest assistant reply or formal analysis result is summarized here for the next operational move.")}
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
              onPrev={() => setActionPage((current) => Math.max(0, current - 1))}
              onNext={() => setActionPage((current) => Math.min(pagedActions.pageCount - 1, current + 1))}
              onToggle={() => setActionsExpanded((current) => !current)}
              text={text}
            />

            {actionsExpanded ? (
              <div className="enterprise-card-stack">
                {suggestedActions.length ? (
                  pagedActions.items.map((action) => (
                    <button key={action.id} type="button" className="enterprise-list-item" onClick={() => handleAction(action)}>
                      <strong>{action.label}</strong>
                      <span>
                        {action.type} · {action.target} · {text("置信度", "Confidence")} {(action.confidence * 100).toFixed(0)}%
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="enterprise-note-card ai-assistant-empty-card">
                    <strong>{text("暂无动作", "No action yet")}</strong>
                    <span>{text("发送真实对话后，这里会显示可以直接跳转执行的下一步动作。", "After a real AI response, direct next-step actions will appear here.")}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="ai-assistant-collapsed-note">{text("动作路由列表已折叠", "Action routing list collapsed")}</div>
            )}
          </Card>

          <Card className="enterprise-side-card ai-assistant-card">
            <SectionHeader
              kicker={text("正式分析", "Formal analysis")}
              title={text("最新结果与作业队列", "Latest result and job queue")}
              caption={text("正式分析会写入后端任务列表，并可在 Report Center 中导出工件。", "Formal analyses are stored as backend jobs and can be exported from the Report Center.")}
              aside={
                <button type="button" className="enterprise-secondary-button ai-assistant-inline-button" onClick={() => router.push("/reports")}>
                  {text("打开报告中心", "Open Report Center")}
                </button>
              }
            />

            {latestAnalysisResult ? (
              <div className="enterprise-note-card">
                <strong>{latestAnalysisResult.headline || text("最新分析结果", "Latest analysis result")}</strong>
                <span>{latestAnalysisResult.summary || text("分析已完成，但结果摘要暂未返回。", "The analysis finished, but no summary was returned.")}</span>
                <div className="ai-assistant-message-meta">
                  <span className={`ai-assistant-tone-pill ai-assistant-tone-${getRiskTone(latestAnalysisResult.riskLevel)}`}>
                    {text("风险", "Risk")} {latestAnalysisResult.riskLevel || text("未标记", "Not tagged")}
                  </span>
                  <span>{text("置信度", "Confidence")} {typeof latestAnalysisResult.confidence === "number" ? `${(latestAnalysisResult.confidence * 100).toFixed(0)}%` : "--"}</span>
                  <span>{latestAnalysisResult.tokenUsage?.totalTokens ?? 0} tokens</span>
                </div>
              </div>
            ) : (
              <div className="enterprise-note-card ai-assistant-empty-card">
                <strong>{text("暂无正式分析", "No formal analysis yet")}</strong>
                <span>{text("填写请求后点击“创建正式分析”，结果会同步写入报告中心。", "Fill the request and click “Create formal analysis” to push results into the Report Center.")}</span>
              </div>
            )}

            <PaginatedBlockControls
              count={analysisJobs.length}
              page={pagedAnalysis.safePage}
              pageCount={pagedAnalysis.pageCount}
              expanded={analysisExpanded}
              onPrev={() => setAnalysisPage((current) => Math.max(0, current - 1))}
              onNext={() => setAnalysisPage((current) => Math.min(pagedAnalysis.pageCount - 1, current + 1))}
              onToggle={() => setAnalysisExpanded((current) => !current)}
              text={text}
            />

            {analysisExpanded ? (
              <div className="enterprise-card-stack">
                {pagedAnalysis.items.map((job) => (
                  <div key={job.id} className="enterprise-list-item">
                    <strong>{job.result?.headline ?? job.template}</strong>
                    <span>{job.template} · {job.status} · {formatDateTime(job.updatedAt, locale)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ai-assistant-collapsed-note">{text("分析队列已折叠", "Analysis queue collapsed")}</div>
            )}
          </Card>

          <Card className="enterprise-side-card ai-assistant-card">
            <SectionHeader
              kicker={text("模型服务配置", "Provider configuration")}
              title={text("端点、模型与系统提示词", "Endpoint, model, and system prompt")}
              caption={text("只有管理员和工程师可以新增或维护模型服务。其他角色仍可直接使用已配置服务。", "Only admins and engineers can create or maintain providers. Other roles can still use configured providers.")}
            />

            <PaginatedBlockControls
              count={providers.length}
              page={pagedProviders.safePage}
              pageCount={pagedProviders.pageCount}
              expanded={providersExpanded}
              onPrev={() => setProviderPage((current) => Math.max(0, current - 1))}
              onNext={() => setProviderPage((current) => Math.min(pagedProviders.pageCount - 1, current + 1))}
              onToggle={() => setProvidersExpanded((current) => !current)}
              text={text}
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
                      <span>{provider.chatModel} · {provider.embeddingModel}</span>
                      <em className="ai-assistant-meta-line">
                        {provider.apiKeyMasked?.trim()
                          ? provider.lastVerifiedAt
                            ? `${text("上次验证", "Last verified")} · ${formatDateTime(provider.lastVerifiedAt, locale)}`
                            : text("已配置密钥，尚未验证", "API key configured, not verified yet")
                          : text("未配置 API Key", "API key not configured")}
                      </em>
                    </button>
                  ))
                ) : (
                  <div className="enterprise-note-card ai-assistant-empty-card">
                    <strong>{text("还没有模型服务", "No provider yet")}</strong>
                    <span>{text("先保存一个 OpenAI 兼容服务，页面才能发起真实推理。", "Save an OpenAI-compatible provider before this page can run live inference.")}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="ai-assistant-collapsed-note">{text("模型服务列表已折叠", "Provider list collapsed")}</div>
            )}

            <div className="enterprise-form-grid ai-assistant-provider-grid">
              <label>
                <span>{text("名称", "Name")}</span>
                <input value={providerForm.name} onChange={(event) => setProviderForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label>
                <span>Base URL</span>
                <input value={providerForm.baseUrl} onChange={(event) => setProviderForm((current) => ({ ...current, baseUrl: event.target.value }))} />
              </label>
              <label>
                <span>API Key</span>
                <input
                  type="password"
                  autoComplete="off"
                  value={providerForm.apiKey}
                  onChange={(event) => setProviderForm((current) => ({ ...current, apiKey: event.target.value }))}
                />
              </label>
              <label>
                <span>{text("对话模型", "Chat model")}</span>
                <input value={providerForm.chatModel} onChange={(event) => setProviderForm((current) => ({ ...current, chatModel: event.target.value }))} />
              </label>
              <label>
                <span>{text("向量模型", "Embedding model")}</span>
                <input value={providerForm.embeddingModel} onChange={(event) => setProviderForm((current) => ({ ...current, embeddingModel: event.target.value }))} />
              </label>
            </div>

            <div className="panel-caption">
              {providerId
                ? text("当前正在编辑已选服务；如果不想改动密钥，可以让 API Key 输入框保持为空。", "You are editing the selected provider. Leave the API key blank to keep the stored secret.")
                : text("当前是新建模式；保存后会新增一个可测试的模型服务。", "You are creating a new provider. Saving will add a new provider entry.")}
            </div>

            <label className="ai-assistant-prompt-block">
              <span>{text("系统提示词", "System prompt")}</span>
              <textarea
                className="enterprise-textarea ai-assistant-provider-prompt"
                value={providerForm.systemPrompt}
                onChange={(event) => setProviderForm((current) => ({ ...current, systemPrompt: event.target.value }))}
              />
            </label>

            <div className="enterprise-action-row">
              <button type="button" className="enterprise-secondary-button" disabled={!canManageProviders || busy !== "idle"} onClick={handleCreateProvider}>
                {busy === "creating-provider" ? text("保存中...", "Saving...") : text("保存模型服务", "Save provider")}
              </button>
              <button type="button" className="enterprise-secondary-button" disabled={!canManageProviders || busy !== "idle"} onClick={startNewProviderDraft}>
                {text("新建服务草稿", "New provider draft")}
              </button>
              <button
                type="button"
                className="enterprise-secondary-button"
                disabled={!canManageProviders || !providerId || !providerHasCredential || busy !== "idle"}
                onClick={handleTestProvider}
              >
                {busy === "testing-provider" ? text("测试中...", "Testing...") : text("测试当前服务", "Test current provider")}
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
