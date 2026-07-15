"use client";

import { Check, Loader2 } from "lucide-react";
import { useLocale } from "../Locale/LocaleProvider";
import { cn } from "@/lib/utils";

type WorkflowStepState = "done" | "active" | "upcoming";

export type WorkflowStep = {
  id: string;
  title: string;
  detail: string;
  state: WorkflowStepState;
  onClick?: () => void;
};

type WorkflowStepsProps = {
  title: string;
  subtitle: string;
  steps: WorkflowStep[];
};

export default function WorkflowSteps({
  title,
  subtitle,
  steps,
}: WorkflowStepsProps) {
  const { t } = useLocale();

  const stateLabel: Record<WorkflowStepState, string> = {
    done: t("common.done", undefined, "Done"),
    active: t("common.now", undefined, "Now"),
    upcoming: t("common.next", undefined, "Next"),
  };

  const stateStyles: Record<WorkflowStepState, string> = {
    done: "border-success/30 bg-success/5",
    active: "border-primary/40 bg-primary/5",
    upcoming: "border-border bg-card/40",
  };

  const stateText: Record<WorkflowStepState, string> = {
    done: "text-success",
    active: "text-primary",
    upcoming: "text-muted-foreground",
  };

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-card/60 p-5 sm:p-6">
      <div className="mb-4 space-y-1 sm:mb-5">
        <h2 className="text-lg font-bold tracking-tight sm:text-xl">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => {
          const content = (
            <>
              <div
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-black",
                  step.state === "done"
                    ? "border-success/40 bg-success text-success-foreground"
                    : step.state === "active"
                      ? "border-primary/40 bg-primary text-primary-foreground"
                      : "border-border bg-muted text-muted-foreground"
                )}
              >
                {step.state === "done" ? (
                  <Check className="h-5 w-5" />
                ) : step.state === "active" ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  String(index + 1).padStart(2, "0")
                )}
              </div>

              <div className="min-w-0 flex-1">
                <span
                  className={cn(
                    "mb-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                    step.state === "done"
                      ? "bg-success/15 text-success"
                      : step.state === "active"
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground",
                    stateText[step.state]
                  )}
                >
                  {stateLabel[step.state]}
                </span>
                <strong
                  className={cn(
                    "block text-sm font-semibold",
                    step.state === "upcoming" && "text-muted-foreground"
                  )}
                >
                  {step.title}
                </strong>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {step.detail}
                </p>
              </div>
            </>
          );

          const className = cn(
            "relative flex items-start gap-4 rounded-xl border p-4 text-left transition-all duration-300",
            stateStyles[step.state],
            step.onClick &&
              "cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-card"
          );

          if (!step.onClick) {
            return (
              <article key={step.id} className={className}>
                {content}
              </article>
            );
          }

          return (
            <button
              key={step.id}
              type="button"
              className={className}
              onClick={step.onClick}
            >
              {content}
            </button>
          );
        })}
      </div>
    </section>
  );
}
