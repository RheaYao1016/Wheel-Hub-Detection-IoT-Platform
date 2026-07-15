# Frontend Reference Audit

This redesign intentionally borrows interaction patterns from established design systems instead of inventing a bespoke structure from scratch.

## Reliable sources used

1. Ant Design design values and layout guidance
   Source: https://ant.design/docs/spec/introduce/
   Source: https://ant.design/docs/spec/layout/
   Source: https://ant.design/docs/spec/data-entry/
   Source: https://ant.design/docs/spec/data-display/
   Source: https://ant.design/docs/spec/research-list/
   Source: https://ant.design/docs/spec/detail-page/
   Source: https://ant.design/docs/spec/research-empty/
   Why it was used:
   - This project behaves like an enterprise product rather than a marketing site.
   - Ant Design explicitly focuses on enterprise-product consistency, layout order, and reusable design patterns.
   What we borrowed:
   - Clear responsibility boundaries between pages
   - Ordered layout blocks and repeatable spacing
   - “Use patterns as a starting point, then adapt to business needs” approach
   - “General to specific” list and detail organization for operational screens
   - Actionable empty states instead of passive no-data placeholders

2. Material Design 3 navigation rail guidance
   Source: https://m3.material.io/components/navigation-rail/overview
   Why it was used:
   - The app has multiple long-lived destinations and benefits from stronger “where am I / where do I go next” navigation.
   What we borrowed:
   - Destination grouping
   - Fewer, clearer primary destinations
   - Navigation that emphasizes switching between major work areas

3. Carbon Design System loading and empty-state guidance
   Source: https://carbondesignsystem.com/patterns/loading-pattern/
   Source: https://carbondesignsystem.com/components/loading/usage/
   Source: https://carbondesignsystem.com/components/data-table/usage/
   Source: https://carbondesignsystem.com/community/patterns/import-pattern/
   Why it was used:
   - The current product frequently waits on data and often exposes empty or unavailable states.
   - Import, review, and operational history are central tasks in this product.
   What we borrowed:
   - Prefer skeleton-based loading for full-page or structured loads
   - Keep empty states instructional and action-oriented
   - Make dense operational information easier to scan
   - Treat import as a guided flow rather than a single upload button

4. Ant Design X AI interface guidance
   Source: https://x.ant.design/components/overview/
   Source: https://x.ant.design/components/prompts/
   Source: https://x.ant.design/components/thought-chain/
   Source: https://x.ant.design/docs/react/introduce/
   Why it was used:
   - The AI assistant should feel like a working enterprise copilot surface rather than a bare chat box.
   What we borrowed:
   - Suggestion-prompt blocks as first-class task starters
   - Visible analysis/thinking progress instead of opaque waiting
   - A conversation area surrounded by contextual actions, outputs, and next steps

5. Radix UI Select official component guidance
   Source: https://www.radix-ui.com/primitives/docs/components/select
   Why it was used:
   - Several workbench pages need reliable, accessible filter and routing controls instead of browser-default selects.
   What we borrowed:
   - Trigger/content/viewport composition for layered selection controls
   - Keyboard-safe selection behavior
   - Stable listbox-style filtering controls for enterprise toolbars

6. shadcn/ui Data Table guidance built on TanStack Table
   Source: https://ui.shadcn.com/docs/components/base/data-table
   Source: https://tanstack.com/table/latest/docs/guide/pagination
   Why it was used:
   - Operational pages in this product need dense, filterable, next-step oriented catalogs that can evolve without becoming one rigid mega-component.
   What we borrowed:
   - Table plus toolbar composition instead of a monolithic “smart table”
   - List-detail workbench structure where the table narrows context and a side panel drives action
   - Headless-table thinking so filtering, routing, and row actions can stay business-specific

## Where those ideas were applied

- Global navigation and header
  Files:
  - `app/components/Layout/Header.tsx`
  - `app/components/Layout/Navigation.tsx`
  Applied ideas:
  - Fewer, clearer primary navigation groups
  - Navigation built around work domains instead of an undifferentiated link strip

- Shared page structure
  Files:
  - `app/components/Layout/WorkflowHero.tsx`
  - `app/components/Layout/TaskSection.tsx`
  - `app/components/Layout/EmptyStateCard.tsx`
  - `app/components/Layout/SectionSkeleton.tsx`
  - `app/components/Layout/PageLoadFallback.tsx`
  Applied ideas:
  - Reusable enterprise workbench sections
  - Progressive, structured loading states
  - Clear next-step guidance in empty/error states

