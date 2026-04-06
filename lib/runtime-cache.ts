"use client";

import { LOCALE_STORAGE_KEY } from "@/lib/locale";

const CACHE_PREFIX = "wheel-hub-runtime-cache:";
const pendingJsonRequests = new Map<string, Promise<unknown>>();

type CacheEnvelope<T> = {
  expiresAt: number;
  value: T;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function buildRuntimeCacheKey(scope: string, target: string, token?: string | null) {
  const locale = typeof window !== "undefined" ? window.localStorage.getItem(LOCALE_STORAGE_KEY) ?? "zh-CN" : "zh-CN";
  const actor = token ? token.slice(0, 16) : "anonymous";
  return `${CACHE_PREFIX}${scope}:${locale}:${actor}:${target}`;
}

export function readRuntimeJsonCache<T>(key: string): T | null {
  if (!canUseStorage()) {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const payload = JSON.parse(raw) as CacheEnvelope<T>;
    if (Date.now() >= payload.expiresAt) {
      window.sessionStorage.removeItem(key);
      return null;
    }

    return payload.value;
  } catch {
    window.sessionStorage.removeItem(key);
    return null;
  }
}

export function writeRuntimeJsonCache<T>(key: string, value: T, ttlMs: number) {
  if (!canUseStorage()) {
    return;
  }

  const payload: CacheEnvelope<T> = {
    expiresAt: Date.now() + ttlMs,
    value,
  };
  window.sessionStorage.setItem(key, JSON.stringify(payload));
}

export function clearRuntimeCaches() {
  if (!canUseStorage()) {
    pendingJsonRequests.clear();
    return;
  }

  const keys: string[] = [];
  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);
    if (key?.startsWith(CACHE_PREFIX)) {
      keys.push(key);
    }
  }

  keys.forEach((key) => window.sessionStorage.removeItem(key));
  pendingJsonRequests.clear();
}

export function getPendingJsonRequest<T>(key: string) {
  return pendingJsonRequests.get(key) as Promise<T> | undefined;
}

export function setPendingJsonRequest<T>(key: string, promise: Promise<T>) {
  pendingJsonRequests.set(key, promise);
  promise.finally(() => {
    pendingJsonRequests.delete(key);
  });
  return promise;
}
