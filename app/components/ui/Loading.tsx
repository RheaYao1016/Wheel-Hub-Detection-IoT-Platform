"use client";

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { Progress } from "./Progress";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LoadingVariant = "spinner" | "dots" | "bars" | "pulse" | "inline";
export type LoadingSize = "sm" | "md" | "lg" | "xl";

interface LoadingProps {
  /** Visual style of the loader */
  variant?: LoadingVariant;
  /** Size preset */
  size?: LoadingSize;
  /** Main label text */
  label?: string;
  /** Sub-text detail */
  description?: string;
  /** Show a progress bar with a specific value (0-100) */
  progress?: number;
  /** Full-screen overlay mode */
  overlay?: boolean;
  /** Whether the overlay should be transparent (true) or dimmed (false) */
  transparent?: boolean;
  /** Additional class names */
  className?: string;
  /** Custom color accent */
  accentColor?: string;
  /** Auto-hide after duration (ms). 0 = never. */
  autoHide?: number;
  /** Callback when loading finishes (autoHide or progress reaches 100) */
  onFinish?: () => void;
}

// ---------------------------------------------------------------------------
// Spinner variants
// ---------------------------------------------------------------------------

function SpinnerIcon({
  size,
  accent,
}: {
  size: number;
  accent?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      style={{ width: size, height: size }}
      className="animate-spin-slow"
    >
      <circle
        cx="24"
        cy="24"
        r="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.15"
      />
      <circle
        cx="24"
        cy="24"
        r="20"
        fill="none"
        stroke={accent ?? "currentColor"}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="60 80"
        strokeDashoffset="0"
        className="animate-spinner-arc"
      />
    </svg>
  );
}

function DotsLoader({ size }: { size: number }) {
  const dotSize = Math.round(size * 0.16);
  const gap = Math.round(size * 0.2);
  return (
    <div className="flex items-center gap-[var(--space-2)]">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="rounded-full bg-[var(--accent)]"
          style={{ width: dotSize, height: dotSize }}
          animate={{ y: [-4, -10, -4] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function BarsLoader({ size }: { size: number }) {
  const barW = Math.round(size * 0.08);
  const barH = Math.round(size * 0.6);
  return (
    <div className="flex items-end gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full bg-[var(--accent)]"
          style={{ width: barW, height: barH }}
          animate={{ scaleY: [0.3, 1, 0.3] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.1, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function PulseLoader({ size }: { size: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-[var(--accent)]"
          style={{ width: "100%", height: "100%" }}
          animate={{ scale: [0.4, 1.2], opacity: [0.6, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.4, ease: "easeOut" }}
        />
      ))}
      <div className="absolute w-3 h-3 rounded-full bg-[var(--accent-strong)]" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Size map
// ---------------------------------------------------------------------------

const SIZE_MAP: Record<LoadingSize, { spinner: number; text: string; label: string; description: string }> = {
  sm: { spinner: 24, text: "text-xs", label: "text-xs", description: "text-[10px]" },
  md: { spinner: 36, text: "text-sm", label: "text-sm", description: "text-xs" },
  lg: { spinner: 56, text: "text-base", label: "text-base", description: "text-sm" },
  xl: { spinner: 72, text: "text-lg", label: "text-lg", description: "text-base" },
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function Loading({
  variant = "spinner",
  size = "md",
  label,
  description,
  progress,
  overlay = false,
  transparent = false,
  className,
  accentColor,
  autoHide,
  onFinish,
}: LoadingProps) {
  const s = SIZE_MAP[size];
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (autoHide && autoHide > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onFinish?.();
      }, autoHide);
      return () => clearTimeout(timer);
    }
  }, [autoHide, onFinish]);

  useEffect(() => {
    if (typeof progress === "number" && progress >= 100) {
      const timer = setTimeout(() => {
        setVisible(false);
        onFinish?.();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [progress, onFinish]);

  if (!visible) return null;

  const loaderMap: Record<LoadingVariant, React.ReactNode> = {
    spinner: <SpinnerIcon size={s.spinner} accent={accentColor} />,
    dots: <DotsLoader size={s.spinner} />,
    bars: <BarsLoader size={s.spinner} />,
    pulse: <PulseLoader size={s.spinner} />,
    inline: <SpinnerIcon size={s.spinner} accent={accentColor} />,
  };

  const content = (
    <div className="flex flex-col items-center gap-4">
      <div
        className={cn(
          "text-[var(--accent)]",
          variant === "inline" && "inline-flex items-center"
        )}
      >
        {loaderMap[variant]}
      </div>

      {(label || description) && (
        <div className="flex flex-col items-center text-center">
          {label && (
            <p className={cn("font-semibold text-[var(--text-primary)]", s.label)}>
              {label}
            </p>
          )}
          {description && (
            <p className={cn("mt-1 text-[var(--text-secondary)]", s.description)}>
              {description}
            </p>
          )}
        </div>
      )}

      {typeof progress === "number" && (
        <div className="w-48">
          <Progress value={progress} className="h-1.5" />
          <p className="mt-1 text-center text-xs tabular-nums text-[var(--text-secondary)]">
            {Math.round(progress)}%
          </p>
        </div>
      )}
    </div>
  );

  if (overlay) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "fixed inset-0 z-[9000] flex items-center justify-center",
          transparent ? "bg-transparent" : "bg-[rgba(0,0,0,0.45)] backdrop-blur-sm"
        )}
        role="status"
        aria-live="polite"
      >
        <div className={cn("rounded-2xl bg-[var(--surface-elevated)] border border-[var(--ring-strong)] p-8 shadow-2xl", className)}>
          {content}
        </div>
      </motion.div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-center py-10",
        variant === "inline" && "inline-flex py-0",
        className
      )}
      role="status"
      aria-live="polite"
    >
      {content}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline loading for buttons / small spaces
// ---------------------------------------------------------------------------

export function LoadingInline({
  size = 16,
  accentColor,
  className,
}: {
  size?: number;
  accentColor?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex text-[var(--accent)]", className)}>
      <SpinnerIcon size={size} accent={accentColor} />
    </span>
  );
}
