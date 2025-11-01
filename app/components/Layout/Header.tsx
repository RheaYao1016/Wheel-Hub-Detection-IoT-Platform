"use client";

import Navigation from "./Navigation";
import AccountMenu from "./AccountMenu";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 px-4 md:px-10 pt-6">
      <div className="flex items-center gap-6 justify-between rounded-3xl border border-[rgba(91,189,247,0.18)] bg-[#061324]/80 backdrop-blur-xl px-5 md:px-10 py-4 shadow-[0_14px_38px_rgba(0,0,0,0.35)]">
        <div className="flex items-center gap-3 md:gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#5bbdf7] to-[#4f82f4] text-lg font-extrabold text-[#041629] shadow-lg">
            W
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-lg md:text-xl font-semibold text-[var(--accent)] tracking-wide">
              轮毂检测数字孪生平台
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
