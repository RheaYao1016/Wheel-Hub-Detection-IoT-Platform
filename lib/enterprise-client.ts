import { getAuthToken } from "@/lib/auth-session";
import { getBackendApiBase } from "@/lib/dashboard-client";
import {
  buildRuntimeCacheKey,
  clearRuntimeCaches,
  getPendingJsonRequest,
  readRuntimeJsonCache,
  setPendingJsonRequest,
  writeRuntimeJsonCache,
} from "@/lib/runtime-cache";
import type { ApiEnvelope } from "@/types/enterprise";

const ENTERPRISE_TIMEOUT_MS = 45000;
const ENTERPRISE_RETRY_COUNT = 2;
const ENTERPRISE_CACHE_TTL_MS = 15000;

function createHeaders(init?: HeadersInit) {
  const headers = new Headers(init);
  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}

async function parseErrorResponse(response: Response) {
  const text = await response.text();
  if (!text) {
    return `Enterprise API request failed: ${response.status}`;
  }

  try {
    const payload = JSON.parse(text) as {
      message?: string;
      detail?: { message?: string; solutions?: string[] } | string;
    };

    if (typeof payload.detail === "string" && payload.detail) {
      return payload.detail;
    }

    if (payload.detail && typeof payload.detail === "object") {
      const message = payload.detail.message ?? "Request failed.";
      const solutions = payload.detail.solutions?.length ? ` Solutions: ${payload.detail.solutions.join(" | ")}` : "";
      return `${message}${solutions}`;
    }

    if (payload.message) {
      return payload.message;
    }
  } catch {
    return text;
  }

  return `Enterprise API request failed: ${response.status}`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeFetchError(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return new Error("The backend request timed out before a response was returned.");
  }

  if (error instanceof TypeError && /fetch/i.test(error.message)) {
    return new Error("Unable to reach the backend service. Confirm the backend is running and the API base URL is correct.");
  }

  return error instanceof Error ? error : new Error("Unable to complete the enterprise request.");
}

async function fetchWithRetry(target: string, init?: RequestInit) {
  const method = (init?.method ?? "GET").toUpperCase();
  const attempts = method === "GET" || method === "HEAD" ? ENTERPRISE_RETRY_COUNT : 1;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), ENTERPRISE_TIMEOUT_MS);

    try {
      return await fetch(target, {
        cache: "no-store",
        ...init,
        signal: controller.signal,
      });
    } catch (error) {
      lastError = normalizeFetchError(error);
      if (attempt < attempts) {
        await wait(350 * attempt);
      }
    } finally {
      window.clearTimeout(timeout);
    }
  }

  throw lastError ?? new Error("Unable to complete the enterprise request.");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const token = getAuthToken();
  const target = `${getBackendApiBase()}${path}`;
  const cacheKey = buildRuntimeCacheKey("enterprise", `${method}:${path}`, token);

  if (method === "GET") {
    const cached = readRuntimeJsonCache<T>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const pending = getPendingJsonRequest<T>(cacheKey);
    if (pending) {
      return pending;
    }
  }

  const executeRequest = async () => {
    const response = await fetchWithRetry(target, {
      ...init,
      headers: createHeaders(init?.headers),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }

    const payload = (await response.json()) as ApiEnvelope<T>;
    if (method === "GET") {
      writeRuntimeJsonCache(cacheKey, payload.data, ENTERPRISE_CACHE_TTL_MS);
    } else {
      clearRuntimeCaches();
    }
    return payload.data;
  };

  if (method === "GET") {
    return setPendingJsonRequest(cacheKey, executeRequest());
  }

  return executeRequest();
}

export function enterpriseGet<T>(path: string) {
  return request<T>(path);
}

export function enterprisePost<T>(path: string, body?: unknown) {
  return request<T>(path, {
    method: "POST",
    headers: createHeaders({ "Content-Type": "application/json" }),
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function enterpriseUpload<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetchWithRetry(`${getBackendApiBase()}${path}`, {
    method: "POST",
    headers: createHeaders(),
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  const payload = (await response.json()) as ApiEnvelope<T>;
  return payload.data;
}

export async function enterpriseDownload(path: string): Promise<Blob> {
  const response = await fetchWithRetry(`${getBackendApiBase()}${path}`, {
    method: "GET",
    headers: createHeaders(),
  });

  if (!response.ok) {
    throw new Error(await parseErrorResponse(response));
  }

  return response.blob();
}

export function enterpriseErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    if (/Unable to reach the backend service/i.test(error.message)) {
      return "无法连接后端服务，请确认后端已启动，并检查前端使用的 API 地址是否正确。";
    }

    if (/timed out/i.test(error.message)) {
      return "后端响应超时，请稍后重试，或检查后端和 AI 服务是否仍在运行。";
    }

    return error.message;
  }

  return fallback;
}
