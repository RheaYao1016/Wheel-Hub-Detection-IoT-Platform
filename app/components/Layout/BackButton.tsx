"use client";

import { useRouter } from "next/navigation";
import { navigateWithTransition } from "@/lib/navigation-transition";
import { useLocale } from "../Locale/LocaleProvider";

interface BackButtonProps {
  label?: string;
  fallbackHref?: string;
  className?: string;
  variant?: "fixed" | "inline";
}

export default function BackButton({
  label,
  fallbackHref = "/",
  className = "",
  variant = "fixed",
}: BackButtonProps) {
  const router = useRouter();
  const { text } = useLocale();
  const resolvedLabel = label ?? text("返回", "Back");

  const handleClick = () => {
    if (
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      document.referrer &&
      document.referrer.startsWith(window.location.origin)
    ) {
      router.back();
      return;
    }

    if (fallbackHref) {
      navigateWithTransition(router, fallbackHref);
    }
  };

  const variantClass = variant === "fixed" ? "floating-back-button" : "";

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group flex items-center gap-2 rounded-full border border-[rgba(91,189,247,0.35)] bg-[rgba(4,22,41,0.85)] px-4 py-1.5 text-xs font-semibold text-[rgba(232,243,255,0.95)] shadow-[0_12px_24px_rgba(0,0,0,0.35)] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[rgba(91,189,247,0.75)] hover:border-[rgba(91,189,247,0.6)] hover:text-white md:text-sm ${variantClass} ${className}`}
      aria-label={resolvedLabel}
    >
      <span aria-hidden className="text-base text-[var(--accent)] transition group-hover:-translate-x-0.5">
        {"<"}
      </span>
      {resolvedLabel}
    </button>
  );
}
