import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[var(--accent)]/20 text-[var(--accent)]",
        secondary:
          "border-transparent bg-[var(--surface-muted-strong)] text-[var(--text-secondary)]",
        destructive:
          "border-transparent bg-[var(--danger)]/20 text-[var(--danger)]",
        success:
          "border-transparent bg-[var(--accent-strong)]/20 text-[var(--accent-strong)]",
        warning:
          "border-transparent bg-[var(--accent-warm)]/20 text-[var(--accent-warm)]",
        outline: "border-[var(--ring-strong)] text-[var(--text-secondary)]",
        glow: "border-[var(--accent)]/50 bg-[var(--accent)]/10 text-[var(--accent)] shadow-[0_0_12px_var(--accent)]/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
