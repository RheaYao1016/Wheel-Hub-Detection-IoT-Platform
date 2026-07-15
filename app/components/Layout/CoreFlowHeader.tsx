import type { ReactNode } from "react";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import Card from "./Card";

type CoreFlowStageState = "done" | "active" | "upcoming";

type CoreFlowMetric = {
  label: string;
  value: string;
  note: string;
  icon?: ReactNode;
};

type CoreFlowStage = {
  id: string;
  title: string;
  detail: string;
  state: CoreFlowStageState;
};

type CoreFlowHeaderProps = {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  metrics: CoreFlowMetric[];
  stages: CoreFlowStage[];
  actions?: ReactNode;
  sideNote?: ReactNode;
};

const STAGE_STATE_LABEL: Record<CoreFlowStageState, string> = {
  done: "Completed",
  active: "Current",
  upcoming: "Queued",
};

const stateIcon: Record<CoreFlowStageState, ReactNode> = {
  done: <CheckCircle2 className="h-4 w-4 text-success" />,
  active: <Circle className="h-4 w-4 text-primary" />,
  upcoming: <Clock className="h-4 w-4 text-muted-foreground" />,
};

export type { CoreFlowMetric, CoreFlowStage, CoreFlowStageState };

export default function CoreFlowHeader({
  id,
  eyebrow,
  title,
  description,
  metrics,
  stages,
  actions,
  sideNote,
}: CoreFlowHeaderProps) {
  return (
    <section id={id} className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2 border-primary/10 bg-gradient-to-br from-card to-popover">
        <span className="mb-2 inline-block text-xs font-semibold uppercase tracking-widest text-primary">
          {eyebrow}
        </span>
        <h1 className="mb-3 text-3xl font-black leading-tight tracking-tight md:text-4xl">
          {title}
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground md:text-base">
          {description}
        </p>

        {actions ? (
          <div className="mb-6 flex flex-wrap gap-3">{actions}</div>
        ) : null}

        {sideNote ? (
          <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm">
            {sideNote}
          </div>
        ) : null}
      </Card>

      <Card className="border-border/60">
        <div className="mb-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Flow Board
          </span>
          <h2 className="mt-1 text-base font-bold">Observe → Diagnose → Act → Close</h2>
        </div>

        <div className="space-y-3">
          {stages.map((stage, index) => (
            <article
              key={stage.id}
              className="flex items-start gap-3 rounded-lg border border-border/40 bg-card/50 p-3"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {stateIcon[stage.state]}
                  {STAGE_STATE_LABEL[stage.state]}
                </span>
                <strong className="block text-sm font-semibold">{stage.title}</strong>
                <p className="text-xs text-muted-foreground">{stage.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </Card>

      <section className="contents lg:col-span-3">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <Card key={metric.label} className="border-border/60">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {metric.label}
                </span>
                {metric.icon ? (
                  <span className="text-primary">{metric.icon}</span>
                ) : null}
              </div>
              <strong className="mt-2 block text-3xl font-black tracking-tight text-foreground">
                {metric.value}
              </strong>
              <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
            </Card>
          ))}
        </div>
      </section>
    </section>
  );
}
