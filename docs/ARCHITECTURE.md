# Enterprise Platform Architecture

## Runtime Topology
- `Next.js`: enterprise UI, dashboards, AI assistant, reports, training, annotation
- `Spring Boot`: authentication, RBAC, audit logs, AI provider configs, data sources, analysis jobs, reports, annotation metadata, training orchestration
- `FastAPI`: AI analysis, controlled natural-language generation, report export, YOLO-oriented training job scaffolding

## Data Flow
1. Frontend sends authenticated requests to Spring Boot only.
2. Spring Boot validates role permissions and reads/writes enterprise metadata.
3. Spring Boot calls FastAPI for AI analysis, report generation, and training coordination.
4. FastAPI writes report and training artifacts into the shared workspace under `backend/data/ai-ml`.

## Persistence Strategy
- Current delivery build uses JSON-backed storage for enterprise metadata.
- `DATABASE_URL` is reserved for the enterprise PostgreSQL rollout path.
- File uploads, reports, and training artifacts are persisted to `APP_DATA_HOME`.
