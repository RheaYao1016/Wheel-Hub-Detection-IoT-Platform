"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BackButton from "../components/Layout/BackButton";
import Card from "../components/Layout/Card";
import WorkflowSteps, {
  type WorkflowStep,
} from "../components/Layout/WorkflowSteps";
import CoreFlowHeader, {
  type CoreFlowMetric,
  type CoreFlowStage,
} from "../components/Layout/CoreFlowHeader";
import { Badge } from "../components/ui/Badge";

const HERO_PARAGRAPHS = [
  "This platform links wheel-hub inspection hardware, AI vision, digital-twin mapping, and operation governance into one practical delivery story.",
  "The redesigned UX focuses on a clear demo path and a usable action path: explain value fast, execute decisions quickly, and close governance reliably.",
];

const VALUE_CARDS = [
  {
    value: "03",
    title: "Core domains",
    detail: "Command, Monitor, and Digital Twin are aligned as one continuous process chain.",
  },
  {
    value: "12s",
    title: "Decision refresh",
    detail: "Operational snapshots are refreshed for shift-level incident handling rhythm.",
  },
  {
    value: "4-step",
    title: "Story framework",
    detail: "Observe, diagnose, act, and close loop for both demo and daily operation.",
  },
  {
    value: "1 route",
    title: "Action continuity",
    detail: "Each domain page keeps one role, reducing context switching and duplicate charts.",
  },
];

const MODULE_CARDS = [
  {
    title: "Command Center",
    body: "Executive overview of quality mix, throughput trend, queue status, and execution logs.",
    href: "/visualize",
    tag: "Overview",
    image: "/images/technical-solution-roadmap.png",
  },
  {
    title: "Operations Hub",
    body: "Unified handoff page to Monitoring and Digital Twin domains.",
    href: "/operations",
    tag: "Operations",
    image: "/images/innovation/center-clamp.png",
  },
  {
    title: "Monitoring Center",
    body: "Camera wall, alert queue triage, and frontline device checks for rapid response.",
    href: "/monitor",
    tag: "Realtime",
    image: "/images/innovation/vision-inspection.png",
  },
  {
    title: "Digital Twin",
    body: "3D scene diagnostics, sensor mapping, process interpretation, and device lattice context.",
    href: "/digital-twin",
    tag: "Twin",
    image: "/images/innovation/side-module.png",
  },
  {
    title: "AI Workspace",
    body: "AI assistant, data hub, report center, and training chain in one productivity space.",
    href: "/workspace",
    tag: "AI Workflow",
    image: "/images/innovation/plc-solution.png",
  },
  {
    title: "Admin Governance",
    body: "System governance, import quality controls, and enterprise-level operational policy.",
    href: "/admin",
    tag: "Governance",
    image: "/images/wheel-manufacturing-trends-overview.png",
  },
];

const ROADMAP = [
  {
    title: "Mechanical and Fixture Foundation",
    text: "Complete fixture strategy, key movement definitions, and execution baseline.",
    status: "completed",
  },
  {
    title: "Vision Detection Chain",
    text: "Establish standardized pre-processing and measurement pipeline for inspection tasks.",
    status: "completed",
  },
  {
    title: "Digital Twin and Operations UX",
    text: "Map devices, sensors, and process stages into role-oriented interaction flows.",
    status: "in_progress",
  },
  {
    title: "Enterprise Delivery Package",
    text: "Finalize deployment narrative, governance controls, and cross-team reporting assets.",
    status: "pending",
  },
];

