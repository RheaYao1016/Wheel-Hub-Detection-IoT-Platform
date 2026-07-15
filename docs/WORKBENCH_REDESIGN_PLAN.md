# Workbench Redesign Plan

## Objective

Push the product from “feature-complete demo” toward “engineer-grade daily workbench” by making every major page:

- easy to understand within 10 seconds
- clear about what belongs on that page and what does not
- structured around real task order rather than component availability
- safe for mixed-skill users, including operators and first-time reviewers
- consistent enough that engineers can build new pages without reinventing the interaction model

## Reliable reference systems

This plan intentionally continues to borrow from established, reliable systems rather than inventing ad hoc layouts.

1. Ant Design Spec
   Sources:
   - https://ant.design/docs/spec/layout/
   - https://ant.design/docs/spec/data-entry/
   - https://ant.design/docs/spec/data-display/
   - https://ant.design/docs/spec/research-list/
   - https://ant.design/docs/spec/detail-page/
   Why:
   - Strong enterprise guidance for page responsibility, list/detail structure, and operational density.

2. Ant Design X
   Sources:
   - https://x.ant.design/components/overview/
   - https://x.ant.design/components/prompts/
   - https://x.ant.design/components/thought-chain/
   Why:
   - Good model for turning AI from a plain chat box into a contextual enterprise copilot surface.

3. Carbon Design System
   Sources:
   - https://carbondesignsystem.com/patterns/loading-pattern/
   - https://carbondesignsystem.com/components/data-table/usage/
   - https://carbondesignsystem.com/community/patterns/import-pattern/
   Why:
   - Strong operational guidance for loading, dense tabular work, and guided import flows.

4. Material Design 3 Navigation
   Source:
   - https://m3.material.io/components/navigation-rail/overview
   Why:
   - Useful for keeping long-lived destinations grouped by domain instead of by implementation history.

## Current architecture status

### Already aligned

- Global shell and navigation
- Home / Operations / Workspace / Admin entry pages
- AI Assistant
- Platform Config
- Alerts
- Data Import
- Monitoring / Digital Twin / Reports / Training / Data Hub

### Still weaker than the rest

- Annotation page:
  - core capability is strong, but the page still behaves more like a tool prototype than a polished production workbench
  - project switching, upload, labeling, and export are all present, but the workflow is not clearly staged

- Admin wheels / inspections / storage:
  - still mostly “hero + table”
  - weak prioritization
  - missing overview-to-detail guidance
  - little cross-page flow support

- Supporting widgets still inconsistent:
  - some legacy table cards are still visually detached from the new workbench language
  - some pages rely on old enterprise utility classes rather than shared higher-level layout primitives

## Target page taxonomy

Every page should clearly fall into one of these roles.

1. Entry page
   Purpose:
   - route people into the right surface
   Examples:
   - home
   - operations
   - workspace
   - admin

2. Workbench page
   Purpose:
   - support a multi-step job in one place
   Required structure:
   - context summary
   - recommended action order
   - primary task area
   - supporting side decisions
   Examples:
   - ai-assistant
   - annotation
   - data-import
   - platform-config

3. Triage page
   Purpose:
   - rank, filter, and act on an operational queue
   Required structure:
   - queue summary
   - filter rail
   - action cards or rows
   Examples:
   - alerts

4. Inventory/detail page
   Purpose:
   - review domain records with context, not just export a table
   Required structure:
   - top metrics
   - operational explanation
   - records table or cards
   - next-step routing
   Examples:
   - wheels
   - inspections
   - storage

## Design rules for the next wave

1. One page, one job
   If a page does more than one major job, break the jobs into sections with a visible order.

2. Metrics must drive action
   Hero statistics are only useful if they help users decide what to do next.

3. Lists need framing
   Raw tables should appear only after users understand why those records matter.

4. Empty states must teach
   Empty pages should explain what is missing, what the user can do next, and where to do it.

5. Sidebars must reduce decisions
   A sidebar is not decoration; it should summarize current context, rules, or next actions.

6. AI surfaces need surrounding structure
   Chat is never enough on its own. AI pages need prompts, outputs, evidence, and action handoff.

7. Admin pages must foreground risk
   Governance pages should prioritize pressure, exceptions, and auditability before raw content.

## Highest-priority redesign targets

### Wave 1

- Annotation
  - convert into a staged labeling workbench
  - add project health, asset split context, labeling progress, and export readiness

- Wheels
  - convert into a specification inventory workbench
  - show pattern clusters, recent updates, and record quality cues

- Inspections
  - convert into a quality review queue
  - foreground fail rate, hot stations, and recent operator activity

- Storage
  - convert into a stock posture page
  - foreground location pressure, low-stock risk, and batch turnover

### Wave 2

- legacy data widgets and list cards
- table density and filtering consistency
- better visual rules for cross-page CTA cards
- workspace entry experience:
  - strengthen role ownership
  - add startup checklist
  - make launch surfaces searchable and stage-aware
  - show handoff readiness instead of only top-level counts
- AI and reporting continuity:
  - replace demo-only assistant behavior with real backend sessions
  - preserve context when handing conversation output into formal reports
  - keep governance escalation visible from high-risk reports
- Data Hub asset workbench:
  - replace native selects and loose source cards with an enterprise asset catalog
  - keep intake, governance posture, catalog filtering, and next-step routing on one page
  - borrow Radix Select and shadcn/TanStack table composition so the page scales without becoming a bespoke one-off

## Verification gates

The redesign is only acceptable if each touched page passes these checks.

1. A new user can identify the page’s job from the hero and first section.
2. A frequent user can reach the main task without scanning the full page.
3. The page clearly indicates what to do next.
4. The structure matches at least one reliable external pattern source.
5. The page still builds cleanly in Next.js.
6. The touched page feels like part of the same product family as Workspace, Admin, and AI Assistant.

## Immediate implementation plan

1. Normalize remaining admin detail pages into the same workbench grammar.
2. Rebuild Annotation around staged task flow and stronger side guidance.
3. Upgrade Workspace from module listing into a role-based launchpad and handoff console.
4. Replace AI Assistant demo behavior with real session orchestration and report handoff.
5. Re-run production build.
6. Continue with widget/table consistency cleanup after the main work surfaces are aligned.
