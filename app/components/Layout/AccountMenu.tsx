"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, UserRound, Users } from "lucide-react";
import {
  broadcastAuthChange,
  clearAuthSession,
  readStoredAuthSession,
} from "@/lib/auth-session";
import { requestPlatformJson } from "@/lib/dashboard-client";
import { safeNavigate, safeRedirect } from "@/lib/safe-navigation";
import type { UserRole } from "@/types/auth";
import { useLocale } from "../Locale/LocaleProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/DropdownMenu";
import { Avatar, AvatarFallback } from "../ui/Avatar";
import { Button } from "../ui/Button";

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
  const [role, setRole] = useState<RoleState>(null);
  const [displayName, setDisplayName] = useState(text("访客", "Guest"));
  const [department, setDepartment] = useState(text("未登录", "Not signed in"));
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncRole = () => {
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
    };

    syncRole();
    window.addEventListener("storage", syncRole);
    window.addEventListener("app:role-change", syncRole as EventListener);

    return () => {
      window.removeEventListener("storage", syncRole);
      window.removeEventListener("app:role-change", syncRole as EventListener);
    };
  }, [text]);

  const resetLocalState = () => {
    setRole(null);
    setDisplayName(text("访客", "Guest"));
    setDepartment(text("未登录", "Not signed in"));
    setEmail("");
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
      safeRedirect(router, "/visualize");
    }
  };

  const handleSwitch = () => {
    clearAuthSession();
    resetLocalState();
    broadcastAuthChange(null);
    safeNavigate(router, "/login?switch=1");
  };

  const avatar = (displayName || text("访客", "Guest"))
    .charAt(0)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 pl-2 pr-3 text-foreground hover:bg-accent/10"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{avatar}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium md:inline">
            {displayName}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {role ? (
          <>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatRole(role, text)} / {department}
                </p>
                {email ? (
                  <p className="text-xs text-muted-foreground">{email}</p>
                ) : null}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSwitch}>
              <Users className="mr-2 h-4 w-4" />
              {text("切换账号", "Switch account")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {text("退出登录", "Sign out")}
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={() => safeNavigate(router, "/login")}>
              <UserRound className="mr-2 h-4 w-4" />
              {text("登录", "Sign in")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => safeNavigate(router, "/login?mode=reg")}
            >
              <Users className="mr-2 h-4 w-4" />
              {text("创建账号", "Create account")}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
