import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
  onClick?: () => void;
  variant?: "default" | "glass" | "elevated" | "bordered";
}

export default function Card({ children, title, className = "", onClick, variant = "default" }: CardProps) {
  const isInteractive = typeof onClick === "function";
  
  const variantStyles = {
    default: "bg-[var(--card-bg)] border border-[var(--card-border)] backdrop-blur-xl",
    glass: "bg-[var(--card-bg)]/60 border border-[var(--ring-soft)] backdrop-blur-2xl",
    elevated: "bg-[var(--surface-elevated)] border border-[var(--ring-strong)] shadow-2xl",
    bordered: "bg-transparent border-2 border-[var(--accent)]/30",
  };

  const classes = cn(
    "card-surface rounded-[var(--card-radius)] p-[var(--card-padding)] shadow-[var(--shadow-strong)]",
    "transition-all duration-300 ease-out",
    variantStyles[variant],
    isInteractive && [
      "cursor-pointer",
      "hover:scale-[1.01] hover:shadow-2xl hover:border-[var(--accent)]/50",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
      "active:scale-[0.99]",
    ],
    className
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isInteractive) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      className={classes}
      onClick={onClick}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      {title && (
        <div className="mb-4 flex items-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-strong)] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)]"></span>
          </span>
          <span className="text-lg font-semibold tracking-wide text-[var(--text-primary)]">{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}
