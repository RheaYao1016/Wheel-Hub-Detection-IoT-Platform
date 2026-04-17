"use client";

import Image from "next/image";
import AccountMenu from "./AccountMenu";
import Navigation from "./Navigation";
import LanguageToggle from "../Locale/LanguageToggle";
import ThemeToggle from "../Theme/ThemeToggle";
import { useLocale } from "../Locale/LocaleProvider";
import { Badge } from "../ui/Badge";

export default function Header() {
  const { t } = useLocale();

  return (
    <header className="sticky top-0 z-50 w-full px-4 pt-3 md:px-6 md:pt-4 xl:px-8">
      <div className="header-shell mx-auto flex h-full max-w-[var(--content-max-width)] items-center justify-between gap-6">
        <div className="header-brand-group flex min-w-0 shrink-0 items-center gap-3 md:gap-4">
          <div className="header-brand-mark relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[var(--radius-xl)] bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent-strong)]/10 p-[3px] shadow-[var(--shadow-md)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.03] hover:shadow-[var(--shadow-glow)]">
            <div className="flex h-full w-full items-center justify-center rounded-[calc(var(--radius-xl)-3px)] bg-[var(--panel-bg)] p-2">
              <Image
                src="/images/logo.png"
                alt={t("header.logoAlt", undefined, "Industrial defect platform mark")}
                width={28}
                height={28}
                className="h-auto w-auto max-h-full max-w-full object-contain drop-shadow-sm"
                priority
              />
            </div>
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <h1
              className="truncate text-base font-bold tracking-wide text-[var(--accent)] transition-colors duration-300 md:text-lg lg:text-xl"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t(
                "header.title",
                undefined,
                "Industrial Surface Defect Detection System",
              )}
            </h1>
            <span className="mt-[2px] truncate text-xs leading-relaxed text-[var(--text-secondary)] transition-colors duration-300 md:text-sm">
              {t(
                "header.subtitle",
                undefined,
                "Digital twin, AI analysis, and training orchestration",
              )}
            </span>
          </div>
        </div>

        <div className="header-controls flex shrink-0 items-center gap-1.5 md:gap-2.5">
          <Badge variant="glow" className="hidden gap-2 px-3 py-1.5 text-xs lg:inline-flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            {t("header.systemOnline", undefined, "System Online")}
          </Badge>
          <LanguageToggle />
          <ThemeToggle />
          <AccountMenu />
        </div>

        <Navigation />
      </div>
    </header>
  );
}
