import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  title?: string;
  className?: string;
  onClick?: () => void;
  variant?: "default" | "glass" | "elevated" | "bordered" | "gradient";
  headerAction?: ReactNode;
  icon?: ReactNode;
}

export default function Card({
  children,
  title,
  className = "",
  onClick,
  variant = "default",
  headerAction,
  icon,
  ...rest
}: CardProps) {
  const isInteractive = typeof onClick === "function";

  const variantStyles = {
    default:
      "bg-[var(--card-bg)] border border-[var(--card-border)] backdrop-blur-xl",
    glass:
      "bg-[var(--card-bg)]/50 border border-[var(--ring-soft)]/60 backdrop-blur-2xl",
    elevated:
      "bg-[var(--surface-elevated)] border border-[var(--ring-strong)]/40 shadow-[var(--shadow-lg)]",
    bordered:
      "bg-transparent border-2 border-[var(--accent)]/25 hover:border-[var(--accent)]/45",
    gradient:
      "bg-gradient-to-br from-[var(--card-bg)] to-[var(--surface-elevated)] border border-[var(--card-border)] backdrop-blur-xl",
  };

  const classes = cn(
    "group relative overflow-hidden rounded-[var(--card-radius)] p-[var(--card-padding)] transition-all duration-300",
    "shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)]",
    variantStyles[variant],
    isInteractive && [
      "cursor-pointer",
      "hover:shadow-[var(--shadow-sm)] hover:border-[var(--accent)]/30",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel-bg-strong)]",
      "active:scale-[0.995] active:shadow-[var(--shadow-sm)]",
    ],
    !isInteractive && "hover:border-[var(--ring-strong)]/20",
    className
  );

  return (
    <div
      {...rest}
      className={classes}
      onClick={onClick}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={
        isInteractive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      {variant === "gradient" && (
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--accent) 8%, transparent), transparent 60%)",
          }}
        />
      )}

      {(title || headerAction) && (
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent)]/10 text-[var(--accent)]">
                {icon}
              </div>
            )}
            {title && (
              <h3
                className="text-base font-semibold text-[var(--text-primary)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {title}
              </h3>
            )}
          </div>
          {headerAction && (
            <div className="shrink-0">{headerAction}</div>
          )}
        </div>
      )}

      <div className="relative z-10">{children}</div>

      {isInteractive && (
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--accent), transparent)",
          }}
        />
      )}
    </div>
  );
}
