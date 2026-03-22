"use client";

import Image from "next/image";
import Navigation from "./Navigation";
import AccountMenu from "./AccountMenu";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 px-4 pt-5 md:px-10">
      <div className="header-shell">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 p-2 shadow-[0_0_18px_rgba(91,189,247,0.35)] ring-1 ring-[rgba(91,189,247,0.25)]">
            <Image
              src="/images/logo.svg"
              alt="轮毂检测数字孪生平台标志"
              width={32}
              height={32}
              className="h-auto w-auto max-h-full max-w-full object-contain"
              priority
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-semibold tracking-[0.08em] text-[var(--accent)] md:text-xl">轮毂检测数字孪生平台</span>
            <span className="text-xs text-[var(--text-secondary)] md:text-sm">Wheel Inspection Digital Twin and Operations</span>
          </div>
        </div>
        <Navigation />
        <div className="flex items-center gap-3">
          <div className="header-runtime hidden xl:flex">
            <span className="header-runtime-dot" />
            Commercial Ready
          </div>
          <AccountMenu />
        </div>
      </div>
    </header>
  );
}
