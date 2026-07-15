"use client";

import { clearRuntimeCaches } from "@/lib/runtime-cache";

export const RUNTIME_API_BASE_STORAGE_KEY = "platform_api_base_url";
export const RUNTIME_PROVIDER_BASE_STORAGE_KEY = "platform_ai_provider_base_url";
export const RUNTIME_PROVIDER_CHAT_MODEL_STORAGE_KEY = "platform_ai_provider_chat_model";
export const RUNTIME_PROVIDER_EMBEDDING_MODEL_STORAGE_KEY = "platform_ai_provider_embedding_model";

export type RuntimeEndpointConfig = {
  apiBaseUrl: string;
  aiProviderBaseUrl: string;
  chatModel: string;
  embeddingModel: string;
};

const DEFAULT_BASE_PATH =
  process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") || "";
const CONFIGURED_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "";

function detectRuntimeBasePath() {
  if (DEFAULT_BASE_PATH) {
    return DEFAULT_BASE_PATH;
  }

  if (typeof window === "undefined") {
    return "";
  }

  const assetElements = [
    ...Array.from(document.querySelectorAll<HTMLScriptElement>('script[src*="/_next/"]')),
    ...Array.from(document.querySelectorAll<HTMLLinkElement>('link[href*="/_next/"]')),
  ];

  for (const element of assetElements) {
    const raw = "src" in element ? element.src : element.href;
    if (!raw) continue;

    try {
      const pathname = new URL(raw, window.location.origin).pathname;
      const markerIndex = pathname.indexOf("/_next/");
      if (markerIndex > 0) {
        return pathname.slice(0, markerIndex).replace(/\/$/, "");
      }
    } catch {
      continue;
    }
  }

  return "";
}

function getDefaultProxyApiBase() {
  const runtimeBasePath = detectRuntimeBasePath();
  return `${runtimeBasePath || ""}/api`;
}

