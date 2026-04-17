"use client";

import { useLocale } from "../Locale/LocaleProvider";

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

  return (
    <section className="workflow-steps-shell">
      <div className="workflow-steps-head">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <div className="workflow-steps-track">
        {steps.map((step, index) => {
          const content = (
            <>
              <div className="workflow-step-index">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div className="workflow-step-copy">
                <span className="workflow-step-state">
                  {stateLabel[step.state]}
                </span>
                <strong>{step.title}</strong>
                <em>{step.detail}</em>
              </div>
            </>
          );

          if (!step.onClick) {
            return (
              <article
                key={step.id}
                className={`workflow-step-card workflow-step-${step.state}`}
              >
                {content}
              </article>
            );
          }

          return (
            <button
              key={step.id}
              type="button"
              className={`workflow-step-card workflow-step-${step.state}`}
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
