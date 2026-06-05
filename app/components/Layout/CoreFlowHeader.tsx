"use client";

import type { ReactNode } from "react";
import Card from "./Card";
import { useLocale } from "../Locale/LocaleProvider";

type CoreFlowStageState = "done" | "active" | "upcoming";

type CoreFlowMetric = {
  label: string;
  value: string;
  note: string;
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
  const { t } = useLocale();

  const stateLabel: Record<CoreFlowStageState, string> = {
    done: t("common.done", undefined, "Done"),
    active: t("common.now", undefined, "Now"),
    upcoming: t("common.next", undefined, "Next"),
  };

  return (
    <section id={id} className="core-flow-hero">
      <Card className="core-flow-intro-card glow-border">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>

        {actions ? <div className="core-flow-actions">{actions}</div> : null}

        {sideNote ? <div className="core-flow-note">{sideNote}</div> : null}
      </Card>

      <Card className="core-flow-stage-card">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">{t("pages.home.copy017", undefined, "Flow Board")}</span>
            <h2>
              {t("pages.home.copy009", undefined, "Observe")} {"->"} {t("pages.home.copy011", undefined, "Diagnose")} {"->"} {t("pages.home.copy013", undefined, "Act")} {"->"} {t("pages.home.copy015", undefined, "Close")}
            </h2>
          </div>
        </div>

        <div className="core-flow-stage-grid">
          {stages.map((stage, index) => (
            <article
              key={stage.id}
              className={`core-flow-stage-item core-flow-stage-${stage.state}`}
            >
              <div className="core-flow-stage-index">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div>
                <span className="core-flow-stage-label">
                  {stateLabel[stage.state]}
                </span>
                <strong>{stage.title}</strong>
                <p>{stage.detail}</p>
              </div>
            </article>
          ))}
        </div>
      </Card>

      <section className="core-flow-metric-grid">
        {metrics.map((metric) => (
          <Card key={metric.label} className="core-flow-metric-card">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <p>{metric.note}</p>
          </Card>
        ))}
      </section>
    </section>
  );
}
