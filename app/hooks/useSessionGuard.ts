"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuthSession, hasExpiredSession, readStoredAuthSession } from "@/lib/auth-session";
import { PlatformAuthError, requestPlatformJson } from "@/lib/dashboard-client";
import type { SessionResponse, UserRole } from "@/types/auth";

function normalizeRole(role: UserRole | null) {
  return role === "user" ? "operator" : role;
}

function getFallbackRoute(role: UserRole | null) {
  const normalized = normalizeRole(role);
  if (normalized === "admin") return "/admin";
  if (normalized === "engineer") return "/workspace";
  if (normalized === "operator") return "/visualize";
  if (normalized === "viewer") return "/workspace";
  return "/login";
}

function canUseCurrentSession(allowedRoles?: UserRole[]) {
  if (typeof window === "undefined") {
    return true;
  }

  const localSession = readStoredAuthSession();
  if (!localSession || hasExpiredSession()) {
    return false;
  }

  const normalizedRole = normalizeRole(localSession.role);
  if (!allowedRoles?.length) {
    return true;
  }

  const normalizedAllowedRoles = allowedRoles.map((role) => normalizeRole(role)).filter(Boolean) as UserRole[];
  return Boolean(normalizedRole && normalizedAllowedRoles.includes(normalizedRole));
}

export function useSessionGuard(allowedRoles?: UserRole[]) {
  const router = useRouter();
  const [ready, setReady] = useState(() => canUseCurrentSession(allowedRoles));
  const roleSignature = useMemo(() => (allowedRoles ?? []).map((role) => normalizeRole(role)).join(","), [allowedRoles]);
  const normalizedRoles = useMemo(() => (allowedRoles ? allowedRoles.map((role) => normalizeRole(role)).filter(Boolean) as UserRole[] : []), [roleSignature]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const localSession = readStoredAuthSession();
    if (!localSession || hasExpiredSession()) {
      clearAuthSession();
      router.replace("/login");
      return;
    }

    const localRole = normalizeRole(localSession.role);
    if (normalizedRoles.length && localRole && !normalizedRoles.includes(localRole)) {
      router.replace(getFallbackRoute(localRole));
      return;
    }

    setReady(true);

    let active = true;

    const verifySession = async () => {
      try {
        const session = await requestPlatformJson<SessionResponse>("/auth/session", "");
        if (!active) return;

        if (!session.authenticated) {
          clearAuthSession();
          router.replace("/login");
          return;
        }

        const remoteRole = normalizeRole(session.role);
        if (normalizedRoles.length && remoteRole && !normalizedRoles.includes(remoteRole)) {
          router.replace(getFallbackRoute(remoteRole));
          return;
        }

        setReady(true);
      } catch (error) {
        if (!active) return;

        if (error instanceof PlatformAuthError) {
          clearAuthSession();
          router.replace("/login");
          return;
        }

        setReady(true);
      }
    };

    verifySession();

    return () => {
      active = false;
    };
  }, [normalizedRoles, roleSignature, router]);

  return ready;
}
