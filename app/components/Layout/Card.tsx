import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export default function Card({ children, title, className = "" }: CardProps) {
  const classes = ["card-surface", className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
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
