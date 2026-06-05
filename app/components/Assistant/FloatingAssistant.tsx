"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import DOMPurify from "dompurify";
import { readStoredAuthSession } from "@/lib/auth-session";
import {
  enterpriseErrorMessage,
  enterpriseGet,
  enterprisePost,
} from "@/lib/enterprise-client";
import type {
  AiAssistantSettings,
  AiIndexEntry,
  AiProviderProfile,
  AssistantAction,
  ChatMessage,
  ChatSession,
  DataSourceProfile,
  PromptPreset,
} from "@/types/enterprise";

type BusyState = "idle" | "loading" | "sending" | "saving";
type ActiveTab = "chat" | "indexes" | "settings";

const STORAGE_KEY = "floating-ai-open";

const ALLOWED_HTML_TAGS = [
  "b", "i", "em", "strong", "a", "p", "br",
  "ul", "ol", "li", "code", "pre",
  "h1", "h2", "h3", "h4", "h5", "h6",
];

function sanitizeHtml(content: string): string {
  return DOMPurify.sanitize(content, { ALLOWED_TAGS: ALLOWED_HTML_TAGS });
}

function asArray<T>(value: T[] | null | undefined) {
  return Array.isArray(value) ? value : [];
}

function buildQuery(params: Record<string, string>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });
  return query.toString();
}

