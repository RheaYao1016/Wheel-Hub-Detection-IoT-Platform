"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  broadcastAuthChange,
  clearAuthSession,
  readStoredAuthSession,
} from "@/lib/auth-session";
import { requestPlatformJson } from "@/lib/dashboard-client";
import { navigateWithTransition } from "@/lib/navigation-transition";
import type { UserRole } from "@/types/auth";
import { useLocale } from "../Locale/LocaleProvider";

type RoleState = UserRole | null;

function formatRole(role: RoleState, text: (zh: string, en: string) => string) {
  const normalized = role === "user" ? "operator" : role;
  return {
    admin: text("管理员", "Administrator"),
    engineer: text("工程师", "Engineer"),
    operator: text("操作员", "Operator"),
    viewer: text("访客", "Viewer"),
    null: text("访客", "Viewer"),
  }[
    String(normalized) as "admin" | "engineer" | "operator" | "viewer" | "null"
  ];
}

export default function AccountMenu() {
  const router = useRouter();
  const { text } = useLocale();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<RoleState>(null);
  const [displayName, setDisplayName] = useState(text("访客", "Guest"));
  const [department, setDepartment] = useState(text("未登录", "Not signed in"));
  const [email, setEmail] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState<"right" | "left">("right");
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Sync role from stored session
  const syncRole = useCallback(() => {
    const session = readStoredAuthSession();
    setRole(session?.role ?? null);
    setDisplayName(
      session?.displayName || session?.username || text("访客", "Guest"),
    );
    setDepartment(
      session?.department ||
        (session
          ? text("未分配部门", "Unassigned department")
          : text("未登录", "Not signed in")),
    );
    setEmail(session?.email || "");
  }, [text]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    syncRole();
    window.addEventListener("storage", syncRole);
    window.addEventListener("app:role-change", syncRole as EventListener);

    return () => {
      window.removeEventListener("storage", syncRole);
      window.removeEventListener("app:role-change", syncRole as EventListener);
    };
  }, [syncRole]);

  // Calculate dropdown position to avoid overflow
  useEffect(() => {
    if (!open || typeof window === "undefined") return;

    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const viewportWidth = window.innerWidth;
    const dropdownWidth = 288; // 18rem
    const spaceOnRight = viewportWidth - rect.right;

    if (spaceOnRight < dropdownWidth) {
      setDropdownPosition("left");
    } else {
      setDropdownPosition("right");
    }
  }, [open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("click", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("click", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
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
      <button
        ref={triggerRef}
        className="profile-trigger"
        onClick={() => setOpen((prev) => !prev)}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={text("账户菜单", "Account menu")}
      >
        <span className="profile-avatar" aria-hidden="true">{avatar}</span>
        <span className="hidden text-sm md:inline">{displayName}</span>
        <svg
          className={`h-4 w-4 transition-transform duration-200 ${
            open ? "rotate-180" : "rotate-0"
          }`}
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 7l5 6 5-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? (
        <div
          className={`profile-dropdown ${dropdownPosition === "left" ? "profile-dropdown-left" : ""}`}
          role="menu"
          aria-orientation="vertical"
        >
          {role ? (
            <>
              <div className="profile-dropdown-meta">
                <strong>{displayName}</strong>
                <span>
                  {formatRole(role, text)} / {department}
                </span>
                {email ? <em>{email}</em> : null}
              </div>
              <button
                className="profile-dropdown-item"
                onClick={handleSwitch}
                role="menuitem"
              >
                {text("切换账号", "Switch account")}
              </button>
              <button
                className="profile-dropdown-item profile-dropdown-item-danger"
                onClick={handleLogout}
                role="menuitem"
              >
                {text("退出登录", "Sign out")}
              </button>
            </>
          ) : (
            <>
              <button
                className="profile-dropdown-item"
                onClick={() => navigateWithTransition(router, "/login")}
                role="menuitem"
              >
                {text("登录", "Sign in")}
              </button>
              <button
                className="profile-dropdown-item"
                onClick={() => navigateWithTransition(router, "/login?mode=reg")}
                role="menuitem"
              >
                {text("创建账号", "Create account")}
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
