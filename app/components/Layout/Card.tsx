import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, title, className = "", onClick }: CardProps) {
  const isInteractive = typeof onClick === "function";
  const classes = ["card-surface", isInteractive ? "card-interactive" : "", className].filter(Boolean).join(" ");

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
          <span className="h-2 w-2 rounded-full bg-gradient-to-tr from-[#5bbdf7] to-[#51d3c3] shadow-[0_0_12px_rgba(91,189,247,0.45)]"></span>
          <span className="text-lg font-semibold tracking-wide text-white">{title}</span>
        </div>
      )}
      {children}
    </div>
  );
}
