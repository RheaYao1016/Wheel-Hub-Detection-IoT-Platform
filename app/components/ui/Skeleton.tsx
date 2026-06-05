"use client";

import React from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Base skeleton line (shimmer)
// ---------------------------------------------------------------------------

function SkeletonLine({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "animate-skeleton-shimmer rounded-md bg-[var(--surface-muted-strong)]",
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Skeleton block (generic)
// ---------------------------------------------------------------------------

function SkeletonBlock({
  className,
  style,
  rounded = "md",
}: {
  className?: string;
  style?: React.CSSProperties;
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "full";
}) {
  const radiusMap: Record<string, string> = {
    none: "rounded-none",
    sm: "rounded-[var(--radius-sm)]",
    md: "rounded-[var(--radius-md)]",
    lg: "rounded-[var(--radius-lg)]",
    xl: "rounded-[var(--radius-xl)]",
    full: "rounded-full",
  };

  return (
    <div
      className={cn(
        "animate-skeleton-shimmer bg-[var(--surface-muted-strong)]",
        radiusMap[rounded],
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
}

// ---------------------------------------------------------------------------
// Skeleton text (single or multi-line)
// ---------------------------------------------------------------------------

function SkeletonText({
  lines = 1,
  width,
  className,
  lineHeight = "1rem",
}: {
  lines?: number;
  width?: string | string[];
  className?: string;
  lineHeight?: string;
}) {
  const widths = Array.isArray(width) ? width : Array(lines).fill(width || "100%");

  return (
    <div className={cn("flex flex-col gap-2", className)} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine
          key={i}
          style={{
            height: lineHeight,
            width: widths[i] ?? widths[widths.length - 1],
          }}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton avatar (circle)
// ---------------------------------------------------------------------------

function SkeletonAvatar({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <SkeletonBlock
      className={cn("shrink-0", className)}
      style={{ width: size, height: size }}
      rounded="full"
    />
  );
}

// ---------------------------------------------------------------------------
// Skeleton card (typical dashboard card placeholder)
// ---------------------------------------------------------------------------

function SkeletonCard({
  className,
  headerLines = 1,
  contentLines = 3,
}: {
  className?: string;
  headerLines?: number;
  contentLines?: number;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)]/50 p-[var(--card-padding)] backdrop-blur-xl",
        className
      )}
      aria-hidden="true"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <SkeletonLine className="h-5 w-32" />
        <SkeletonBlock className="h-8 w-8" rounded="md" />
      </div>

      {/* Content */}
      <div className="space-y-3">
        <SkeletonLine className="h-4" />
        <SkeletonLine className="h-4 w-[90%]" />
        <SkeletonLine className="h-4 w-[75%]" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton table (data table placeholder)
// ---------------------------------------------------------------------------

function SkeletonTable({
  rows = 5,
  columns = 6,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)]/50 overflow-hidden backdrop-blur-xl",
        className
      )}
      aria-hidden="true"
    >
      {/* Header row */}
      <div className="flex border-b border-[var(--card-border)] px-6 py-3 gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <SkeletonLine key={`h-${i}`} className="h-4 flex-1" />
        ))}
      </div>

      {/* Data rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex px-6 py-3 gap-4 border-b border-[var(--card-border)]/40 last:border-b-0">
          {Array.from({ length: columns }).map((_, c) => (
            <SkeletonLine key={`${r}-${c}`} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton chart (ECharts placeholder)
// ---------------------------------------------------------------------------

function SkeletonChart({
  height = 280,
  className,
}: {
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)]/50 backdrop-blur-xl overflow-hidden",
        className
      )}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--card-border)]">
        <SkeletonLine className="h-5 w-40" />
        <SkeletonBlock className="h-8 w-20" rounded="md" />
      </div>
      <SkeletonBlock className="m-4" style={{ height }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton image (with rounded corners)
// ---------------------------------------------------------------------------

function SkeletonImage({
  width = "100%",
  height = 200,
  className,
  rounded = "lg",
}: {
  width?: string;
  height?: number;
  className?: string;
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "full";
}) {
  return (
    <SkeletonBlock
      className={className}
      style={{ width, height }}
      rounded={rounded}
    />
  );
}

// ---------------------------------------------------------------------------
// Skeleton list (generic vertical list)
// ---------------------------------------------------------------------------

function SkeletonList({
  items = 6,
  className,
  avatarSize,
}: {
  items?: number;
  className?: string;
  avatarSize?: number;
}) {
  return (
    <div className={cn("flex flex-col gap-4", className)} aria-hidden="true">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {avatarSize && <SkeletonAvatar size={avatarSize} />}
          <div className="flex-1 space-y-2">
            <SkeletonLine className="h-4 w-[70%]" />
            <SkeletonLine className="h-3 w-[50%]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export {
  SkeletonLine,
  SkeletonBlock,
  SkeletonText,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonTable,
  SkeletonChart,
  SkeletonImage,
  SkeletonList,
};
