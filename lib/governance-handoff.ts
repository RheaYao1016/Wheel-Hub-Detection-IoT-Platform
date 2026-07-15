export type GovernanceHandoffPayload = {
  from?: "reports" | "workspace";
  jobId?: string;
  reportId?: string;
  riskLevel?: string;
  headline?: string;
  summary?: string;
};

function compactText(value?: string, maxLength = 220) {
  if (!value) return "";
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength - 1)}…`
    : normalized;
}

export function buildGovernanceHandoffSearch(payload: GovernanceHandoffPayload) {
  const params = new URLSearchParams();

  if (payload.from) params.set("from", payload.from);
  if (payload.jobId) params.set("jobId", payload.jobId);
  if (payload.reportId) params.set("reportId", payload.reportId);
  if (payload.riskLevel) params.set("riskLevel", payload.riskLevel);
  if (payload.headline) params.set("headline", compactText(payload.headline, 120));
  if (payload.summary) params.set("summary", compactText(payload.summary, 260));

  const query = params.toString();
  return query ? `?${query}` : "";
}

export function parseGovernanceHandoffSearch(search: URLSearchParams): GovernanceHandoffPayload | null {
  const from = search.get("from") ?? undefined;
  const jobId = search.get("jobId") ?? undefined;
  const reportId = search.get("reportId") ?? undefined;
  const riskLevel = search.get("riskLevel") ?? undefined;
  const headline = search.get("headline") ?? undefined;
  const summary = search.get("summary") ?? undefined;

  if (!from && !jobId && !reportId && !riskLevel && !headline && !summary) {
    return null;
  }

  return {
    from: from as GovernanceHandoffPayload["from"],
    jobId,
    reportId,
    riskLevel,
    headline,
    summary,
  };
}
