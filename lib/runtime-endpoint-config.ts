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

const DEFAULT_RUNTIME_ENDPOINT_CONFIG: RuntimeEndpointConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:18081/api",
  aiProviderBaseUrl: "https://api.openai.com/v1",
  chatModel: "gpt-4o-mini",
  embeddingModel: "text-embedding-3-small",
};

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
  if (typeof window === "undefined") {
    return DEFAULT_RUNTIME_ENDPOINT_CONFIG;
  }

  return {
    apiBaseUrl: normalizeUrl(
      window.localStorage.getItem(RUNTIME_API_BASE_STORAGE_KEY),
      DEFAULT_RUNTIME_ENDPOINT_CONFIG.apiBaseUrl,
    ),
    aiProviderBaseUrl: normalizeUrl(
      window.localStorage.getItem(RUNTIME_PROVIDER_BASE_STORAGE_KEY),
      DEFAULT_RUNTIME_ENDPOINT_CONFIG.aiProviderBaseUrl,
    ),
    chatModel: normalizeText(
      window.localStorage.getItem(RUNTIME_PROVIDER_CHAT_MODEL_STORAGE_KEY),
      DEFAULT_RUNTIME_ENDPOINT_CONFIG.chatModel,
    ),
    embeddingModel: normalizeText(
      window.localStorage.getItem(RUNTIME_PROVIDER_EMBEDDING_MODEL_STORAGE_KEY),
      DEFAULT_RUNTIME_ENDPOINT_CONFIG.embeddingModel,
    ),
  };
}

export function saveRuntimeEndpointConfig(config: RuntimeEndpointConfig) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = {
    apiBaseUrl: normalizeUrl(config.apiBaseUrl, DEFAULT_RUNTIME_ENDPOINT_CONFIG.apiBaseUrl),
    aiProviderBaseUrl: normalizeUrl(config.aiProviderBaseUrl, DEFAULT_RUNTIME_ENDPOINT_CONFIG.aiProviderBaseUrl),
    chatModel: normalizeText(config.chatModel, DEFAULT_RUNTIME_ENDPOINT_CONFIG.chatModel),
    embeddingModel: normalizeText(config.embeddingModel, DEFAULT_RUNTIME_ENDPOINT_CONFIG.embeddingModel),
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

  window.localStorage.removeItem(RUNTIME_API_BASE_STORAGE_KEY);
  window.localStorage.removeItem(RUNTIME_PROVIDER_BASE_STORAGE_KEY);
  window.localStorage.removeItem(RUNTIME_PROVIDER_CHAT_MODEL_STORAGE_KEY);
  window.localStorage.removeItem(RUNTIME_PROVIDER_EMBEDDING_MODEL_STORAGE_KEY);
  clearRuntimeCaches();
  window.dispatchEvent(
    new CustomEvent("app:endpoints-change", {
      detail: DEFAULT_RUNTIME_ENDPOINT_CONFIG,
    }),
  );
}

export function getDefaultRuntimeEndpointConfig() {
  return DEFAULT_RUNTIME_ENDPOINT_CONFIG;
}
