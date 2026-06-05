@echo off
REM ============================================================
REM Industrial-Surface-Defect-Detection-System Docker Start Script (Windows)
REM Usage:
REM   docker-start.bat              Development mode
REM   docker-start.bat --prod       Production mode
REM   docker-start.bat --status     Check service status
REM   docker-start.bat --logs       View logs
REM   docker-start.bat --stop       Stop all services
REM   docker-start.bat --rebuild    Rebuild and restart
REM   docker-start.bat --with-ai    Include AI/ML service
REM ============================================================

cd /d "%~dp0"

set MODE=dev
set COMPOSE_ARGS=
set WITH_AI=0

REM Parse arguments
:parse_args
if "%~1"=="" goto args_done
if "%~1"=="--prod" (
    set MODE=prod
    set COMPOSE_ARGS=-f docker-compose.yml -f docker-compose.prod.yml
)
if "%~1"=="--with-ai" (
    set WITH_AI=1
)
if "%~1"=="--status" (
    echo.
    echo [INFO] Service Status:
    docker compose %COMPOSE_ARGS% ps
    goto end
)
if "%~1"=="--logs" (
    echo.
    echo [INFO] Following all service logs...
    docker compose %COMPOSE_ARGS% logs -f
    goto end
)
if "%~1"=="--stop" (
    echo.
    echo [INFO] Stopping all services...
    docker compose %COMPOSE_ARGS% down
    echo [OK] All services stopped.
    goto end
)
if "%~1"=="--rebuild" (
    set MODE=rebuild
)
shift
goto parse_args
:args_done

echo.
echo ============================================================
echo   Industrial-Surface-Defect-Detection-System Docker Manager
echo ============================================================
echo.

REM Pre-flight checks
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed or not in PATH.
    goto end
)

where docker-compose >nul 2>nul
if %errorlevel% neq 0 (
    REM Check for Docker Compose V2 plugin
    docker compose version >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ERROR] Docker Compose is not available.
        goto end
    )
)

echo [OK] Docker is ready.

REM Production mode checks
if "%MODE%"=="prod" (
    echo [INFO] Production mode selected.
    if not exist ".env.prod" (
        echo [ERROR] .env.prod file not found!
        echo [INFO] Please copy and configure: copy .env.prod.template .env.prod
        goto end
    )
)

REM Build compose command arguments
if "%WITH_AI%"=="1" (
    set COMPOSE_ARGS=%COMPOSE_ARGS% --profile ai
)

REM Execute based on mode
if "%MODE%"=="dev" (
    echo [INFO] Starting services in development mode...
    echo [INFO] This may take a while on first run ^(building images^)...
    echo.
    docker compose -f docker-compose.yml up -d --build
    echo.
    echo [OK] Services started!
    echo.
    echo   Frontend:   http://localhost:3000
    echo   Backend:    http://localhost:18081
    echo   PostgreSQL: localhost:5432
    echo.
    echo   View logs:    %0 --logs
    echo   Check status: %0 --status
    echo   Stop:         %0 --stop
)

if "%MODE%"=="prod" (
    echo [INFO] Starting services in production mode...
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
    echo.
    echo [OK] Production services started!
    echo.
    echo   Access via Nginx: http://localhost:80
    echo.
    echo   View logs:    %0 --logs
    echo   Check status: %0 --status
)

if "%MODE%"=="rebuild" (
    echo [INFO] Rebuilding all images...
    docker compose %COMPOSE_ARGS% build --no-cache
    echo [INFO] Restarting services...
    docker compose %COMPOSE_ARGS% up -d
    echo [OK] Rebuild complete.
)

echo.
echo [INFO] Waiting for services to be ready...
timeout /t 10 /nobreak >nul
echo [INFO] Check status with: %0 --status

:end
echo.
