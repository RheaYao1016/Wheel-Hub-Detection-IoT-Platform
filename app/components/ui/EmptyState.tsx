"use client";

import React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EmptyVariant = "nodata" | "nosearch" | "error" | "offline" | "permission" | "custom";

interface EmptyStateProps {
  /** Preset scenario */
  variant?: EmptyVariant;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Action button(s) */
  action?: {
    label: string;
    onClick: () => void;
    variant?: React.ComponentProps<typeof Button>["variant"];
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    variant?: React.ComponentProps<typeof Button>["variant"];
  };
  /** Custom icon (SVG node or emoji) */
  icon?: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Size preset */
  size?: "sm" | "md" | "lg";
  /** Full height fill mode */
  fill?: boolean;
}

// ---------------------------------------------------------------------------
// Preset icons
// ---------------------------------------------------------------------------

const PRESET_ICONS: Record<Exclude<EmptyVariant, "custom">, React.ReactNode> = {
  nodata: (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
      <rect x="8" y="16" width="64" height="48" rx="6" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4" />
      <path d="M28 36h24M28 44h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="56" cy="24" r="10" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M53 24h6M56 21v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  nosearch: (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
      <circle cx="34" cy="34" r="16" stroke="currentColor" strokeWidth="2" />
      <path d="M46 46l14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M26 34h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M28 28l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 2" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
      <circle cx="40" cy="40" r="28" stroke="currentColor" strokeWidth="2" />
      <path d="M40 24v20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="40" cy="52" r="2" fill="currentColor" />
    </svg>
  ),
  offline: (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
      <path d="M16 48c14-14 34-14 48 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 40c9-9 23-9 32 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 32c4.5-4.5 11.5-4.5 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="48" x2="40" y2="56" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="20" y1="20" x2="60" y2="60" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  permission: (
    <svg viewBox="0 0 80 80" fill="none" className="w-full h-full">
      <rect x="24" y="12" width="32" height="44" rx="4" stroke="currentColor" strokeWidth="2" />
      <path d="M32 12V8a8 8 0 0116 0v4" stroke="currentColor" strokeWidth="2" />
      <circle cx="40" cy="34" r="4" fill="currentColor" />
      <path d="M40 38v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M50 62l8 8M58 62l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Size map
// ---------------------------------------------------------------------------

const SIZE_MAP = {
  sm: { icon: "w-10 h-10", title: "text-sm", desc: "text-xs", gap: "gap-4", padding: "py-8" },
  md: { icon: "w-16 h-16", title: "text-base", desc: "text-sm", gap: "gap-6", padding: "py-14" },
  lg: { icon: "w-24 h-24", title: "text-xl", desc: "text-base", gap: "gap-6", padding: "py-20" },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EmptyState({
  variant = "nodata",
  title,
  description,
  action,
  secondaryAction,
  icon,
  className,
  size = "md",
  fill = false,
}: EmptyStateProps) {
  const s = SIZE_MAP[size];
  const iconColor = variant === "error" || variant === "offline"
    ? "text-[var(--danger)]"
    : variant === "permission"
      ? "text-[var(--warning)]"
      : "text-[var(--text-secondary)]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex flex-col items-center justify-center text-center",
        s.padding,
        s.gap,
        fill && "min-h-[60vh]",
        className
      )}
      role="status"
    >
      {/* Icon */}
      <div className={cn(s.icon, iconColor, "opacity-60")}>
        {icon ?? PRESET_ICONS[variant as Exclude<EmptyVariant, "custom">]}
      </div>

      {/* Text */}
      <div>
        <h3 className={cn("font-semibold text-[var(--text-primary)]", s.title)}>
          {title}
        </h3>
        {description && (
          <p className={cn("mt-1 text-[var(--text-secondary)]", s.desc)}>
            {description}
          </p>
        )}
      </div>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-2">
          {action && (
            <Button variant={action.variant ?? "default"} onClick={action.onClick} size="sm">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant={secondaryAction.variant ?? "outline"} onClick={secondaryAction.onClick} size="sm">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </motion.div>
  );
}
