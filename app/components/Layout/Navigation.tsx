"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bot,
  Database,
  LayoutDashboard,
  Radar,
  Settings2,
  ShieldCheck,
  Video,
} from "lucide-react";
import { readStoredAuthSession } from "@/lib/auth-session";
import type { UserRole } from "@/types/auth";
import { cn } from "@/lib/utils";
import { useLocale } from "../Locale/LocaleProvider";
import TransitionLink from "./TransitionLink";

type RoleState = UserRole | null;

type NavItem = {
  href: string;
  labelZh: string;
  labelEn: string;
  descriptionZh: string;
  descriptionEn: string;
  icon: React.ReactNode;
  aliases?: string[];
  roles?: UserRole[];
};

type NavSection = {
  id: string;
  labelZh: string;
  labelEn: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    id: "observe",
    labelZh: "总览与态势",
    labelEn: "Observe",
    items: [
      {
        href: "/home",
        labelZh: "平台首页",
        labelEn: "Platform Home",
        descriptionZh: "先理解平台分工与当前工作路径",
        descriptionEn: "Start with the platform map and current workflows",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        href: "/visualize",
        labelZh: "指挥中心",
        labelEn: "Command Center",
        descriptionZh: "查看质量、趋势和生产态势",
        descriptionEn: "Track quality, throughput, and shift posture",
        icon: <BarChart3 className="h-4 w-4" />,
        roles: ["admin", "operator", "user"],
      },
    ],
  },
  {
    id: "operate",
    labelZh: "现场执行",
    labelEn: "Operate",
    items: [
      {
        href: "/operations",
        labelZh: "运营中台",
        labelEn: "Operations Hub",
        descriptionZh: "连接监控与数字孪生的现场入口",
        descriptionEn: "Unify monitoring and digital-twin handoff",
        icon: <Radar className="h-4 w-4" />,
        aliases: ["/monitor", "/digital-twin"],
        roles: ["admin", "operator", "user"],
      },
      {
        href: "/workspace",
        labelZh: "智能工作台",
        labelEn: "Intelligence Workspace",
        descriptionZh: "集中处理 AI、数据、报告和训练",
        descriptionEn: "Run AI, data, report, and training work",
        icon: <Bot className="h-4 w-4" />,
        aliases: [
          "/ai-assistant",
          "/data-hub",
          "/reports",
          "/training",
          "/annotation",
          "/platform-config",
        ],
      },
    ],
  },
  {
    id: "govern",
    labelZh: "治理与支持",
    labelEn: "Govern",
    items: [
      {
        href: "/data-hub",
        labelZh: "数据中心",
        labelEn: "Data Hub",
        descriptionZh: "管理数据源、质量与连接状态",
        descriptionEn: "Manage sources, quality, and connectivity",
        icon: <Database className="h-4 w-4" />,
        aliases: ["/annotation"],
        roles: ["admin", "engineer", "viewer", "operator", "user"],
      },
      {
        href: "/admin",
        labelZh: "治理后台",
        labelEn: "Admin Console",
        descriptionZh: "处理警报、导入和系统治理",
        descriptionEn: "Handle alerts, imports, and governance",
        icon: <ShieldCheck className="h-4 w-4" />,
        aliases: [
          "/admin/alerts",
          "/admin/data-import",
          "/admin/inspections",
          "/admin/storage",
          "/admin/wheels",
        ],
        roles: ["admin"],
      },
      {
        href: "/monitor",
        labelZh: "监控中心",
        labelEn: "Monitoring",
        descriptionZh: "直接打开实时视频和警报队列",
        descriptionEn: "Jump straight into live feeds and alert triage",
        icon: <Video className="h-4 w-4" />,
        roles: ["admin", "operator", "user"],
      },
      {
        href: "/platform-config",
        labelZh: "平台配置",
        labelEn: "Platform Config",
        descriptionZh: "检查服务、供应商和端点配置",
        descriptionEn: "Inspect services, providers, and endpoints",
        icon: <Settings2 className="h-4 w-4" />,
        roles: ["admin", "engineer", "viewer"],
      },
    ],
  },
];

function normalizeRole(role: RoleState) {
  return role === "user" ? "operator" : role;
}

function matchesRoute(currentPath: string, item: NavItem) {
  if (currentPath === item.href || currentPath.startsWith(`${item.href}/`)) {
    return true;
  }

  return (
    item.aliases?.some(
      (alias) => currentPath === alias || currentPath.startsWith(`${alias}/`),
    ) ?? false
  );
}

export default function Navigation() {
  const pathname = usePathname();
  const currentPath = pathname === "/" ? "/home" : pathname;
  const { text } = useLocale();
  const [role, setRole] = useState<RoleState>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncRole = () => {
      const session = readStoredAuthSession();
      setRole(session?.role ?? null);
    };

    syncRole();
    window.addEventListener("storage", syncRole);
    window.addEventListener("app:role-change", syncRole as EventListener);

    return () => {
      window.removeEventListener("storage", syncRole);
      window.removeEventListener("app:role-change", syncRole as EventListener);
    };
  }, []);

  const sections = useMemo(() => {
    const normalizedRole = normalizeRole(role);

    return NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.roles || !normalizedRole) return !item.roles || item.roles.includes("operator");
        return item.roles.includes(normalizedRole);
      }),
    })).filter((section) => section.items.length > 0);
  }, [role]);

  return (
    <nav className="border-t border-border/80 py-3">
      <div className="grid gap-3 xl:grid-cols-3">
        {sections.map((section) => (
          <div
            key={section.id}
            className="rounded-2xl border border-border/60 bg-background/40 p-2.5 backdrop-blur"
          >
            <div className="mb-2 flex items-center gap-2 px-2">
              <div className="h-2 w-2 rounded-full bg-primary/70" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {text(section.labelZh, section.labelEn)}
              </p>
            </div>
            <div className="grid gap-2">
              {section.items.map((item) => {
                const isActive = matchesRoute(currentPath, item);
                return (
                  <TransitionLink
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-start gap-3 rounded-2xl border px-3 py-3 transition-all duration-200",
                      isActive
                        ? "border-primary/40 bg-primary/10 text-foreground shadow-glow-sm"
                        : "border-transparent text-muted-foreground hover:border-border hover:bg-accent/10 hover:text-foreground",
                    )}
                  >
                    <div
                      className={cn(
                        "mt-0.5 rounded-xl border p-2",
                        isActive
                          ? "border-primary/30 bg-primary/10 text-primary"
                          : "border-border/60 bg-background/60 text-muted-foreground group-hover:text-primary",
                      )}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold tracking-wide">
                        {text(item.labelZh, item.labelEn)}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {text(item.descriptionZh, item.descriptionEn)}
                      </p>
                    </div>
                  </TransitionLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}