export default function HomeIntro() {
  const router = useRouter();

  const workflowSteps = useMemo<WorkflowStep[]>(
    () => [
      {
        id: "home-step-brief",
        title: "Read project brief",
        detail: "Understand scope and value narrative",
        state: "active",
      },
      {
        id: "home-step-command",
        title: "Open command center",
        detail: "Start from overview and KPI story",
        state: "upcoming",
        onClick: () => router.push("/visualize"),
      },
      {
        id: "home-step-operations",
        title: "Enter execution domains",
        detail: "Branch into Monitoring or Twin for deep work",
        state: "upcoming",
        onClick: () => router.push("/operations"),
      },
      {
        id: "home-step-workspace",
        title: "Close loop in workspace",
        detail: "Use AI and governance modules for follow-up actions",
        state: "upcoming",
        onClick: () => router.push("/workspace"),
      },
    ],
    [router],
  );

  const coreMetrics = useMemo<CoreFlowMetric[]>(
    () =>
      VALUE_CARDS.map((item) => ({
        label: item.title,
        value: item.value,
        note: item.detail,
      })),
    [],
  );

  const coreStages = useMemo<CoreFlowStage[]>(
    () => [
      {
        id: "home-core-observe",
        title: "Observe platform outcome",
        detail: "Lead with quality, throughput, and business impact in command center.",
        state: "done",
      },
      {
        id: "home-core-diagnose",
        title: "Diagnose by domain",
        detail: "Choose monitoring for live incidents or twin for process and space context.",
        state: "active",
      },
      {
        id: "home-core-act",
        title: "Execute role action",
        detail: "Operators triage alerts and engineers verify process deviations.",
        state: "upcoming",
      },
      {
        id: "home-core-close",
        title: "Close with governance",
        detail: "Summarize findings in workspace and admin governance tracks.",
        state: "upcoming",
      },
    ],
    [],
  );

  const scrollToSection = (id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="page-shell innovation-shell pt-0 pb-10">
      <BackButton fallbackHref="/visualize" />

      <WorkflowSteps
        title="Demo Story Flow"
        subtitle="Use this path to present the platform from value to execution."
        steps={workflowSteps}
      />

      <div className="quick-jump-strip">
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("home-core")}
        >
          Core Flow
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("home-lanes")}
        >
          Action Lanes
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("home-modules")}
        >
          Module Tour
        </button>
        <button
          type="button"
          className="enterprise-secondary-button"
          onClick={() => scrollToSection("home-roadmap")}
        >
          Delivery Path
        </button>
      </div>

      <CoreFlowHeader
        id="home-core"
        eyebrow="Platform Narrative / Demo Entry"
        title="Wheel Hub Detection IoT Platform"
        description={HERO_PARAGRAPHS.join(" ")}
        metrics={coreMetrics}
        stages={coreStages}
        actions={
          <>
            <Link href="/visualize" className="enterprise-primary-button">
              Start from Command Center
            </Link>
            <Link href="/operations" className="enterprise-secondary-button">
              Jump to Operations Hub
            </Link>
            <Link href="/monitor" className="enterprise-secondary-button">
              Open Monitoring
            </Link>
            <Link href="/digital-twin" className="enterprise-secondary-button">
              Open Digital Twin
            </Link>
          </>
        }
        sideNote={
          <div className="innovation-highlight-list">
            <div>
              <strong>Minute 1: Outcome</strong>
              <p>Show command center metrics and quality distribution.</p>
            </div>
            <div>
              <strong>Minute 2: Execution</strong>
              <p>Open monitor and digital twin for root-cause context.</p>
            </div>
            <div>
              <strong>Minute 3: Closure</strong>
              <p>Finish with workspace reports and admin governance actions.</p>
            </div>
          </div>
        }
      />

      <section id="home-lanes" className="core-flow-lane-grid">
        <Card className="core-flow-lane-card">
          <span className="core-flow-lane-kicker">Observe</span>
          <h3>Executive showcase lane</h3>
          <p>
            Start with command KPIs, then explain how this architecture improves
            speed, traceability, and decision confidence.
          </p>
          <div className="core-flow-lane-actions">
            <Link href="/visualize" className="enterprise-primary-button">
              Open KPI Story
            </Link>
            <Link href="/home" className="enterprise-secondary-button">
              Stay on Brief
            </Link>
          </div>
        </Card>

        <Card className="core-flow-lane-card">
          <span className="core-flow-lane-kicker">Diagnose + Act</span>
          <h3>Domain execution lane</h3>
          <p>
            Route issues to monitor for incident response or to digital twin for
            spatial and process diagnostics.
          </p>
          <div className="core-flow-lane-actions">
            <Link href="/monitor" className="enterprise-primary-button">
              Go Monitoring
            </Link>
            <Link href="/digital-twin" className="enterprise-secondary-button">
              Go Twin
            </Link>
          </div>
        </Card>

        <Card className="core-flow-lane-card">
          <span className="core-flow-lane-kicker">Close</span>
          <h3>Governance closure lane</h3>
          <p>
            Convert diagnosis into reports, action owners, and policy updates in
            AI workspace and admin modules.
          </p>
          <div className="core-flow-lane-actions">
            <Link href="/workspace" className="enterprise-primary-button">
              Open Workspace
            </Link>
            <Link href="/admin" className="enterprise-secondary-button">
              Open Governance
            </Link>
          </div>
        </Card>
      </section>

      <section id="home-modules" className="innovation-feature-grid">
        {MODULE_CARDS.map((card, index) => (
          <Card
            key={card.title}
            className={`innovation-feature-card hover-lift animate-fade-in-up stagger-${
              (index % 5) + 1
            }`}
          >
            <span className="innovation-feature-tag">{card.tag}</span>
            <div className="innovation-feature-image">
              <img src={card.image} alt={card.title} loading="lazy" />
            </div>
            <h3 className="text-gradient">{card.title}</h3>
            <p>{card.body}</p>
            <div className="workspace-capability-actions mt-3">
              <Link href={card.href} className="enterprise-secondary-button">
                Open Module
              </Link>
            </div>
          </Card>
        ))}
      </section>

      <Card id="home-roadmap" className="innovation-timeline-card glow-border animate-scale-in">
        <div className="panel-heading">
          <div>
            <span className="panel-kicker">Delivery Journey</span>
            <h2>From prototype to enterprise operation</h2>
          </div>
        </div>
        <div className="innovation-timeline">
          {ROADMAP.map((item, index) => (
            <div
              key={item.title}
              className={`innovation-timeline-item animate-slide-in-right stagger-${
                (index % 5) + 1
              }`}
            >
              <div className="innovation-timeline-index">
                <span className={`status-indicator ${item.status}`} />
                {String(index + 1).padStart(2, "0")}
              </div>
              <div>
                <strong>{item.title}</strong>
                <p>{item.text}</p>
                <Badge
                  variant={
                    item.status === "completed"
                      ? "success"
                      : item.status === "in_progress"
                        ? "warning"
                        : "secondary"
                  }
                  className="mt-2"
                >
                  {item.status === "completed"
                    ? "Completed"
                    : item.status === "in_progress"
                      ? "In Progress"
                      : "Planned"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