function getAbsoluteSameOriginApiBase() {
  if (typeof window === "undefined") {
    return "";
  }

  const relativeBase = getDefaultProxyApiBase() || "/api";
  try {
    return new URL(relativeBase, window.location.origin).toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function getDefaultApiBaseUrl() {
  if (typeof window === "undefined") {
    return CONFIGURED_API_BASE || getDefaultProxyApiBase();
  }

  const sameOriginApiBase = getDefaultProxyApiBase() || "/api";
  if (!CONFIGURED_API_BASE) {
    return sameOriginApiBase;
  }

  const configuredIsLocalhost =
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(
      CONFIGURED_API_BASE,
    );
  const configuredIsCurrentOrigin = CONFIGURED_API_BASE.startsWith(
    window.location.origin,
  );

  if (configuredIsCurrentOrigin || !configuredIsLocalhost) {
    return CONFIGURED_API_BASE;
  }

  return sameOriginApiBase;
}

function createDefaultRuntimeEndpointConfig(): RuntimeEndpointConfig {
  return {
    apiBaseUrl: getDefaultApiBaseUrl(),
    aiProviderBaseUrl: "https://api.openai.com/v1",
    chatModel: "gpt-4o-mini",
    embeddingModel: "text-embedding-3-small",
  };
}

function normalizeUrl(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  if (!normalized) {
    return fallback;
  }

  return normalized.replace(/\/$/, "");
}

function normalizeText(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized || fallback;
}

export function readRuntimeEndpointConfig(): RuntimeEndpointConfig {
  const defaults = createDefaultRuntimeEndpointConfig();
  if (typeof window === "undefined") {
    return defaults;
  }

  return {
    apiBaseUrl: normalizeUrl(
      window.localStorage.getItem(RUNTIME_API_BASE_STORAGE_KEY),
      defaults.apiBaseUrl,
    ),
    aiProviderBaseUrl: normalizeUrl(
      window.localStorage.getItem(RUNTIME_PROVIDER_BASE_STORAGE_KEY),
      defaults.aiProviderBaseUrl,
    ),
    chatModel: normalizeText(
      window.localStorage.getItem(RUNTIME_PROVIDER_CHAT_MODEL_STORAGE_KEY),
      defaults.chatModel,
    ),
    embeddingModel: normalizeText(
      window.localStorage.getItem(RUNTIME_PROVIDER_EMBEDDING_MODEL_STORAGE_KEY),
      defaults.embeddingModel,
    ),
  };
}

export function saveRuntimeEndpointConfig(config: RuntimeEndpointConfig) {
  if (typeof window === "undefined") {
    return;
  }

  const defaults = createDefaultRuntimeEndpointConfig();
  const normalized = {
    apiBaseUrl: normalizeUrl(config.apiBaseUrl, defaults.apiBaseUrl),
    aiProviderBaseUrl: normalizeUrl(config.aiProviderBaseUrl, defaults.aiProviderBaseUrl),
    chatModel: normalizeText(config.chatModel, defaults.chatModel),
    embeddingModel: normalizeText(config.embeddingModel, defaults.embeddingModel),
  };

  window.localStorage.setItem(RUNTIME_API_BASE_STORAGE_KEY, normalized.apiBaseUrl);
  window.localStorage.setItem(RUNTIME_PROVIDER_BASE_STORAGE_KEY, normalized.aiProviderBaseUrl);
  window.localStorage.setItem(RUNTIME_PROVIDER_CHAT_MODEL_STORAGE_KEY, normalized.chatModel);
  window.localStorage.setItem(RUNTIME_PROVIDER_EMBEDDING_MODEL_STORAGE_KEY, normalized.embeddingModel);
  clearRuntimeCaches();
  window.dispatchEvent(new CustomEvent("app:endpoints-change", { detail: normalized }));
}

export function resetRuntimeEndpointConfig() {
  if (typeof window === "undefined") {
    return;
  }

  const defaults = createDefaultRuntimeEndpointConfig();

  window.localStorage.removeItem(RUNTIME_API_BASE_STORAGE_KEY);
  window.localStorage.removeItem(RUNTIME_PROVIDER_BASE_STORAGE_KEY);
  window.localStorage.removeItem(RUNTIME_PROVIDER_CHAT_MODEL_STORAGE_KEY);
  window.localStorage.removeItem(RUNTIME_PROVIDER_EMBEDDING_MODEL_STORAGE_KEY);
  clearRuntimeCaches();
  window.dispatchEvent(
    new CustomEvent("app:endpoints-change", {
      detail: defaults,
    }),
  );
}

export function getDefaultRuntimeEndpointConfig() {
  return createDefaultRuntimeEndpointConfig();
}

export function listRuntimeApiBaseCandidates() {
  const defaults = createDefaultRuntimeEndpointConfig();
  const candidates = [
    readRuntimeEndpointConfig().apiBaseUrl,
    defaults.apiBaseUrl,
    getDefaultProxyApiBase() || "/api",
    getAbsoluteSameOriginApiBase(),
    CONFIGURED_API_BASE,
  ];

  return [...new Set(candidates.map((value) => normalizeUrl(value, "")).filter(Boolean))];
}

export function rememberWorkingApiBase(apiBaseUrl: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeUrl(
    apiBaseUrl,
    createDefaultRuntimeEndpointConfig().apiBaseUrl,
  );
  if (!normalized) {
    return;
  }

  if (window.localStorage.getItem(RUNTIME_API_BASE_STORAGE_KEY) === normalized) {
    return;
  }

  window.localStorage.setItem(RUNTIME_API_BASE_STORAGE_KEY, normalized);
  clearRuntimeCaches();
  window.dispatchEvent(new CustomEvent("app:endpoints-change", {
    detail: {
      ...readRuntimeEndpointConfig(),
      apiBaseUrl: normalized,
    },
  }));
}
