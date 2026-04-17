"use client";

import React from "react";
import { useLocale } from "../Locale/LocaleProvider";

interface FormattedNumberProps {
  value: number | string;
  format?: "number" | "percent" | "currency" | "decimal" | "integer";
  precision?: number;
  className?: string;
  showSign?: boolean;
  locale?: string;
  style?: React.CSSProperties;
}

export function FormattedNumber({
  value,
  format = "number",
  precision = 0,
  className = "",
  showSign = false,
  style,
}: FormattedNumberProps) {
  const { locale } = useLocale();
  
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return <span className={className} style={style}>{value}</span>;
  }

  let formattedValue: string;
  const localeStr = locale;

  switch (format) {
    case "percent":
      formattedValue = new Intl.NumberFormat(localeStr, {
        style: "percent",
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      }).format(numValue / 100);
      break;
    case "currency":
      formattedValue = new Intl.NumberFormat(localeStr, {
        style: "currency",
        currency: locale === "zh-CN" ? "CNY" : "USD",
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      }).format(numValue);
      break;
    case "decimal":
      formattedValue = new Intl.NumberFormat(localeStr, {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      }).format(numValue);
      break;
    case "integer":
      formattedValue = new Intl.NumberFormat(localeStr, {
        maximumFractionDigits: 0,
      }).format(Math.round(numValue));
      break;
    default:
      formattedValue = new Intl.NumberFormat(localeStr, {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      }).format(numValue);
  }

  if (showSign && numValue > 0) {
    formattedValue = `+${formattedValue}`;
  }

  return (
    <span
      className={`font-tabular-nums ${className}`}
      style={{
        fontFeatureSettings: "'tnum' on, 'lnum' on",
        ...style,
      }}
    >
      {formattedValue}
    </span>
  );
}

interface MetricDisplayProps {
  label: string;
  value: number | string;
  unit?: string;
  trend?: "up" | "down" | "stable";
  trendValue?: number;
  format?: "number" | "percent" | "decimal" | "integer";
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "default" | "accent" | "warning" | "danger" | "success";
  className?: string;
  icon?: React.ReactNode;
}

