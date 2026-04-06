@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
set "SERVICE_DIR=%ROOT_DIR%services\ai-ml"
set "SERVICE_PORT=%~1"
set "AI_ML_WORKSPACE=%~2"
set "AI_ML_AUTO_INSTALL=%~3"

if "%SERVICE_PORT%"=="" set "SERVICE_PORT=18100"
if "%AI_ML_WORKSPACE%"=="" set "AI_ML_WORKSPACE=%ROOT_DIR%backend\data\ai-ml"
if "%AI_ML_AUTO_INSTALL%"=="" set "AI_ML_AUTO_INSTALL=0"

echo [AI/ML Service] Working directory: %SERVICE_DIR%
echo [AI/ML Service] SERVICE_PORT=%SERVICE_PORT%
echo [AI/ML Service] AI_ML_WORKSPACE=%AI_ML_WORKSPACE%

cd /d "%SERVICE_DIR%"
if not exist ".venv\Scripts\python.exe" (
  python -m venv .venv
  set "AI_ML_AUTO_INSTALL=1"
)

if "%AI_ML_AUTO_INSTALL%"=="1" (
  .venv\Scripts\python.exe -m pip install --upgrade pip
  .venv\Scripts\python.exe -m pip install -r requirements.txt
) else (
  echo [AI/ML Service] Reusing existing virtual environment without reinstalling dependencies.
)

set "AI_ML_WORKSPACE=%AI_ML_WORKSPACE%"
.venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port %SERVICE_PORT%
