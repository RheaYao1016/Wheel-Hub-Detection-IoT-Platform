"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppLocale } from "@/lib/locale";
import { broadcastAuthChange, clearAuthSession, readStoredAuthSession } from "@/lib/auth-session";
import { requestPlatformJson } from "@/lib/dashboard-client";
import { navigateWithTransition } from "@/lib/navigation-transition";
import type { UserRole } from "@/types/auth";
import { useLocale } from "../Locale/LocaleProvider";

type RoleState = UserRole | null;

function formatRole(role: RoleState, locale: AppLocale) {
  const normalized = role === "user" ? "operator" : role;
  return {
    admin: locale === "zh-CN" ? "管理员" : "Administrator",
    engineer: locale === "zh-CN" ? "工程师" : "Engineer",
    operator: locale === "zh-CN" ? "操作员" : "Operator",
    viewer: locale === "zh-CN" ? "访客" : "Viewer",
    null: locale === "zh-CN" ? "访客" : "Viewer",
  }[String(normalized) as "admin" | "engineer" | "operator" | "viewer" | "null"];
}

export default function AccountMenu() {
  const router = useRouter();
  const { locale, text } = useLocale();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<RoleState>(null);
  const [displayName, setDisplayName] = useState(text("访客", "Guest"));
  const [department, setDepartment] = useState(text("未登录", "Not signed in"));
  const [email, setEmail] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncRole = () => {
      const session = readStoredAuthSession();
      setRole(session?.role ?? null);
      setDisplayName(session?.displayName || session?.username || text("访客", "Guest"));
      setDepartment(session?.department || (session ? text("未分配部门", "Unassigned department") : text("未登录", "Not signed in")));
      setEmail(session?.email || "");
    };

    syncRole();
    window.addEventListener("storage", syncRole);
    window.addEventListener("app:role-change", syncRole as EventListener);

    return () => {
      window.removeEventListener("storage", syncRole);
      window.removeEventListener("app:role-change", syncRole as EventListener);
    };
  }, [text]);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [open]);

  const resetLocalState = () => {
    setRole(null);
    setDisplayName(text("访客", "Guest"));
    setDepartment(text("未登录", "Not signed in"));
    setEmail("");
    setOpen(false);
  };

  const handleLogout = async () => {
    try {
      await requestPlatformJson("/auth/logout", "", { method: "POST" });
    } catch (error) {
      console.error("logout request failed", error);
    } finally {
      clearAuthSession();
      resetLocalState();
      broadcastAuthChange(null);
      navigateWithTransition(router, "/visualize", { replace: true });
    }
  };

  const handleSwitch = () => {
    clearAuthSession();
    resetLocalState();
    broadcastAuthChange(null);
    navigateWithTransition(router, "/login?switch=1");
  };

  const avatar = (displayName || text("访客", "Guest")).charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button className="profile-trigger" onClick={() => setOpen((prev) => !prev)} type="button">
        <span className="profile-avatar">{avatar}</span>
        <span className="hidden text-sm md:inline">{displayName}</span>
        <svg className={`h-4 w-4 transition-transform ${open ? "rotate-180" : "rotate-0"}`} viewBox="0 0 20 20" fill="none">
          <path d="M5 7l5 6 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="profile-dropdown">
          {role ? (
            <>
              <div className="profile-dropdown-meta">
                <strong>{displayName}</strong>
                <span>
                  {formatRole(role, locale)} / {department}
                </span>
                {email ? <em>{email}</em> : null}
              </div>
              <button className="profile-dropdown-item" onClick={handleSwitch}>
                {text("切换账号", "Switch account")}
              </button>
              <button className="profile-dropdown-item profile-dropdown-item-danger" onClick={handleLogout}>
                {text("退出登录", "Sign out")}
              </button>
            </>
          ) : (
            <>
              <button className="profile-dropdown-item" onClick={() => navigateWithTransition(router, "/login")}>
                {text("登录", "Sign in")}
              </button>
              <button className="profile-dropdown-item" onClick={() => navigateWithTransition(router, "/login?mode=reg")}>
                {text("创建账号", "Create account")}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
