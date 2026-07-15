import type { ReactNode } from "react";
import { Badge } from "../ui/Badge";
import Card from "./Card";
import { cn } from "@/lib/utils";

export type WorkflowHeroStat = {
  label: string;
  value: string;
  detail?: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "info";
};

type WorkflowHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  badgeVariant?: "default" | "secondary" | "destructive" | "success" | "warning" | "info" | "outline" | "glow";
  stats?: WorkflowHeroStat[];
  actions?: ReactNode;
  aside?: ReactNode;
};

const toneStyles: Record<NonNullable<WorkflowHeroStat["tone"]>, string> = {
  default: "text-foreground",
  success: "text-success",
  warning: "text-warning",
  info: "text-info",
};

export default function WorkflowHero({
  eyebrow,
  title,
  description,
  badgeVariant = "outline",
  stats = [],
  actions,
  aside,
}: WorkflowHeroProps) {
  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-popover p-6 sm:p-8">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.75fr)]">
        <div className="space-y-5">
          <Badge variant={badgeVariant} className="w-fit">
            {eyebrow}
          </Badge>
          <div className="space-y-3">
            <h1 className="max-w-4xl text-3xl font-black tracking-tight text-balance lg:text-5xl">
              {title}
            </h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              {description}
            </p>
          </div>

          {actions ? (
            <div className="flex flex-wrap gap-3">
              {actions}
            </div>
          ) : null}

          {stats.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat) => (
                <Card
                  key={`${stat.label}-${stat.value}`}
                  variant="glass"
                  className="min-h-[132px] border-border/60 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {stat.label}
                      </p>
                      <div
                        className={cn(
                          "text-2xl font-black tracking-tight",
                          toneStyles[stat.tone ?? "default"],
                        )}
                      >
                        {stat.value}
                      </div>
                      {stat.detail ? (
                        <p className="text-sm text-muted-foreground">
                          {stat.detail}
                        </p>
                      ) : null}
                    </div>
                    {stat.icon ? (
                      <div className="rounded-2xl border border-border/60 bg-background/60 p-2.5 text-primary">
                        {stat.icon}
                      </div>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          ) : null}
        </div>

        {aside ? (
          <div className="h-full">
            {aside}
          </div>
        ) : null}
      </div>
    </section>
  );
}
