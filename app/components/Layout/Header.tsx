"use client";

import Image from "next/image";
import Navigation from "./Navigation";
import AccountMenu from "./AccountMenu";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 px-4 md:px-10 pt-6">
      <div className="flex items-center gap-6 justify-between rounded-3xl border border-[rgba(91,189,247,0.18)] bg-[#061324]/80 backdrop-blur-xl px-5 md:px-10 py-4 shadow-[0_14px_38px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/85 p-2 shadow-[0_0_18px_rgba(91,189,247,0.35)] ring-1 ring-[rgba(91,189,247,0.25)]">
            <Image
              src="/images/logo.svg"
              alt="轮毂检测物联网平台标志"
              width={32}
              height={32}
              className="h-auto w-auto max-h-full max-w-full object-contain"
              priority
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-lg md:text-xl font-semibold text-[var(--accent)] tracking-wide">
              轮毂检测物联网平台
            </span>
            <span className="text-xs text-[var(--text-secondary)] md:text-sm">
              Wheel Inspection · Digital Twin &amp; Visualization
            </span>
          </div>
        </div>
        <Navigation />
        <AccountMenu />
      </div>
    </header>
  );
}
