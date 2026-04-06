"use client";

import Image from "next/image";
import AccountMenu from "./AccountMenu";
import Navigation from "./Navigation";
import LanguageToggle from "../Locale/LanguageToggle";
import ThemeToggle from "../Theme/ThemeToggle";
import { useLocale } from "../Locale/LocaleProvider";
import { Badge } from "../ui/Badge";

export default function Header() {
  const { text } = useLocale();

  return (
    <header className="sticky top-0 z-50 px-3 pt-3 md:px-6 md:pt-4 xl:px-8">
      <div className="header-shell">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="header-brand-mark flex h-12 w-12 items-center justify-center rounded-full p-2">
            <Image
              src="/images/logo.png"
              alt={text("工业表面缺陷智能检测系统标识", "Industrial surface defect detection platform mark")}
              width={32}
              height={32}
              className="h-auto w-auto max-h-full max-w-full object-contain"
              priority
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-semibold tracking-[0.08em] text-[var(--accent)] md:text-xl">
              {text("更精巧的工业表面缺陷智能检测系统", "Industrial Surface Defect Detection System")}
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] md:text-sm">
              {text("数字孪生、AI 分析与训练协同", "Digital twin, AI analysis, and training orchestration")}
            </span>
          </div>
        </div>
        <Navigation />
        <div className="flex items-center gap-2 md:gap-3">
          <Badge variant="glow" className="hidden xl:flex gap-2 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-strong)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-strong)]"></span>
            </span>
            {text("企业级可交付", "Enterprise ready")}
          </Badge>
          <LanguageToggle />
          <ThemeToggle />
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
