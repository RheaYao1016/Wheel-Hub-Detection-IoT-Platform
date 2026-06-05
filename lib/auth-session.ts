"use client";

import type { LoginResponse, SessionResponse, UserRole } from "@/types/auth";
import { clearRuntimeCaches } from "@/lib/runtime-cache";

export type StoredAuthSession = {
  username: string;
  role: UserRole;
  token: string;
  displayName: string;
  email?: string;
  department?: string;
  expiresAt?: string;
};

const TOKEN_KEY = "wh_auth_token";
const USER_KEY = "wh_auth_user";
const ROLE_KEY = "wh_auth_role";
const DISPLAY_KEY = "wh_auth_display";
const EMAIL_KEY = "wh_auth_email";
const DEPT_KEY = "wh_auth_dept";
const EXPIRES_KEY = "wh_auth_expires";

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage;
}

function normalizeRole(role: string | null): UserRole | null {
  if (!role) return null;
  if (role === "user") return "operator";
  const validRoles = ["admin", "engineer", "operator", "viewer"];
  if (validRoles.includes(role)) {
    return role as UserRole;
  }
  return null;
}

function parseJwtExpiry(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function readStoredAuthSession(): StoredAuthSession | null {
  const storage = getStorage();
  if (!storage) return null;

  const role = normalizeRole(storage.getItem(ROLE_KEY));
  const token = storage.getItem(TOKEN_KEY);
  const username = storage.getItem(USER_KEY);
  const displayName = storage.getItem(DISPLAY_KEY);
  const email = storage.getItem(EMAIL_KEY) || undefined;
  const department = storage.getItem(DEPT_KEY) || undefined;
  const expiresAt = storage.getItem(EXPIRES_KEY) || undefined;

  if (!role || !token || !username) {
    return null;
  }

  if (expiresAt && Date.parse(expiresAt) <= Date.now()) {
    clearAuthSession();
    return null;
  }

  return {
    username,
    role,
    token,
    displayName: displayName || username,
    email,
    department,
    expiresAt,
  };
}

export function storeAuthSession(session: LoginResponse | SessionResponse) {
  const storage = getStorage();
  if (!storage || !session.token || !session.role) return;

  clearRuntimeCaches();

  const role = normalizeRole(session.role) ?? "operator";
  storage.setItem(ROLE_KEY, role);
  storage.setItem(TOKEN_KEY, session.token);
  storage.setItem(USER_KEY, session.username);
  storage.setItem(DISPLAY_KEY, session.displayName || session.username);
  
  if (session.email) {
    storage.setItem(EMAIL_KEY, session.email);
  } else {
    storage.removeItem(EMAIL_KEY);
  }
  
  if (session.department) {
    storage.setItem(DEPT_KEY, session.department);
  } else {
    storage.removeItem(DEPT_KEY);
  }

  const jwtExpiry = parseJwtExpiry(session.token);
  const expiryTime = session.expiresAt || (jwtExpiry ? new Date(jwtExpiry).toISOString() : null);
  if (expiryTime) {
    storage.setItem(EXPIRES_KEY, expiryTime);
  } else {
    storage.removeItem(EXPIRES_KEY);
  }
}

export function clearAuthSession() {
  const storage = getStorage();
  if (!storage) return;

  clearRuntimeCaches();
  storage.removeItem(ROLE_KEY);
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(USER_KEY);
  storage.removeItem(DISPLAY_KEY);
  storage.removeItem(EMAIL_KEY);
  storage.removeItem(DEPT_KEY);
  storage.removeItem(EXPIRES_KEY);
}

export function getAuthToken(): string | null {
  const session = readStoredAuthSession();
  return session?.token ?? null;
}

export function hasExpiredSession(): boolean {
  const session = readStoredAuthSession();
  if (!session?.expiresAt) return false;
  return Date.parse(session.expiresAt) <= Date.now();
}

export function isTokenExpiringSoon(thresholdMinutes: number = 5): boolean {
  const session = readStoredAuthSession();
  if (!session?.expiresAt) return false;
  const expiryTime = Date.parse(session.expiresAt);
  const thresholdMs = thresholdMinutes * 60 * 1000;
  return (expiryTime - Date.now()) < thresholdMs;
}

export function broadcastAuthChange(role: UserRole | null) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app:role-change", { detail: role }));
  }
}
