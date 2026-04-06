@echo off
setlocal EnableExtensions

if "%DATABASE_URL%"=="" (
  echo [Platform Enterprise] DATABASE_URL is not configured.
  echo [Platform Enterprise] Please set DATABASE_URL first, then run this script again.
  exit /b 1
)

call "%~dp0start-platform-lite.bat"
