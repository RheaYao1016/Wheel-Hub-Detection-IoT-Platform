# Platform Startup Guide

## Recommended one-click startup

On Windows, start from the project root with either:

```bat
start-platform.bat
```

or:

```bat
start-platform-lite.bat
```

## What the startup script does

1. Checks for free ports for frontend, backend, and AI/ML services.
2. Creates the local data directories if they do not exist.
3. Installs frontend dependencies when `node_modules` is missing.
4. Starts the FastAPI AI/ML service and waits for `/health`.
5. Starts the Spring Boot backend and waits for `/api/dashboard/health`.
6. Starts the Next.js frontend in production mode and opens the browser automatically.

## Default local ports

- Frontend: `http://localhost:3001`
- Backend: `http://localhost:18081/api`
- AI/ML: `http://localhost:18100`

If one of these ports is already in use, the startup script automatically moves to the next free port.

## Individual service startup

### Frontend

```bat
start-frontend.bat
```

By default, `start-frontend.bat` runs a production server with `next start`. If `.next/BUILD_ID` is missing, it triggers `npm run build` first.

### Backend

```bat
start-backend.bat
```

### AI/ML

```bat
start-ai-ml.bat
```

## Startup troubleshooting

### Browser opens a different system

If `localhost:8080` or `localhost:3000` belongs to another local project, this platform still prefers `18081` and `3001`, so use those URLs first.

### Backend health check passes slowly

Spring Boot may need extra startup time on the first run while dependencies are restored. If the backend terminal stays open and keeps building, wait a little longer and check:

```powershell
http://localhost:18081/api/dashboard/health
```

### AI/ML startup is slow the first time

The first run creates a Python virtual environment and installs dependencies into `services/ai-ml/.venv`.

### Stop all services

Close the terminal windows named:

- `AI-ML Service`
- `Platform Backend`
- `Platform Frontend`
