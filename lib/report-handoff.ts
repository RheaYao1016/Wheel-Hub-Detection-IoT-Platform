export type ReportHandoffPayload = {
  from?: "assistant" | "workspace" | "reports";
  sessionId?: string;
  providerId?: string;
  promptPresetId?: string;
  sourceIds?: string[];
  prompt?: string;
  persona?: string;
  verbosity?: string;
  title?: string;
  summary?: string;
};

const REPORT_HANDOFF_KEYS = [
  "from",
  "sessionId",
  "providerId",
  "promptPresetId",
  "sourceIds",
  "prompt",
  "persona",
  "verbosity",
  "title",
  "summary",
] as const;

function compactText(value?: string, maxLength = 240) {
  if (!value) return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1)}…`
    : normalized;
}

export function buildReportHandoffSearch(payload: ReportHandoffPayload) {
  const params = new URLSearchParams();

  if (payload.from) params.set("from", payload.from);
  if (payload.sessionId) params.set("sessionId", payload.sessionId);
  if (payload.providerId) params.set("providerId", payload.providerId);
  if (payload.promptPresetId) params.set("promptPresetId", payload.promptPresetId);
  if (payload.sourceIds?.length) params.set("sourceIds", payload.sourceIds.join(","));
  if (payload.prompt) params.set("prompt", compactText(payload.prompt, 400));
  if (payload.persona) params.set("persona", payload.persona);
  if (payload.verbosity) params.set("verbosity", payload.verbosity);
  if (payload.title) params.set("title", compactText(payload.title, 120));
  if (payload.summary) params.set("summary", compactText(payload.summary, 220));

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function parseReportHandoffSearch(search: URLSearchParams): ReportHandoffPayload | null {
  const hasKnownValue = REPORT_HANDOFF_KEYS.some((key) => search.get(key));
  if (!hasKnownValue) {
    return null;
  }

  const sourceIds = search
    .get("sourceIds")
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    from: (search.get("from") as ReportHandoffPayload["from"]) ?? undefined,
    sessionId: search.get("sessionId") ?? undefined,
    providerId: search.get("providerId") ?? undefined,
    promptPresetId: search.get("promptPresetId") ?? undefined,
    sourceIds: sourceIds?.length ? sourceIds : undefined,
    prompt: search.get("prompt") ?? undefined,
    persona: search.get("persona") ?? undefined,
    verbosity: search.get("verbosity") ?? undefined,
    title: search.get("title") ?? undefined,
    summary: search.get("summary") ?? undefined,
  };
}
