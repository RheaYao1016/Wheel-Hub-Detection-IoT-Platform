"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { navigateWithTransition } from "@/lib/navigation-transition";
import { useLocale } from "../Locale/LocaleProvider";
import { cn } from "@/lib/utils";

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
  const { t, text } = useLocale();
  const resolvedLabel =
    label ?? t("common.back", undefined, text("返回", "Back"));

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

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-1.5 text-xs font-semibold text-muted-foreground shadow-card transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm",
        variant === "fixed" && "fixed left-4 top-20 z-40",
        className
      )}
      aria-label={resolvedLabel}
    >
      <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" />
      {resolvedLabel}
    </button>
  );
}
