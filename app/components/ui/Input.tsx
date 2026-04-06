import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-xl border border-[var(--ring-soft)] bg-[var(--surface-elevated)] px-4 py-2 text-sm text-[var(--text-primary)] transition-all duration-200",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium",
          "placeholder:text-[var(--text-secondary)]/60",
          "focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "hover:border-[var(--ring-strong)]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