export function MetricDisplay({
  label,
  value,
  unit,
  trend,
  trendValue,
  format = "number",
  size = "md",
  variant = "default",
  className = "",
  icon,
}: MetricDisplayProps) {
  const { text } = useLocale();

  const sizeClasses = {
    sm: { value: "text-lg", label: "text-[10px]", gap: "gap-0.5" },
    md: { value: "text-2xl", label: "text-xs", gap: "gap-1" },
    lg: { value: "text-3xl", label: "text-sm", gap: "gap-1.5" },
    xl: { value: "text-4xl", label: "text-base", gap: "gap-2" },
  };

  const variantStyles = {
    default: {
      text: "text-[var(--text-primary)]",
      bg: "bg-gradient-to-br from-[var(--card-bg)] to-[var(--surface-elevated)]",
      border: "border-[var(--border-subtle)]",
      glow: "",
    },
    accent: {
      text: "text-[var(--accent)]",
      bg: "bg-gradient-to-br from-[var(--accent)]/10 to-[var(--accent-deep)]/5",
      border: "border-[var(--accent)]/30",
      glow: "shadow-[0_0_20px_-5px_var(--accent)]",
    },
    warning: {
      text: "text-[var(--warning)]",
      bg: "bg-gradient-to-br from-[var(--warning)]/10 to-[var(--warning)]/5",
      border: "border-[var(--warning)]/30",
      glow: "shadow-[0_0_20px_-5px_var(--warning)]",
    },
    danger: {
      text: "text-[var(--danger)]",
      bg: "bg-gradient-to-br from-[var(--danger)]/10 to-[var(--danger)]/5",
      border: "border-[var(--danger)]/30",
      glow: "shadow-[0_0_20px_-5px_var(--danger)]",
    },
    success: {
      text: "text-[var(--success)]",
      bg: "bg-gradient-to-br from-[var(--success)]/10 to-[var(--success)]/5",
      border: "border-[var(--success)]/30",
      glow: "shadow-[0_0_20px_-5px_var(--success)]",
    },
  };

  const currentVariant = variantStyles[variant];
  const currentSize = sizeClasses[size];

  return (
    <div
      className={`relative overflow-hidden rounded-xl border p-4 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${currentVariant.bg} ${currentVariant.border} ${currentVariant.glow} ${className}`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 opacity-10 pointer-events-none">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <defs>
            <pattern id="grid-pattern" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid-pattern)" />
        </svg>
      </div>

      <div className={`relative flex items-start justify-between ${currentSize.gap}`}>
        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-2 mb-2`}>
            {icon && (
              <span className={`${currentSize.label} ${currentVariant.text} opacity-70`}>
                {icon}
              </span>
            )}
            <span className={`uppercase tracking-widest font-semibold ${currentSize.label} text-[var(--text-secondary)]`}>
              {label}
            </span>
          </div>

          <div className="flex items-baseline gap-2 flex-wrap">
            <span
              className={`${currentSize.value} font-black tracking-tight ${currentVariant.text} font-tabular-nums`}
              style={{ 
                fontFeatureSettings: "'tnum' on, 'lnum' on'",
                letterSpacing: "-0.02em"
              }}
            >
              <FormattedNumber value={value} format={format} />
            </span>
            {unit && (
              <span className={`font-medium ${currentSize.label} text-[var(--text-muted)] uppercase tracking-wide`}>
                {unit}
              </span>
            )}
          </div>

          {(trend || trendValue !== undefined) && (
            <div className="mt-2 flex items-center gap-2 px-2 py-1 rounded-full bg-white/5 w-fit">
              {trend === "up" && (
                <>
                  <svg className={`w-3.5 h-3.5 text-[var(--success)]`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                  <span className={`text-xs font-bold text-[var(--success)]`}>
                    +{trendValue !== undefined ? <FormattedNumber value={trendValue} format="percent" precision={1} /> : ""}
                  </span>
                </>
              )}
              {trend === "down" && (
                <>
                  <svg className={`w-3.5 h-3.5 text-[var(--danger)]`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                  <span className={`text-xs font-bold text-[var(--danger)]`}>
                    {trendValue !== undefined ? <FormattedNumber value={trendValue} format="percent" precision={1} /> : ""}
                  </span>
                </>
              )}
              {trend === "stable" && (
                <>
                  <svg className={`w-3.5 h-3.5 text-[var(--text-secondary)]`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                  </svg>
                  <span className={`text-xs font-medium text-[var(--text-secondary)]`}>
                    {text("稳定", "Stable")}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface StatusBadgeProps {
  status: "online" | "offline" | "warning" | "error" | "loading" | string;
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function StatusBadge({ status, pulse = true, size = "md", className = "" }: StatusBadgeProps) {
  const { text } = useLocale();

  const statusConfig: Record<string, { 
    color: string; 
    bg: string; 
    borderColor: string;
    labelZh: string; 
    labelEn: string;
    gradient: string;
  }> = {
    online: {
      color: "text-emerald-300",
      bg: "bg-emerald-500",
      borderColor: "border-emerald-500/40",
      labelZh: "在线",
      labelEn: "Online",
      gradient: "from-emerald-500/20 to-emerald-600/10",
    },
    offline: {
      color: "text-gray-400",
      bg: "bg-gray-500",
      borderColor: "border-gray-500/40",
      labelZh: "离线",
      labelEn: "Offline",
      gradient: "from-gray-500/20 to-gray-600/10",
    },
    warning: {
      color: "text-amber-300",
      bg: "bg-amber-500",
      borderColor: "border-amber-500/40",
      labelZh: "警告",
      labelEn: "Warning",
      gradient: "from-amber-500/20 to-amber-600/10",
    },
    error: {
      color: "text-red-300",
      bg: "bg-red-500",
      borderColor: "border-red-500/40",
      labelZh: "错误",
      labelEn: "Error",
      gradient: "from-red-500/20 to-red-600/10",
    },
    loading: {
      color: "text-blue-300",
      bg: "bg-blue-500",
      borderColor: "border-blue-500/40",
      labelZh: "加载中",
      labelEn: "Loading",
      gradient: "from-blue-500/20 to-blue-600/10",
    },
  };

  const config = statusConfig[status.toLowerCase()] || statusConfig.offline;

  const sizeClasses = {
    sm: "px-2.5 py-1 text-[10px] gap-1.5",
    md: "px-3.5 py-1.5 text-xs gap-2",
    lg: "px-4 py-2 text-sm gap-2.5",
  };

  const dotSizes = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border backdrop-blur-md transition-all duration-200 hover:scale-105 bg-gradient-to-r ${config.gradient} ${config.borderColor} ${config.color} ${sizeClasses[size]} ${className}`}
    >
      <span
        className={`relative flex rounded-full ${config.bg} ${dotSizes[size]}`}
      >
        {pulse && status.toLowerCase() === "online" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-75" />
        )}
        {pulse && status.toLowerCase() === "loading" && (
          <span className="absolute inline-flex h-full w-full animate-pulse rounded-full bg-current opacity-50" />
        )}
      </span>
      <span className="tracking-wide uppercase font-semibold">
        {text(config.labelZh, config.labelEn)}
      </span>
    </span>
  );
}

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  showValue?: boolean;
  label?: string;
  className?: string;
}

