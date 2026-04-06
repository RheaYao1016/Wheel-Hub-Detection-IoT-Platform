@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "SERVER_PORT=%~1"
set "APP_DATA_HOME=%~2"
set "APP_CORS_ALLOWED_ORIGINS=%~3"
set "APP_AI_ML_BASE_URL=%~4"
set "MAVEN_CMD="
set "MAVEN_USER_HOME=%USERPROFILE%\.m2"
set "MAVEN_REPO_LOCAL=%USERPROFILE%\.m2\repository"

if "%SERVER_PORT%"=="" set "SERVER_PORT=18081"
if "%APP_DATA_HOME%"=="" set "APP_DATA_HOME=%BACKEND_DIR%\data"
if "%APP_CORS_ALLOWED_ORIGINS%"=="" set "APP_CORS_ALLOWED_ORIGINS=http://localhost:3001"
if "%APP_AI_ML_BASE_URL%"=="" set "APP_AI_ML_BASE_URL=http://localhost:18100"

for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Path \"$env:USERPROFILE\\.m2\\wrapper\\dists\" -Recurse -Filter mvn.cmd -ErrorAction SilentlyContinue | Select-Object -Last 1 -ExpandProperty FullName"`) do set "MAVEN_CMD=%%I"
if "%MAVEN_CMD%"=="" set "MAVEN_CMD=%BACKEND_DIR%\mvnw.cmd"
if not exist "%MAVEN_USER_HOME%" mkdir "%MAVEN_USER_HOME%" >nul 2>nul
if not exist "%MAVEN_REPO_LOCAL%" mkdir "%MAVEN_REPO_LOCAL%" >nul 2>nul

echo [Platform Backend] Working directory: %BACKEND_DIR%
echo [Platform Backend] SERVER_PORT=%SERVER_PORT%
echo [Platform Backend] APP_DATA_HOME=%APP_DATA_HOME%
echo [Platform Backend] APP_AI_ML_BASE_URL=%APP_AI_ML_BASE_URL%
echo [Platform Backend] MAVEN_CMD=%MAVEN_CMD%
echo [Platform Backend] MAVEN_REPO_LOCAL=%MAVEN_REPO_LOCAL%

cd /d "%BACKEND_DIR%"
set "APP_CORS_ALLOWED_ORIGINS=%APP_CORS_ALLOWED_ORIGINS%"
set "APP_DATA_HOME=%APP_DATA_HOME%"
set "SERVER_PORT=%SERVER_PORT%"
set "APP_AI_ML_BASE_URL=%APP_AI_ML_BASE_URL%"
set "MAVEN_OPTS=-Dmaven.repo.local=%MAVEN_REPO_LOCAL% %MAVEN_OPTS%"
call "%MAVEN_CMD%" spring-boot:run
