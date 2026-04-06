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

function normalizeRole(role: string | null): UserRole | null {
  if (!role) return null;
  if (role === "user") return "operator";
  if (role === "admin" || role === "engineer" || role === "operator" || role === "viewer") {
    return role;
  }
  return null;
}

export function readStoredAuthSession(): StoredAuthSession | null {
  if (typeof window === "undefined") return null;

  const role = normalizeRole(window.localStorage.getItem("role"));
  const token = window.localStorage.getItem("auth_token");
  const username = window.localStorage.getItem("auth_user");
  const displayName = window.localStorage.getItem("auth_display_name");
  const email = window.localStorage.getItem("auth_email") || undefined;
  const department = window.localStorage.getItem("auth_department") || undefined;
  const expiresAt = window.localStorage.getItem("auth_expires_at") || undefined;

  if (!role || !token || !username) {
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
  if (typeof window === "undefined" || !session.token || !session.role) return;

  clearRuntimeCaches();

  const role = normalizeRole(session.role) ?? "operator";
  window.localStorage.setItem("role", role);
  window.localStorage.setItem("auth_token", session.token);
  window.localStorage.setItem("auth_user", session.username);
  window.localStorage.setItem("auth_display_name", session.displayName);
  if (session.email) {
    window.localStorage.setItem("auth_email", session.email);
  } else {
    window.localStorage.removeItem("auth_email");
  }
  if (session.department) {
    window.localStorage.setItem("auth_department", session.department);
  } else {
    window.localStorage.removeItem("auth_department");
  }

  if (session.expiresAt) {
    window.localStorage.setItem("auth_expires_at", session.expiresAt);
  } else {
    window.localStorage.removeItem("auth_expires_at");
  }
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;

  clearRuntimeCaches();
  window.localStorage.removeItem("role");
  window.localStorage.removeItem("auth_token");
  window.localStorage.removeItem("auth_user");
  window.localStorage.removeItem("auth_display_name");
  window.localStorage.removeItem("auth_email");
  window.localStorage.removeItem("auth_department");
  window.localStorage.removeItem("auth_expires_at");
}

export function getAuthToken() {
  return readStoredAuthSession()?.token ?? null;
}

export function hasExpiredSession() {
  const session = readStoredAuthSession();
  if (!session?.expiresAt) return false;
  return Date.parse(session.expiresAt) <= Date.now();
}

export function broadcastAuthChange(role: UserRole | null) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("app:role-change", { detail: role }));
  }
}
