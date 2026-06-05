import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel-bg-strong)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] text-[var(--text-inverse)] shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] hover:brightness-110 active:scale-[0.98] hover:-translate-y-px rounded-[var(--radius-lg)]",
        destructive:
          "bg-gradient-to-r from-[var(--danger)] to-rose-400 text-white shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)] hover:brightness-110 active:scale-[0.98] hover:-translate-y-px rounded-[var(--radius-lg)]",
        outline:
          "border border-[var(--ring-strong)] bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)] hover:border-[var(--accent)] hover:-translate-y-px active:scale-[0.98] rounded-[var(--radius-lg)]",
        secondary:
          "bg-[var(--surface-muted-strong)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)] hover:-translate-y-px active:scale-[0.98] rounded-[var(--radius-lg)]",
        ghost:
          "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)] active:scale-[0.98] rounded-[var(--radius-lg)]",
        link:
          "text-[var(--accent)] underline-offset-4 hover:underline",
        glow:
          "bg-[var(--surface-elevated)] border border-[var(--ring-soft)] text-[var(--accent)] shadow-[var(--shadow-glow)] hover:shadow-[0_0_50px_var(--accent)]/30 hover:border-[var(--accent)] hover:-translate-y-px active:scale-[0.98] rounded-[var(--radius-lg)]",
      },
      size: {
        default: "h-10 px-5 py-2 text-sm",
        sm: "h-8 rounded-[var(--radius-md)] px-3.5 text-xs",
        lg: "h-12 rounded-[var(--radius-xl)] px-8 text-base",
        xl: "h-14 rounded-[var(--radius-xl)] px-10 text-lg",
        icon: "h-10 w-10 rounded-[var(--radius-lg)]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Show a loading spinner and disable the button */
  loading?: boolean;
  /** Loading spinner size */
  loadingSize?: number;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingSize = 16,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const effectiveDisabled = disabled || loading;

    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={effectiveDisabled}
        aria-busy={loading}
        {...props}
      >
        {loading && (
          <span className="inline-flex items-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              style={{ width: loadingSize, height: loadingSize }}
              className="animate-spin-slow"
            >
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2"
                strokeOpacity="0.2"
              />
              <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="30 30"
                strokeDashoffset="0"
                className="animate-spinner-arc"
              />
            </svg>
          </span>
        )}
        <span className={cn("inline-flex items-center gap-2", loading && "opacity-60")}>
          {children}
        </span>
      </Comp>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
