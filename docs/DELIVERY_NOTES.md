# Delivery Notes

## Current packaging direction

The current delivery build is optimized for:

- Windows-first demo delivery
- backend-first runtime data flow
- card-based enterprise presentation
- role-based navigation and workbench modules
- strict real AI/ML service for analysis, reports, and training

## Local runtime defaults

- Frontend: `3001`
- Backend: `18081`
- AI/ML: `18100`

These ports are intentionally chosen to reduce conflict with other projects often using `3000` and `8080`.

## Page ownership

- `visualize`: operations overview only
- `monitor`: live monitoring only
- `digital-twin`: spatial twin only
- `admin`: governance and action routing only
- `data-hub`: source governance only
- `reports`: output artifacts only
- `training`: training lifecycle only
- `annotation`: labeling workflow only
- `ai-assistant`: conversational analysis only

## Delivery checklist

- Confirm frontend loads from backend APIs.
- Confirm no top-level page duplicates the same primary dataset.
- Confirm user-facing Chinese copy is readable and not garbled.
- Confirm one-click startup scripts open all required service terminals.
- Confirm report generation and download work against the real AI/ML service.

## Latest verification

The latest local verification covered:

- `npm run build`
- `backend\\mvnw.cmd test`
- `python -m compileall services\\ai-ml`
- MCP/browser validation for:
  - `/login`
  - `/admin`
  - `/ai-assistant`
  - `/data-hub`
  - `/reports`
  - `/training`
  - `/api/dashboard/health`

Key outcomes:

- Login, role navigation, theme toggle, and enterprise shell render correctly.
- AI assistant can load provider and data source context from the backend.
- Data Hub, Reports, and Training pages now rely on backend data and real service responses instead of fabricated local fallbacks.
- Default startup ports `3001 / 18081 / 18100` are working together in the current packaging.