export function ProgressRing({ 
  value, 
  max = 100, 
  size = 80, 
  strokeWidth = 6,
  color = "var(--accent)",
  bgColor = "var(--border-default)",
  showValue = true,
  label,
  className = ""
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percentage = Math.min((value / max) * 100, 100);
  const offset = circumference - (percentage / 100) * circumference;
  
  const center = size / 2;
  
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        className="-rotate-90 transform"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          className="opacity-20"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out drop-shadow-[0_0_8px_currentColor]"
        />
      </svg>
      
      {(showValue || label) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {showValue && (
            <span 
              className="font-black tabular-nums"
              style={{ fontSize: `${size * 0.22}px`, fontFeatureSettings: "'tnum' on, 'lnum' on'" }}
            >
              <FormattedNumber value={percentage} format="integer" />
              <span className="text-xs opacity-70">%</span>
            </span>
          )}
          {label && (
            <span className="text-[9px] uppercase tracking-wider opacity-60 mt-0.5">
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface DataCardProps {
  title: string;
  subtitle?: string;
  value: number | string;
  unit?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "stable";
  trendValue?: number;
  format?: "number" | "percent" | "decimal" | "integer";
  variant?: "default" | "gradient" | "glass" | "neon";
  className?: string;
  children?: React.ReactNode;
}

export function DataCard({
  title,
  subtitle,
  value,
  unit,
  icon,
  trend,
  trendValue,
  format = "number",
  variant = "default",
  className = "",
  children,
}: DataCardProps) {
  const variantStyles = {
    default: "bg-[var(--card-bg)] border-[var(--border-subtle)]",
    gradient: "bg-gradient-to-br from-[var(--accent)]/20 via-[var(--card-bg)] to-[var(--success)]/10 border-[var(--accent)]/30",
    glass: "bg-white/5 backdrop-blur-xl border-white/10 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)]",
    neon: "bg-[var(--card-bg)] border-[var(--accent)] shadow-[0_0_30px_-10px_var(--accent),inset_0_0_20px_rgba(0,0,0,0.2)]",
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl ${variantStyles[variant]} ${className}`}
    >
      <div className="absolute top-0 right-0 w-64 h-64 opacity-5 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-[var(--accent)] to-transparent rotate-45 translate-x-1/2 -translate-y-1/2" />
      </div>

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-secondary)]">
              {title}
            </h3>
            {subtitle && (
              <p className="text-xs text-[var(--text-muted)] line-clamp-1">
                {subtitle}
              </p>
            )}
          </div>
          
          {icon && (
            <div className="p-2 rounded-xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent-deep)]/10 text-[var(--accent)] group-hover:scale-110 transition-transform duration-300">
              {icon}
            </div>
          )}
        </div>

        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tighter tabular-nums text-[var(--text-primary)]" style={{ fontFeatureSettings: "'tnum' on, 'lnum' on'" }}>
                <FormattedNumber value={value} format={format} />
              </span>
              {unit && (
                <span className="text-sm font-medium text-[var(--text-muted)] uppercase">
                  {unit}
                </span>
              )}
            </div>

            {(trend || trendValue !== undefined) && (
              <div className="flex items-center gap-1.5">
                {trend === "up" && (
                  <svg className="w-4 h-4 text-[var(--success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                  </svg>
                )}
                {trend === "down" && (
                  <svg className="w-4 h-4 text-[var(--danger)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                )}
                {trendValue !== undefined && (
                  <span className={`text-xs font-bold ${trend === "up" ? "text-[var(--success)]" : trend === "down" ? "text-[var(--danger)]" : "text-[var(--text-secondary)]"}`}>
                    <FormattedNumber value={trendValue} format="percent" precision={1} />
                  </span>
                )}
              </div>
            )}
          </div>

          {children && (
            <div className="ml-4">
              {children}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