- Main workflow entry pages
  Files:
  - `app/home/page.tsx`
  - `app/operations/page.tsx`
  - `app/workspace/page.tsx`
  - `app/admin/page.tsx`
  Applied ideas:
  - One page, one responsibility
  - Stage-based task progression
  - Faster routing into specialized work surfaces
  - Workspace-specific launchpad behavior inspired by enterprise list/detail sequencing:
    users verify context first, then enter the right execution surface, then close the loop
  - Role-lane framing adapted from mature work-management products so ownership and handoff
    are visible before people dive into a module

- AI assistant workbench
  Files:
  - `app/ai-assistant/page.tsx`
  Applied ideas:
  - Ant Design X-style prompt suggestions and visible thought progress
  - Workbench framing where conversation is only one part of the surface
  - Surrounding the chat area with quick tasks, report outputs, and current operational context
  - Real-session orchestration instead of demo-only chat: context controls, session queue, and handoff packet behavior so conversation can continue into formal reporting

- AI-to-report handoff protocol
  Files:
  - `lib/report-handoff.ts`
  - `app/ai-assistant/page.tsx`
  - `app/reports/page.tsx`
  Applied ideas:
  - Enterprise workflow handoff pattern where the next surface inherits scope, intent, and recommended next action instead of forcing users to re-enter everything
  - Clear transition from exploratory AI conversation to formal analysis and export

- Runtime configuration control
  Files:
  - `app/platform-config/page.tsx`
  - `lib/runtime-endpoint-config.ts`
  Applied ideas:
  - Ant Design data-entry and detail-page split between editable settings and resolved system state
  - Explicit health verification and “next step” navigation after risky environment changes
  - Runtime-safe same-origin fallback so local and proxied deployments do not strand users on broken API paths

- Alert triage surface
  Files:
  - `app/admin/alerts/page.tsx`
  Applied ideas:
  - Ant Design list-page pattern: filter first, review next, act last
  - Data-display guidance to sort by importance and operational frequency
  - Card-based triage instead of forcing operators into a dense table first

- Import operations workbench
  Files:
  - `app/admin/data-import/page.tsx`
  Applied ideas:
  - Carbon import pattern: upload, validate, submit, then review history
  - Ant Design form-page and detail-page separation for create vs. audit tasks
  - Status-aware review cards with logs, edits, and delete actions grouped per batch

- Admin inventory and review queues
  Files:
  - `app/components/Layout/WorkbenchFilterBar.tsx`
  - `app/admin/wheels/page.tsx`
  - `app/admin/inspections/page.tsx`
  - `app/admin/storage/page.tsx`
  Applied ideas:
  - Carbon data-table toolbar pattern: put search and filters before dense records
  - Ant Design list-page sequencing: filter first, then prioritize, then read the full table
  - Explicit empty filtered states instead of leaving users with a blank table

- Data Hub asset workbench
  Files:
  - `app/data-hub/page.tsx`
  Applied ideas:
  - Radix Select-based control bar so source type, provider, prompt preset, quality, and status can be changed through accessible workbench controls instead of raw native fields
  - shadcn/ui plus TanStack-style table composition: search/filter toolbar first, source catalog second, selected-source detail and actions on the side
  - Ant Design list/detail responsibility split adapted to data operations: intake on top, governance posture in the middle, then catalog plus next-step routing

- Annotation dataset governance
  Files:
  - `app/annotation/page.tsx`
  Applied ideas:
  - Ant Design detail/workbench framing for multi-step operational pages
  - Enterprise readiness checklist pattern adapted to dataset export quality gates
  - Queue-based asset review instead of a canvas-only interaction model

- Workspace role orchestration and startup checklist
  Files:
  - `app/workspace/page.tsx`
  Applied ideas:
  - Ant Design list/detail ordering applied to task routing: verify first, execute second,
    close the loop last
  - Carbon loading guidance applied to staged skeleton sections so the workspace can reveal
    structure before live data arrives
  - Enterprise workbench role-lane pattern adapted into visible ownership cards that clarify
    who should act, what “done” looks like, and where the next handoff belongs
