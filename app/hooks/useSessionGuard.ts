"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

  try {
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
  } catch (error) {
    console.warn("[useSessionGuard] Error checking current session:", error);
    return false;
  }
}

const REDIRECT_DEBOUNCE_MS = 1000;

const activeRedirects = new Map<string, number>();

function shouldRedirect(
  redirectKey: string,
  cleanupTimeouts: Set<ReturnType<typeof setTimeout>>,
): boolean {
  const lastRedirectTime = activeRedirects.get(redirectKey) || 0;
  const now = Date.now();

  if (now - lastRedirectTime < REDIRECT_DEBOUNCE_MS) {
    return false;
  }

  activeRedirects.set(redirectKey, now);

  const cleanupTimeoutId = setTimeout(() => {
    activeRedirects.delete(redirectKey);
  }, REDIRECT_DEBOUNCE_MS + 100);
  cleanupTimeouts.add(cleanupTimeoutId);

  return true;
}

export function useSessionGuard(allowedRoles?: UserRole[]) {
  const router = useRouter();
  // Always start false so SSR and the first client render match.
  // Session state is determined in useEffect on the client only.
  const [ready, setReady] = useState(false);
  const normalizedRoles = useMemo(
    () =>
      allowedRoles
        ? (allowedRoles
            .map((role) => normalizeRole(role))
            .filter(Boolean) as UserRole[])
        : [],
    [allowedRoles],
  );
  const isInitializedRef = useRef(false);
  const redirectAttemptedRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let active = true;
    let verificationTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const guardId = `guard-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const cleanupTimeouts = new Set<ReturnType<typeof setTimeout>>();

    const initializeGuard = async () => {
      try {
        const localSession = readStoredAuthSession();
        
        if (!localSession || hasExpiredSession()) {
          if (!active) return;
          
          const redirectKey = `/login-from-${guardId}`;
          if (shouldRedirect(redirectKey, cleanupTimeouts)) {
            redirectAttemptedRef.current = redirectKey;
            clearAuthSession();
            router.replace("/login");
          }
          return;
        }

        const localRole = normalizeRole(localSession.role);
        
        if (normalizedRoles.length && localRole && !normalizedRoles.includes(localRole)) {
          if (!active) return;
          
          const fallbackRoute = getFallbackRoute(localRole);
          const redirectKey = `${fallbackRoute}-from-${guardId}`;

          if (shouldRedirect(redirectKey, cleanupTimeouts)) {
            redirectAttemptedRef.current = redirectKey;
            router.replace(fallbackRoute);
          }
          return;
        }

        if (!active) return;
        
        if (!isInitializedRef.current) {
          isInitializedRef.current = true;
          setReady(true);
        }

        let verificationCompleted = false;
        
        verificationTimeoutId = setTimeout(() => {
          if (!active || verificationCompleted) return;

          verificationCompleted = true;

          if (!isInitializedRef.current) {
            isInitializedRef.current = true;
            setReady(true);
          }

        }, 3000);

        try {
          const session = await requestPlatformJson<SessionResponse>("/auth/session", "");

          if (verificationTimeoutId !== null) {
            clearTimeout(verificationTimeoutId);
            verificationTimeoutId = null;
          }
          
          if (!active) return;
          
          verificationCompleted = true;

          if (!session.authenticated) {
            const redirectKey = `/login-verify-${guardId}`;
            if (shouldRedirect(redirectKey, cleanupTimeouts)) {
              redirectAttemptedRef.current = redirectKey;
              clearAuthSession();
              router.replace("/login");
            }
            return;
          }

          const remoteRole = normalizeRole(session.role);
          
          if (normalizedRoles.length && remoteRole && !normalizedRoles.includes(remoteRole)) {
            const fallbackRoute = getFallbackRoute(remoteRole);
            const redirectKey = `${fallbackRoute}-verify-${guardId}`;

            if (shouldRedirect(redirectKey, cleanupTimeouts)) {
              redirectAttemptedRef.current = redirectKey;
              router.replace(fallbackRoute);
            }
            return;
          }

          if (!isInitializedRef.current) {
            isInitializedRef.current = true;
            setReady(true);
          }
        } catch (verifyError) {
          if (verificationTimeoutId !== null) {
            clearTimeout(verificationTimeoutId);
            verificationTimeoutId = null;
          }

          if (!active) return;
          
          verificationCompleted = true;

          if (verifyError instanceof DOMException && verifyError.name === "AbortError") {
            return;
          }

          if (verifyError instanceof PlatformAuthError) {
            console.warn(`[useSessionGuard] Authentication failed: ${verifyError.message}`);
            
            const redirectKey = `/login-auth-${guardId}`;
            if (shouldRedirect(redirectKey, cleanupTimeouts)) {
              redirectAttemptedRef.current = redirectKey;
              clearAuthSession();
              router.replace("/login");
            }
            return;
          }

          console.warn(`[useSessionGuard] Verification failed, allowing access:`, verifyError);
          
          if (!isInitializedRef.current) {
            isInitializedRef.current = true;
            setReady(true);
          }
        }
      } catch (initError) {
        if (!active) return;

        console.error(`[useSessionGuard] Initialization error:`, initError);
        
        if (!isInitializedRef.current) {
          isInitializedRef.current = true;
          setReady(true);
        }
      }
    };

    const delayMs = Math.min(500 + Math.random() * 500, 1000);
    
    const initTimeout = setTimeout(() => {
      initializeGuard();
    }, delayMs);

    return () => {
      active = false;
      clearTimeout(initTimeout);
      if (verificationTimeoutId !== null) {
        clearTimeout(verificationTimeoutId);
      }
      cleanupTimeouts.forEach((id) => clearTimeout(id));

      if (redirectAttemptedRef.current) {
        activeRedirects.delete(redirectAttemptedRef.current);
      }
    };
  }, [normalizedRoles, router]);

  return ready;
}
