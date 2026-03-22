@echo off
setlocal

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

echo [Wheel Hub Platform] Preparing environment...

set BACKEND_PORT=8080
netstat -ano | findstr LISTENING | findstr ":8080" >nul
if %errorlevel%==0 (
  set BACKEND_PORT=18080
  echo [Wheel Hub Platform] Port 8080 is busy. Backend will use port 18080 instead.
)

if not exist ".env" (
  if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul
    echo [Wheel Hub Platform] Created .env from .env.example
  )
)

if not exist "node_modules" (
  echo [Wheel Hub Platform] Installing frontend dependencies...
  call npm install
  if errorlevel 1 (
    echo [Wheel Hub Platform] Frontend dependency installation failed.
    exit /b 1
  )
)

echo [Wheel Hub Platform] Starting Spring Boot backend on http://localhost:%BACKEND_PORT% ...
start "Wheel Hub Backend" cmd /k "cd /d "%ROOT_DIR%backend" && set SERVER_PORT=%BACKEND_PORT%&& call mvnw.cmd spring-boot:run"

echo [Wheel Hub Platform] Starting Next.js frontend on http://localhost:3000 ...
start "Wheel Hub Frontend" cmd /k "cd /d "%ROOT_DIR%" && set NEXT_PUBLIC_API_BASE_URL=http://localhost:%BACKEND_PORT%/api&& npm run dev"

timeout /t 8 >nul
start "" http://localhost:3000

echo [Wheel Hub Platform] Frontend and backend startup commands have been launched.
echo [Wheel Hub Platform] Backend API base: http://localhost:%BACKEND_PORT%/api
echo [Wheel Hub Platform] Close the two terminal windows to stop the services.
