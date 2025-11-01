"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type RoleState = "admin" | "user" | null;

const BASE_ITEMS = [
  { href: "/home", label: "主页" },
  { href: "/visualize", label: "可视化平台" },
  { href: "/monitor", label: "实时监控" },
  { href: "/digital-twin", label: "数字孪生" }
];

const ADMIN_ITEMS = [
  { href: "/admin/data-import", label: "数据导入" },
  { href: "/admin", label: "管理员后台" }
];

export default function Navigation() {
  const pathname = usePathname();
  const currentPath = pathname === "/" ? "/visualize" : pathname;
  const [role, setRole] = useState<RoleState>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncRole = () => {
      const stored = localStorage.getItem("role");
      if (stored === "admin" || stored === "user") {
        setRole(stored);
      } else {
        setRole(null);
      }
    };
    const handleRoleChange = (event: Event) => {
      const detail = (event as CustomEvent<RoleState>).detail;
      if (detail === "admin" || detail === "user" || detail === null) {
        setRole(detail);
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

  const navItems = useMemo(() => (role === "admin" ? [...BASE_ITEMS, ...ADMIN_ITEMS] : BASE_ITEMS), [role]);

  return (
    <nav className="flex flex-1 justify-center">
      <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
        {navItems.map((item) => {
          const isActive = currentPath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full border border-transparent px-4 py-2 text-sm font-semibold transition-all duration-200 md:px-5 md:py-2.5 md:text-base ${
                isActive
                  ? "bg-gradient-to-r from-[#5bbdf7] to-[#4f82f4] text-[#041629] shadow-[0_8px_20px_rgba(91,189,247,0.28)]"
                  : "bg-[rgba(91,189,247,0.12)] text-[rgba(232,243,255,0.86)] hover:border-[rgba(91,189,247,0.45)] hover:bg-[rgba(91,189,247,0.2)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
