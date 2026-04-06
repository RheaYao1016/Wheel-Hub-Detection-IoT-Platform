@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
set "PORT=%~1"
set "NEXT_PUBLIC_API_BASE_URL=%~2"
set "NEXT_BUILD_MARKER=.next\api-base-url.txt"

if "%PORT%"=="" set "PORT=3001"
if "%NEXT_PUBLIC_API_BASE_URL%"=="" set "NEXT_PUBLIC_API_BASE_URL=http://localhost:18081/api"

echo [Platform Frontend] Working directory: %ROOT_DIR%
echo [Platform Frontend] PORT=%PORT%
echo [Platform Frontend] NEXT_PUBLIC_API_BASE_URL=%NEXT_PUBLIC_API_BASE_URL%

cd /d "%ROOT_DIR%"
set "PORT=%PORT%"
set "NEXT_PUBLIC_API_BASE_URL=%NEXT_PUBLIC_API_BASE_URL%"
set "NEEDS_BUILD=0"
if not exist ".next\BUILD_ID" (
  set "NEEDS_BUILD=1"
)
if not exist "%NEXT_BUILD_MARKER%" (
  set "NEEDS_BUILD=1"
)
if exist "%NEXT_BUILD_MARKER%" (
  set /p "LAST_API_BASE_URL="<"%NEXT_BUILD_MARKER%"
  if /I not "%LAST_API_BASE_URL%"=="%NEXT_PUBLIC_API_BASE_URL%" (
    set "NEEDS_BUILD=1"
  )
)
if "%NEEDS_BUILD%"=="1" (
  echo [Platform Frontend] Build is missing or API base changed, running npm run build ...
  call npm run build
  > "%NEXT_BUILD_MARKER%" echo %NEXT_PUBLIC_API_BASE_URL%
)
if "%NEEDS_BUILD%"=="0" (
  echo [Platform Frontend] Reusing existing build for %NEXT_PUBLIC_API_BASE_URL%
)
call npm run start -- --port %PORT%
