@echo off
setlocal EnableExtensions EnableDelayedExpansion

for %%I in ("%~dp0.") do set "ROOT_DIR=%%~fI"
cd /d "%ROOT_DIR%"

set "BACKEND_DIR=%ROOT_DIR%\backend"
set "DATA_DIR=%BACKEND_DIR%\data"
set "AI_ML_WORKSPACE=%DATA_DIR%\ai-ml"

call :pickPort BACKEND_PORT 18081
call :pickPort FRONTEND_PORT 3001
call :pickPort AI_PORT 18100

if not exist "%DATA_DIR%" mkdir "%DATA_DIR%" >nul 2>nul
if not exist "%AI_ML_WORKSPACE%" mkdir "%AI_ML_WORKSPACE%" >nul 2>nul

if not exist "node_modules" (
  echo [Platform Lite] Installing frontend dependencies...
  call npm install
)

echo [Platform Lite] Startup mode: fast probe + short retry
call :ensureService http://localhost:%AI_PORT%/health "AI/ML service" "AI-ML Service" "%ROOT_DIR%\start-ai-ml.bat" %AI_PORT% "%AI_ML_WORKSPACE%" 0

call :ensureService http://localhost:%BACKEND_PORT%/api/dashboard/health "Spring Boot backend" "Platform Backend" "%ROOT_DIR%\start-backend.bat" %BACKEND_PORT% "%DATA_DIR%" "http://localhost:%FRONTEND_PORT%" "http://localhost:%AI_PORT%"

echo [Platform Lite] Starting Next.js frontend on http://localhost:%FRONTEND_PORT% ...
start "Platform Frontend" "%ComSpec%" /k call "%ROOT_DIR%\start-frontend.bat" %FRONTEND_PORT% "http://localhost:%BACKEND_PORT%/api"

timeout /t 2 >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process 'http://localhost:%FRONTEND_PORT%/'" >nul 2>nul
echo [Platform Lite] All services started.
exit /b 0

:pickPort
setlocal EnableDelayedExpansion
set /a candidate=%~2
:pickPortLoop
netstat -ano | findstr LISTENING | findstr /C:":!candidate! " >nul 2>nul
if !errorlevel! equ 0 (
  set /a candidate+=1
  goto pickPortLoop
)
endlocal & set "%~1=%candidate%"
exit /b 0

:ensureService
setlocal
set "URL=%~1"
set "LABEL=%~2"
set "WINDOW_TITLE=%~3"
set "SCRIPT_PATH=%~4"

call :isUrlHealthy "%URL%"
if not errorlevel 1 (
  echo [Platform Lite] %LABEL% is already running.
  endlocal & exit /b 0
)

echo [Platform Lite] Starting %LABEL% on %URL% ...
start "%WINDOW_TITLE%" "%ComSpec%" /k call "%SCRIPT_PATH%" %5 %6 %7 %8 %9
call :waitForUrl "%URL%" "%LABEL%"
endlocal & exit /b 0

:isUrlHealthy
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ProgressPreference='SilentlyContinue'; try { $r = Invoke-WebRequest -UseBasicParsing '%~1' -TimeoutSec 1; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { exit 0 } } catch { exit 1 }"
exit /b %errorlevel%

:waitForUrl
setlocal
set "URL=%~1"
set "LABEL=%~2"
for /L %%I in (1,1,8) do (
  call :isUrlHealthy "%URL%"
  if not errorlevel 1 (
    echo [Platform Lite] %LABEL% is healthy.
    endlocal & exit /b 0
  )
  if %%I==1 echo [Platform Lite] Fast probing %LABEL%...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Milliseconds 350" >nul 2>nul
)
for /L %%I in (1,1,12) do (
  call :isUrlHealthy "%URL%"
  if not errorlevel 1 (
    echo [Platform Lite] %LABEL% is healthy.
    endlocal & exit /b 0
  )
  echo [Platform Lite] Waiting for %LABEL%... %%I/12
  timeout /t 1 >nul
)
echo [Platform Lite] %LABEL% is still starting. The window will keep booting in the background.
endlocal & exit /b 0
