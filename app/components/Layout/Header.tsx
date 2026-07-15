"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { Activity, Orbit, Workflow } from "lucide-react";
import AccountMenu from "./AccountMenu";
import Navigation from "./Navigation";
import ThemeToggle from "../Theme/ThemeToggle";
import LanguageToggle from "../Locale/LanguageToggle";
import { useLocale } from "../Locale/LocaleProvider";
import { Badge } from "../ui/Badge";

export default function Header() {
  const { t } = useLocale();
  const pathname = usePathname();
  const isAuthEntry = pathname === "/login";

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-[1920px] px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[88px] flex-col justify-center gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-accent to-primary p-[2px] shadow-glow-sm transition-all duration-500 hover:scale-105">
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-card p-2">
                <Image
                  src={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/images/logo.png`}
                  alt={t("header.logoAlt", undefined, "工业缺陷平台标识")}
                  width={28}
                  height={28}
                  className="h-auto w-auto max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-110"
                  priority
                />
              </div>
              <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-glow-sm">
                V2
              </div>
            </div>

            <div className="min-w-0 space-y-2">
              <div className="space-y-1">
                <h1 className="truncate bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-lg font-black tracking-tight text-transparent md:text-xl lg:text-2xl">
                  {t("header.title")}
                </h1>
                <p className="max-w-3xl text-xs font-medium leading-5 text-muted-foreground sm:text-sm">
                  {isAuthEntry
                    ? t(
                        "header.loginSubtitle",
                        undefined,
                        "从这里进入企业工作区。登录前只保留必要的入口、语言和主题控制，避免第一次使用时被业务导航分散注意力。",
                      )
                    : `${t("header.subtitle")} · 用统一的总览、现场执行、AI 工作台和治理后台来组织轮毂检测流程。`}
                </p>
              </div>

              {!isAuthEntry ? (
                <div className="hidden flex-wrap gap-2 xl:flex">
                  <Badge variant="secondary" className="rounded-full px-3 py-1.5 text-[11px]">
                    <Orbit className="h-3.5 w-3.5" />
                    Observe
                  </Badge>
                  <Badge variant="secondary" className="rounded-full px-3 py-1.5 text-[11px]">
                    <Workflow className="h-3.5 w-3.5" />
                    Operate
                  </Badge>
                  <Badge variant="secondary" className="rounded-full px-3 py-1.5 text-[11px]">
                    <Activity className="h-3.5 w-3.5" />
                    Govern
                  </Badge>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-between gap-3 lg:justify-end lg:gap-4">
            {!isAuthEntry ? (
              <Badge
                variant="glow"
                className="hidden gap-2 rounded-full px-3 py-1.5 text-xs font-semibold xl:inline-flex"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-primary/30" />
                </span>
                <Activity className="h-3.5 w-3.5" />
                <span>{t("header.systemOnline")}</span>
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="hidden gap-2 rounded-full px-3 py-1.5 text-xs font-semibold xl:inline-flex"
              >
                <Workflow className="h-3.5 w-3.5" />
                <span>
                  {t("header.signInGateway", undefined, "Enterprise Sign-in")}
                </span>
              </Badge>
            )}

            <div className="hidden h-8 w-px bg-border md:block" />

            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/50 p-1.5 backdrop-blur-sm">
              <LanguageToggle />
              <ThemeToggle />
            </div>

            {!isAuthEntry ? <AccountMenu /> : null}
          </div>
        </div>

        {!isAuthEntry ? <Navigation /> : null}
      </div>
    </header>
  );
}