function formatTime(value?: string) {
  if (!value) return "刚刚";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function FloatingAssistant() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<ActiveTab>("chat");
  const [busy, setBusy] = useState<BusyState>("idle");
  const [notice, setNotice] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  const [providers, setProviders] = useState<AiProviderProfile[]>([]);
  const [promptPresets, setPromptPresets] = useState<PromptPreset[]>([]);
  const [sources, setSources] = useState<DataSourceProfile[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [indexes, setIndexes] = useState<AiIndexEntry[]>([]);
  const [settings, setSettings] = useState<AiAssistantSettings | null>(null);

  const [providerId, setProviderId] = useState("");
  const [promptPresetId, setPromptPresetId] = useState("");
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [persona, setPersona] = useState("operator");
  const [verbosity, setVerbosity] = useState("standard");
  const [prompt, setPrompt] = useState("");
  const [indexKeyword, setIndexKeyword] = useState("");
  const [windowDays, setWindowDays] = useState(183);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setOpen(window.localStorage.getItem(STORAGE_KEY) === "open");
    setHasSession(Boolean(readStoredAuthSession()));

    const syncSession = () => {
      setHasSession(Boolean(readStoredAuthSession()));
    };

    window.addEventListener("storage", syncSession);
    window.addEventListener("app:role-change", syncSession as EventListener);
    return () => {
      window.removeEventListener("storage", syncSession);
      window.removeEventListener("app:role-change", syncSession as EventListener);
    };
  }, []);

  const filteredIndexes = useMemo(() => {
    const keyword = indexKeyword.trim().toLowerCase();
    if (!keyword) {
      return indexes.slice(0, 36);
    }
    return indexes
      .filter((item) =>
        [
          item.indexId,
          item.label,
          item.route,
          item.category,
          item.type,
          ...asArray(item.tags),
        ]
          .join(" ")
          .toLowerCase()
          .includes(keyword),
      )
      .slice(0, 48);
  }, [indexKeyword, indexes]);

  const selectedProvider = useMemo(
    () => providers.find((item) => item.id === providerId) ?? null,
    [providers, providerId],
  );

  const latestMessage = useMemo(
    () => [...messages].reverse().find((item) => item.role === "assistant") ?? null,
    [messages],
  );

  const latestIndexes = latestMessage?.protocol?.indexIds ?? [];

  const loadData = useCallback(async () => {
    setBusy("loading");
    setNotice("");
    try {
      const [
        providerData,
        presetData,
        sourceData,
        sessionData,
        settingsData,
        indexData,
      ] = await Promise.all([
        enterpriseGet<AiProviderProfile[]>("/ai/providers"),
        enterpriseGet<PromptPreset[]>("/ai/prompt-presets"),
        enterpriseGet<DataSourceProfile[]>("/data-sources"),
        enterpriseGet<ChatSession[]>("/ai/chat/sessions"),
        enterpriseGet<AiAssistantSettings>("/ai/assistant/settings"),
        enterpriseGet<AiIndexEntry[]>("/ai/indexes"),
      ]);

      setProviders(providerData);
      setPromptPresets(presetData);
      setSources(sourceData);
      setSessions(sessionData);
      setSettings(settingsData);
      setIndexes(indexData);
      setWindowDays(settingsData.indexWindowDays);

      if (!providerId && providerData[0]) {
        setProviderId(providerData[0].id);
      }
      if (!promptPresetId && presetData[0]) {
        setPromptPresetId(presetData[0].id);
      }
      if (!selectedSourceIds.length && sourceData[0]) {
        setSelectedSourceIds([sourceData[0].id]);
      }
      if (!activeSessionId && sessionData[0]) {
        setActiveSessionId(sessionData[0].id);
        const sessionMessages = await enterpriseGet<ChatMessage[]>(
          `/ai/chat/sessions/${sessionData[0].id}`,
        );
        setMessages(sessionMessages);
      }

      setLoaded(true);
    } catch (error) {
      setNotice(enterpriseErrorMessage(error, "加载 AI 助手数据失败。"));
    } finally {
      setBusy("idle");
    }
  }, [activeSessionId, providerId, promptPresetId, selectedSourceIds]);

  useEffect(() => {
    if (!open || loaded || !hasSession || pathname === "/login") {
      return;
    }
    void loadData();
  }, [open, loaded, hasSession, pathname, loadData]);

  async function ensureSession() {
    if (activeSessionId) {
      await enterprisePost<ChatSession>(
        `/ai/chat/sessions/${activeSessionId}/profile`,
        {
          persona,
          locale: "zh-CN",
          promptPresetId,
          sourceIds: selectedSourceIds,
        },
      );
      return activeSessionId;
    }

    const session = await enterprisePost<ChatSession>("/ai/chat/sessions", {
      title: `悬浮助手会话 ${sessions.length + 1}`,
      persona,
      locale: "zh-CN",
      promptPresetId,
      sourceIds: selectedSourceIds,
    });
    setSessions((current) => [session, ...current]);
    setActiveSessionId(session.id);
    return session.id;
  }

  async function handleSend() {
    if (!prompt.trim() || !providerId || !promptPresetId || !selectedSourceIds.length) {
      setNotice("请先选择数据源、模型提供商并输入问题。");
      return;
    }

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
          locale: "zh-CN",
        },
      );

      setMessages(reply);
      setPrompt("");
      setActiveSessionId(sessionId);
      const refreshedSessions = await enterpriseGet<ChatSession[]>("/ai/chat/sessions");
      setSessions(refreshedSessions);
      const refreshedIndexes = await enterpriseGet<AiIndexEntry[]>(
        `/ai/indexes?windowDays=${windowDays}`,
      );
      setIndexes(refreshedIndexes);
    } catch (error) {
      setNotice(enterpriseErrorMessage(error, "发送消息失败。"));
    } finally {
      setBusy("idle");
    }
  }

  async function saveSettings() {
    setBusy("saving");
    setNotice("");
    try {
      const saved = await enterprisePost<AiAssistantSettings>("/ai/assistant/settings", {
        indexWindowDays: windowDays,
      });
      setSettings(saved);
      const refreshedIndexes = await enterpriseGet<AiIndexEntry[]>(
        `/ai/indexes?windowDays=${saved.indexWindowDays}`,
      );
      setIndexes(refreshedIndexes);
      setNotice("设置已保存，索引窗口已更新。");
    } catch (error) {
      setNotice(enterpriseErrorMessage(error, "保存设置失败。"));
    } finally {
      setBusy("idle");
    }
  }

  async function openSession(sessionId: string) {
    setActiveSessionId(sessionId);
    try {
      const session = sessions.find((item) => item.id === sessionId);
      if (session) {
        setPersona(session.persona);
        setPromptPresetId(session.promptPresetId);
        setSelectedSourceIds(asArray(session.sourceIds));
      }
      const sessionMessages = await enterpriseGet<ChatMessage[]>(
        `/ai/chat/sessions/${sessionId}`,
      );
      setMessages(sessionMessages);
    } catch (error) {
      setNotice(enterpriseErrorMessage(error, "加载会话失败。"));
    }
  }

  function handleAction(action: AssistantAction) {
    const indexId = action.payload?.ai_index ?? action.payload?.indexId ?? "";
    const label = action.label;
    const query = buildQuery({
      ...(action.payload ?? {}),
      ai_index: indexId,
      ai_label: label,
    });
    router.push(query ? `${action.target}?${query}` : action.target);
    setOpen(false);
  }

  function openIndex(item: AiIndexEntry) {
    const query = buildQuery({
      ai_index: item.indexId,
      ai_label: item.label,
    });
    router.push(query ? `${item.route}?${query}` : item.route);
    setOpen(false);
  }

  function toggleSource(sourceId: string) {
    setSelectedSourceIds((current) =>
      current.includes(sourceId)
        ? current.filter((item) => item !== sourceId)
        : [...current, sourceId],
    );
  }

  function toggleOpen() {
    setOpen((current) => {
      const next = !current;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, next ? "open" : "closed");
      }
      return next;
    });
  }

  if (pathname === "/login" || !hasSession) {
    return null;
  }

  return (
    <aside className={`floating-ai ${open ? "floating-ai-open" : ""}`}>
      <button
        type="button"
        className="floating-ai-trigger"
        onClick={toggleOpen}
        aria-expanded={open}
      >
        <span className="floating-ai-trigger-dot" />
        <span>{open ? "收起 AI 助手" : "打开 AI 助手"}</span>
      </button>

      {open ? (
        <div className="floating-ai-panel">
          <div className="floating-ai-header">
            <div>
              <span className="floating-ai-kicker">AI 悬浮助手</span>
              <h2>边看页面边提问，边定位边操作</h2>
            </div>
            <div className="floating-ai-status">
              <span>{busy === "idle" ? "就绪" : "处理中"}</span>
              <span>{selectedProvider?.name ?? "未选提供商"}</span>
            </div>
          </div>

          <div className="floating-ai-tabs">
            {[
              { id: "chat", label: "对话" },
              { id: "indexes", label: "索引" },
              { id: "settings", label: "设置" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className={`floating-ai-tab ${tab === item.id ? "floating-ai-tab-active" : ""}`}
                onClick={() => setTab(item.id as ActiveTab)}
              >
                {item.label}
              </button>
            ))}
          </div>

          {notice ? <div className="floating-ai-notice">{notice}</div> : null}

          {tab === "chat" ? (
            <div className="floating-ai-body">
              <div className="floating-ai-toolbar">
                <select
                  value={providerId}
                  onChange={(event) => setProviderId(event.target.value)}
                >
                  {providers.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
                <select
                  value={promptPresetId}
                  onChange={(event) => setPromptPresetId(event.target.value)}
                >
                  {promptPresets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="floating-ai-source-list">
                {sources.slice(0, 6).map((source) => {
                  const active = selectedSourceIds.includes(source.id);
                  return (
                    <button
                      key={source.id}
                      type="button"
                      className={`floating-ai-source ${active ? "floating-ai-source-active" : ""}`}
                      onClick={() => toggleSource(source.id)}
                    >
                      <strong>{source.name}</strong>
                      <span>{source.type}</span>
                    </button>
                  );
                })}
              </div>

              <div className="floating-ai-session-strip">
                {sessions.slice(0, 5).map((session) => (
                  <button
                    key={session.id}
                    type="button"
                    className={`floating-ai-session ${activeSessionId === session.id ? "floating-ai-session-active" : ""}`}
                    onClick={() => void openSession(session.id)}
                  >
                    {session.title}
                  </button>
                ))}
              </div>

              <div className="floating-ai-message-list">
                {messages.length ? (
                  messages.slice(-10).map((item) => (
                    <article
                      key={item.id}
                      className={`floating-ai-message floating-ai-message-${item.role}`}
                    >
                      <div className="floating-ai-message-head">
                        <strong>{item.role === "assistant" ? "AI" : "你"}</strong>
                        <span>{formatTime(item.createdAt)}</span>
                      </div>
                      <p dangerouslySetInnerHTML={{ __html: sanitizeHtml(item.content) }} />
                      {item.protocol?.indexIds?.length ? (
                        <div className="floating-ai-chip-row">
                          {item.protocol.indexIds.map((indexId) => (
                            <span key={indexId} className="floating-ai-chip">
                              {indexId}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {asArray(item.actions).length ? (
                        <div className="floating-ai-action-row">
                          {item.actions.map((action) => (
                            <button
                              key={action.id}
                              type="button"
                              className="floating-ai-action"
                              onClick={() => handleAction(action)}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <div className="floating-ai-empty">
                    <strong>从当前页面直接发起 AI 对话</strong>
                    <span>AI 会返回带索引的结果，方便本地后端跳转和定位。</span>
                  </div>
                )}
              </div>

              {latestIndexes.length ? (
                <div className="floating-ai-latest-indexes">
                  <span>最近定位</span>
                  <div className="floating-ai-chip-row">
                    {latestIndexes.map((indexId) => (
                      <span key={indexId} className="floating-ai-chip">
                        {indexId}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <label className="floating-ai-input-shell">
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="例如：帮我找最近半年的训练数据，并定位到相关页面。"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                />
              </label>

              <div className="floating-ai-footer-bar">
                <div className="floating-ai-inline-fields">
                  <select value={persona} onChange={(event) => setPersona(event.target.value)}>
                    <option value="operator">操作员视角</option>
                    <option value="engineer">工程师视角</option>
                    <option value="manager">管理者视角</option>
                  </select>
                  <select
                    value={verbosity}
                    onChange={(event) => setVerbosity(event.target.value)}
                  >
                    <option value="brief">简洁</option>
                    <option value="standard">标准</option>
                    <option value="deep">深度</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="floating-ai-primary"
                  disabled={busy !== "idle"}
                  onClick={() => void handleSend()}
                >
                  {busy === "sending" ? "发送中..." : "发送"}
                </button>
              </div>
            </div>
          ) : null}

          {tab === "indexes" ? (
            <div className="floating-ai-body">
              <label className="floating-ai-search-shell">
                <input
                  value={indexKeyword}
                  onChange={(event) => setIndexKeyword(event.target.value)}
                  placeholder="搜索索引、页面、操作或标签"
                />
              </label>
              <div className="floating-ai-index-grid">
                {filteredIndexes.map((item) => (
                  <button
                    key={item.indexId}
                    type="button"
                    className="floating-ai-index-card"
                    onClick={() => openIndex(item)}
                  >
                    <strong>{item.label}</strong>
                    <span>{item.indexId}</span>
                    <em>
                      {item.route} | {item.operation}
                    </em>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {tab === "settings" ? (
            <div className="floating-ai-body">
              <div className="floating-ai-settings-grid">
                <label>
                  <span>索引时间窗口（天）</span>
                  <input
                    type="number"
                    min={1}
                    value={windowDays}
                    onChange={(event) => setWindowDays(Number(event.target.value) || 183)}
                  />
                </label>
                <label>
                  <span>默认提供商</span>
                  <select
                    value={providerId}
                    onChange={(event) => setProviderId(event.target.value)}
                  >
                    {providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>默认提示预设</span>
                  <select
                    value={promptPresetId}
                    onChange={(event) => setPromptPresetId(event.target.value)}
                  >
                    {promptPresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>当前会话数</span>
                  <input value={String(sessions.length)} disabled />
                </label>
              </div>

              <div className="floating-ai-settings-note">
                <strong>当前设置说明</strong>
                <span>
                  AI 默认只拿到最近 {settings?.indexWindowDays ?? windowDays} 天的索引目录，
                  这样可以减少上下文噪音，也能降低误定位概率。
                </span>
              </div>

              <button
                type="button"
                className="floating-ai-primary"
                disabled={busy !== "idle"}
                onClick={() => void saveSettings()}
              >
                {busy === "saving" ? "保存中..." : "保存设置"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
