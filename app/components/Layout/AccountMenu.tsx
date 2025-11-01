"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type RoleState = "admin" | "user" | null;

export default function AccountMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<RoleState>(null);
  const [displayName, setDisplayName] = useState("访客");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncRole = () => {
      const stored = localStorage.getItem("role");
      if (stored === "admin" || stored === "user") {
        setRole(stored);
      } else {
        setRole(null);
      }
      const nameKey = stored === "admin" ? "admin_user" : stored === "user" ? "user_name" : undefined;
      const fallback = stored === "admin" ? "管理员" : "访客";
      setDisplayName(nameKey ? localStorage.getItem(nameKey) || fallback : "访客");
    };
    const handleRoleChange = (event: Event) => {
      const detail = (event as CustomEvent<RoleState>).detail;
      if (detail === "admin" || detail === "user" || detail === null) {
        setRole(detail);
        const nameKey = detail === "admin" ? "admin_user" : detail === "user" ? "user_name" : undefined;
        const fallback = detail === "admin" ? "管理员" : "访客";
        setDisplayName(nameKey ? localStorage.getItem(nameKey) || fallback : "访客");
      } else {
        syncRole();
      }
    };

    syncRole();
    window.addEventListener("storage", syncRole);
    window.addEventListener("app:role-change", handleRoleChange as EventListener);
    return () => {
      window.removeEventListener("storage", syncRole);
      window.removeEventListener("app:role-change", handleRoleChange as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [open]);

  const broadcastRole = (next: RoleState) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent<RoleState>("app:role-change", { detail: next }));
    }
  };

  const handleLogout = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("role");
    localStorage.removeItem("admin_token");
    localStorage.removeItem("user_token");
    setRole(null);
    setOpen(false);
    broadcastRole(null);
    router.replace("/visualize");
  };

  const handleSwitch = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem("role");
    localStorage.removeItem("admin_token");
    localStorage.removeItem("user_token");
    setRole(null);
    setOpen(false);
    broadcastRole(null);
    router.push("/login?switch=1");
  };

  const goLogin = () => {
    setOpen(false);
    router.push("/login");
  };

  const goRegister = () => {
    setOpen(false);
    router.push("/login?mode=reg");
  };

  const avatar = (displayName || "访客").charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        className="flex items-center gap-2 rounded-full border border-[rgba(91,189,247,0.25)] bg-[rgba(91,189,247,0.18)] px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur hover:border-[rgba(91,189,247,0.45)] md:px-5 md:py-2.5"
        onClick={() => setOpen((prev) => !prev)}
        type="button"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#5bbdf7] to-[#51d3c3] text-base font-bold text-[#041629] shadow">
          {avatar}
        </span>
        <span className="hidden text-sm md:inline">{displayName}</span>
        <svg className={`h-4 w-4 transition-transform ${open ? "rotate-180" : "rotate-0"}`} viewBox="0 0 20 20" fill="none">
          <path d="M5 7l5 6 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-3 w-44 rounded-2xl border border-[rgba(91,189,247,0.18)] bg-[#061324]/95 p-2 text-sm text-[var(--text-primary)] shadow-xl">
          {role ? (
            <>
              <div className="px-3 py-2 text-xs text-[var(--text-secondary)]">当前身份：{role === "admin" ? "管理员" : "普通用户"}</div>
              <button className="block w-full rounded-xl px-3 py-2 text-left hover:bg-[rgba(91,189,247,0.18)]" onClick={handleSwitch}>
                切换账号
              </button>
              <button className="block w-full rounded-xl px-3 py-2 text-left text-[#ff6b81] hover:bg-[rgba(255,107,129,0.15)]" onClick={handleLogout}>
                退出登录
              </button>
            </>
          ) : (
            <>
              <button className="block w-full rounded-xl px-3 py-2 text-left hover:bg-[rgba(91,189,247,0.18)]" onClick={goLogin}>
                登录
              </button>
              <button className="block w-full rounded-xl px-3 py-2 text-left hover:bg-[rgba(91,189,247,0.18)]" onClick={goRegister}>
                注册
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
