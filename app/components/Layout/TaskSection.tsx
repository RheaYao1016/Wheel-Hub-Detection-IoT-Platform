import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type TaskSectionProps = {
  id?: string;
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function TaskSection({
  id,
  title,
  description,
  eyebrow,
  action,
  children,
  className,
}: TaskSectionProps) {
  return (
    <section id={id} className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              {eyebrow}
            </p>
          ) : null}
          <div className="space-y-1">
            <h2 className="text-2xl font-black tracking-tight">{title}</h2>
            {description ? (
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
