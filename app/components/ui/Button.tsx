import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--panel-bg-strong)] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] text-[var(--text-inverse)] shadow-lg shadow-[var(--accent)]/20 hover:shadow-xl hover:shadow-[var(--accent)]/30 hover:brightness-110",
        destructive:
          "bg-gradient-to-r from-[var(--danger)] to-rose-400 text-white shadow-lg shadow-[var(--danger)]/20 hover:shadow-xl hover:shadow-[var(--danger)]/30",
        outline:
          "border border-[var(--ring-strong)] bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)] hover:border-[var(--accent)]",
        secondary:
          "bg-[var(--surface-muted-strong)] text-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
        ghost:
          "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
        link: "text-[var(--accent)] underline-offset-4 hover:underline",
        glow: "bg-[var(--surface-elevated)] border border-[var(--ring-soft)] text-[var(--accent)] shadow-[0_0_20px_var(--accent)]/20 hover:shadow-[0_0_30px_var(--accent)]/30 hover:border-[var(--accent)]",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-lg px-3.5 text-xs",
        lg: "h-12 rounded-2xl px-8 text-base",
        xl: "h-14 rounded-2xl px-10 text-lg",
        icon: "h-10 w-10",
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
