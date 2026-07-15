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
      "bg-card border border-border backdrop-blur-xl",
    glass:
      "bg-card/55 border border-border/60 backdrop-blur-2xl",
    elevated:
      "bg-popover border border-border shadow-card-hover",
    bordered:
      "bg-transparent border-2 border-primary/25 hover:border-primary/45",
    gradient:
      "bg-gradient-to-br from-card to-popover border border-border backdrop-blur-xl",
  };

  const classes = cn(
    "group relative overflow-hidden rounded-lg p-6 transition-all duration-300",
    "shadow-card hover:shadow-card-hover",
    variantStyles[variant],
    isInteractive && [
      "cursor-pointer",
      "hover:border-primary/30",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      "active:scale-[0.995]",
    ],
    !isInteractive && "hover:border-ring/20",
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
        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-gradient-to-b from-primary/5 to-transparent" />
      )}

      {(title || headerAction) && (
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                {icon}
              </div>
            )}
            {title && (
              <h3 className="text-base font-semibold">
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
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-r from-transparent via-primary to-transparent" />
      )}
    </div>
  );
}
