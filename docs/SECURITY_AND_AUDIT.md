# Security and Audit

## Security Baseline
- Frontend never stores AI provider API keys in plain text.
- All enterprise APIs require authenticated sessions.
- Enterprise functions are role-gated.
- Uploads are stored under the controlled workspace path.

## Audit Coverage
- AI provider creation and testing
- Data source creation and upload
- Chat session creation
- Analysis job creation
- Report generation
- Annotation save
- Training job actions

## Recommended Next Hardening Steps
- Move enterprise metadata to PostgreSQL
- Add password hashing
- Add request ID propagation to logs
- Add upload size and MIME validation enforcement
