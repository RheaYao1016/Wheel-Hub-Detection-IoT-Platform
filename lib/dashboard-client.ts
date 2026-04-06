import { getAuthToken } from "@/lib/auth-session";
import {
  buildRuntimeCacheKey,
  clearRuntimeCaches,
  getPendingJsonRequest,
  readRuntimeJsonCache,
  setPendingJsonRequest,
  writeRuntimeJsonCache,
} from "@/lib/runtime-cache";

/**
 * Resolve data from Spring Boot as the only supported source of truth.
 * If the backend is unavailable, the request must fail with a real error.
 */
export function getBackendApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:18081/api";
}

const BACKEND_TIMEOUT_MS = 8000;
const BACKEND_CACHE_TTL_MS = 10000;

export class PlatformAuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "PlatformAuthError";
    this.status = status;
  }
}

function withAuthHeaders(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  const token = getAuthToken();

  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return {
    ...init,
    headers,
  };
}

async function fetchWithOptionalTimeout(target: string, backendBase: string, init?: RequestInit) {
  const isBackendTarget = target.startsWith(backendBase);

  if (!isBackendTarget || init?.signal || typeof window === "undefined") {
    return fetch(target, init);
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

  try {
    return await fetch(target, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timeout);
  }
}

function shouldStopFallback(error: unknown) {
  return error instanceof PlatformAuthError;
}

function getTargets(backendPath: string, fallbackPath: string) {
  const backendBase = getBackendApiBase();
  const targets = [`${backendBase}${backendPath}`];

  return { backendBase, targets };
}

export async function fetchPlatformData<T>(backendPath: string, fallbackPath: string): Promise<T> {
  const { backendBase, targets } = getTargets(backendPath, fallbackPath);
  const token = getAuthToken();
  const cacheKey = buildRuntimeCacheKey("dashboard", `GET:${backendPath}`, token);
  const cached = readRuntimeJsonCache<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }

  const pending = getPendingJsonRequest<T>(cacheKey);
  if (pending) {
    return pending;
  }

  let lastError: unknown;

  const execute = async () => {
    for (const target of targets) {
      try {
        const response = await fetchWithOptionalTimeout(target, backendBase, { cache: "no-store", ...withAuthHeaders() });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new PlatformAuthError(response.status, `Request failed: ${response.status} ${response.statusText}`);
          }
          throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }
        const data = (await response.json()) as T;
        writeRuntimeJsonCache(cacheKey, data, BACKEND_CACHE_TTL_MS);
        return data;
      } catch (error) {
        if (shouldStopFallback(error)) {
          throw error;
        }
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Unable to load platform data");
  };

  return setPendingJsonRequest(cacheKey, execute());
}

export async function requestPlatformJson<T>(backendPath: string, fallbackPath: string, init?: RequestInit): Promise<T> {
  const { backendBase, targets } = getTargets(backendPath, fallbackPath);
  const method = (init?.method ?? "GET").toUpperCase();
  const token = getAuthToken();
  const cacheKey = buildRuntimeCacheKey("dashboard", `${method}:${backendPath}`, token);
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

  let lastError: unknown;

  const execute = async () => {
    for (const target of targets) {
      try {
        const response = await fetchWithOptionalTimeout(target, backendBase, {
          cache: "no-store",
          ...withAuthHeaders(init),
        });
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new PlatformAuthError(response.status, `Request failed: ${response.status} ${response.statusText}`);
          }
          throw new Error(`Request failed: ${response.status} ${response.statusText}`);
        }
        const data = (await response.json()) as T;
        if (method === "GET") {
          writeRuntimeJsonCache(cacheKey, data, BACKEND_CACHE_TTL_MS);
        } else {
          clearRuntimeCaches();
        }
        return data;
      } catch (error) {
        if (shouldStopFallback(error)) {
          throw error;
        }
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error("Unable to request platform json");
  };

  return method === "GET" ? setPendingJsonRequest(cacheKey, execute()) : execute();
}

export async function requestPlatformBlob(backendPath: string, fallbackPath: string, init?: RequestInit): Promise<Blob> {
  const { backendBase, targets } = getTargets(backendPath, fallbackPath);
  let lastError: unknown;

  for (const target of targets) {
    try {
      const response = await fetchWithOptionalTimeout(target, backendBase, {
        cache: "no-store",
        ...withAuthHeaders(init),
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new PlatformAuthError(response.status, `Request failed: ${response.status} ${response.statusText}`);
        }
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }
      return await response.blob();
    } catch (error) {
      if (shouldStopFallback(error)) {
        throw error;
      }
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Unable to request platform blob");
}
