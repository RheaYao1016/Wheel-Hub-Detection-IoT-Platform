@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo ============================================================
echo   工业表面缺陷智能检测系统 - 安装包构建工具
echo   版本: 2.2.0
echo ============================================================
echo.

:: 设置变量
set "PROJECT_ROOT=%~dp0.."
set "INSTALLER_ROOT=%~dp0"
set "VERSION=2.2.0"
set "PRODUCT_NAME=IndustrialDefectDetection"

:: 解析命令行参数
set "SKIP_RUNTIME=0"
set "SKIP_BUILD=0"
set "VERBOSE=0"

:parse_args
if "%~1"=="" goto :end_parse
if /i "%~1"=="--skip-runtime" set "SKIP_RUNTIME=1"
if /i "%~1"=="--skip-build" set "SKIP_BUILD=1"
if /i "%~1"=="--verbose" set "VERBOSE=1"
if /i "%~1"=="--help" goto :show_help
shift
goto :parse_args

:show_help
echo 用法: build.bat [选项]
echo.
echo 选项:
echo   --skip-runtime    跳过运行时环境下载
echo   --skip-build      跳过项目构建
echo   --verbose         显示详细输出
echo   --help            显示帮助信息
echo.
exit /b 0

:end_parse

:: 检查NSIS是否安装
echo [检查] NSIS 安装状态...
where makensis >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到NSIS，请先安装NSIS
    echo 下载地址: https://nsis.sourceforge.io/Download
    echo.
    echo 或者使用 Chocolatey 安装:
    echo   choco install nsis
    pause
    exit /b 1
)
echo [成功] NSIS 已安装

:: 检查Node.js
echo [检查] Node.js 安装状态...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] 未找到Node.js，部分功能可能受限
) else (
    echo [成功] Node.js 已安装
)

:: 检查Java
echo [检查] Java 安装状态...
where java >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] 未找到Java，部分功能可能受限
) else (
    echo [成功] Java 已安装
)

echo.

:: 步骤1: 清理旧的构建文件
echo [步骤 1/7] 清理旧的构建文件...
if exist "%INSTALLER_ROOT%\output" (
    rmdir /s /q "%INSTALLER_ROOT%\output"
    echo   - 已删除 output 目录
)
if exist "%INSTALLER_ROOT%\runtime" (
    rmdir /s /q "%INSTALLER_ROOT%\runtime"
    echo   - 已删除 runtime 目录
)
mkdir "%INSTALLER_ROOT%\output"
mkdir "%INSTALLER_ROOT%\runtime"
echo   - 已创建 output 和 runtime 目录

:: 步骤2: 构建前端项目
if "%SKIP_BUILD%"=="1" (
    echo [步骤 2/7] 跳过前端构建
) else (
    echo [步骤 2/7] 构建前端项目...
    cd /d "%PROJECT_ROOT%"
    
    :: 检查node_modules是否存在
    if not exist "node_modules" (
        echo   - 正在安装前端依赖...
        call npm install --silent
        if %errorlevel% neq 0 (
            echo [错误] 前端依赖安装失败
            pause
            exit /b 1
        )
    )
    
    echo   - 正在构建前端...
    call npm run build
    if %errorlevel% neq 0 (
        echo [错误] 前端构建失败
        pause
        exit /b 1
    )
    echo   - 前端构建完成
)

:: 步骤3: 构建后端项目
if "%SKIP_BUILD%"=="1" (
    echo [步骤 3/7] 跳过后端构建
) else (
    echo [步骤 3/7] 构建后端项目...
    cd /d "%PROJECT_ROOT%\backend"
    
    echo   - 正在构建后端JAR包...
    call mvnw.cmd clean package -DskipTests -q
    if %errorlevel% neq 0 (
        echo [错误] 后端构建失败
        pause
        exit /b 1
    )
    echo   - 后端构建完成
)

:: 步骤4: 准备运行时环境
if "%SKIP_RUNTIME%"=="1" (
    echo [步骤 4/7] 跳过运行时环境准备
) else (
    echo [步骤 4/7] 准备运行时环境...
    
    :: 创建Node.js运行时目录
    if not exist "%INSTALLER_ROOT%\runtime\nodejs" mkdir "%INSTALLER_ROOT%\runtime\nodejs"
    
    :: 检查是否需要下载Node.js
    if not exist "%INSTALLER_ROOT%\runtime\nodejs\node.exe" (
        echo   - 正在下载 Node.js v20.11.0...
        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
            "$ProgressPreference = 'SilentlyContinue'; " ^
            "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip' -OutFile '%INSTALLER_ROOT%\runtime\nodejs.zip'"
        
        if %errorlevel% neq 0 (
            echo [错误] Node.js 下载失败
            pause
            exit /b 1
        )
        
        echo   - 正在解压 Node.js...
        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
            "Expand-Archive -Path '%INSTALLER_ROOT%\runtime\nodejs.zip' -DestinationPath '%INSTALLER_ROOT%\runtime' -Force"
        
        move "%INSTALLER_ROOT%\runtime\node-v20.11.0-win-x64\*" "%INSTALLER_ROOT%\runtime\nodejs\" >nul
        rmdir /s /q "%INSTALLER_ROOT%\runtime\node-v20.11.0-win-x64"
        del "%INSTALLER_ROOT%\runtime\nodejs.zip"
        echo   - Node.js 准备完成
    ) else (
        echo   - Node.js 已存在，跳过下载
    )
    
    :: 创建Java运行时目录
    if not exist "%INSTALLER_ROOT%\runtime\java" mkdir "%INSTALLER_ROOT%\runtime\java"
    
    :: 检查是否需要下载Java
    if not exist "%INSTALLER_ROOT%\runtime\java\bin\java.exe" (
        echo   - 正在下载 OpenJDK 17...
        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
            "$ProgressPreference = 'SilentlyContinue'; " ^
            "Invoke-WebRequest -Uri 'https://download.java.net/java/GA/jdk17.0.2/dfd4a8d0985749f896bed50d7138ee7f/8/GPL/openjdk-17.0.2_windows-x64_bin.zip' -OutFile '%INSTALLER_ROOT%\runtime\java.zip'"
        
        if %errorlevel% neq 0 (
            echo [错误] Java 下载失败
            pause
            exit /b 1
        )
        
        echo   - 正在解压 Java...
        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
            "Expand-Archive -Path '%INSTALLER_ROOT%\runtime\java.zip' -DestinationPath '%INSTALLER_ROOT%\runtime' -Force"
        
        move "%INSTALLER_ROOT%\runtime\jdk-17.0.2\*" "%INSTALLER_ROOT%\runtime\java\" >nul
        rmdir /s /q "%INSTALLER_ROOT%\runtime\jdk-17.0.2"
        del "%INSTALLER_ROOT%\runtime\java.zip"
        echo   - Java 准备完成
    ) else (
        echo   - Java 已存在，跳过下载
    )
    
    :: 创建Python运行时目录
    if not exist "%INSTALLER_ROOT%\runtime\python" mkdir "%INSTALLER_ROOT%\runtime\python"
    
    :: 检查是否需要下载Python
    if not exist "%INSTALLER_ROOT%\runtime\python\python.exe" (
        echo   - 正在下载 Python 3.11.8...
        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
            "$ProgressPreference = 'SilentlyContinue'; " ^
            "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.8/python-3.11.8-embed-amd64.zip' -OutFile '%INSTALLER_ROOT%\runtime\python.zip'"
        
        if %errorlevel% neq 0 (
            echo [错误] Python 下载失败
            pause
            exit /b 1
        )
        
        echo   - 正在解压 Python...
        powershell -NoProfile -ExecutionPolicy Bypass -Command ^
            "Expand-Archive -Path '%INSTALLER_ROOT%\runtime\python.zip' -DestinationPath '%INSTALLER_ROOT%\runtime\python' -Force"
        
        del "%INSTALLER_ROOT%\runtime\python.zip"
        
        :: 配置Python embed版本支持pip
        echo   - 配置 Python pip 支持...
        echo Lib\site-packages>> "%INSTALLER_ROOT%\runtime\python\python311._pth"
        echo import site>> "%INSTALLER_ROOT%\runtime\python\python311._pth"
        
        echo   - Python 准备完成
    ) else (
        echo   - Python 已存在，跳过下载
    )
)

:: 步骤5: 准备安装资源
echo [步骤 5/7] 准备安装资源...

:: 创建资源目录
if not exist "%INSTALLER_ROOT%\assets" mkdir "%INSTALLER_ROOT%\assets"

:: 复制logo作为图标资源
if exist "%PROJECT_ROOT%\public\images\logo.png" (
    copy "%PROJECT_ROOT%\public\images\logo.png" "%INSTALLER_ROOT%\assets\logo.png" >nul
    echo   - 已复制 logo.png
)

:: 创建欢迎页面图片
if not exist "%INSTALLER_ROOT%\assets\welcome.bmp" (
    echo   - 正在创建欢迎页面图片...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "Add-Type -AssemblyName System.Drawing; " ^
        "$bmp = New-Object System.Drawing.Bitmap(164, 314); " ^
        "$g = [System.Drawing.Graphics]::FromImage($bmp); " ^
        "$g.Clear([System.Drawing.Color]::FromArgb(240, 248, 255)); " ^
        "$font = New-Object System.Drawing.Font('Microsoft YaHei', 14, [System.Drawing.FontStyle]::Bold); " ^
        "$brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(34, 140, 186)); " ^
        "$g.DrawString('工业表面缺陷', $font, $brush, 10, 100); " ^
        "$g.DrawString('智能检测系统', $font, $brush, 10, 130); " ^
        "$g.Dispose(); " ^
        "$bmp.Save('%INSTALLER_ROOT%\assets\welcome.bmp', [System.Drawing.Imaging.ImageFormat]::Bmp)"
)

:: 创建头部图片
if not exist "%INSTALLER_ROOT%\assets\header.bmp" (
    echo   - 正在创建头部图片...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "Add-Type -AssemblyName System.Drawing; " ^
        "$bmp = New-Object System.Drawing.Bitmap(150, 57); " ^
        "$g = [System.Drawing.Graphics]::FromImage($bmp); " ^
        "$g.Clear([System.Drawing.Color]::FromArgb(34, 140, 186)); " ^
        "$g.Dispose(); " ^
        "$bmp.Save('%INSTALLER_ROOT%\assets\header.bmp', [System.Drawing.Imaging.ImageFormat]::Bmp)"
)

:: 创建图标文件（从PNG转换）
if not exist "%INSTALLER_ROOT%\assets\install.ico" (
    echo   - 正在创建安装图标...
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
        "if (Test-Path '%INSTALLER_ROOT%\assets\logo.png') { " ^
        "  Add-Type -AssemblyName System.Drawing; " ^
        "  $img = [System.Drawing.Image]::FromFile('%INSTALLER_ROOT%\assets\logo.png'); " ^
        "  $icon = [System.Drawing.Icon]::FromHandle(($img.GetHIcon())); " ^
        "  $file = [System.IO.File]::Create('%INSTALLER_ROOT%\assets\install.ico'); " ^
        "  $icon.Save($file); " ^
        "  $file.Close(); " ^
        "}"
    if exist "%INSTALLER_ROOT%\assets\install.ico" (
        copy "%INSTALLER_ROOT%\assets\install.ico" "%INSTALLER_ROOT%\assets\uninstall.ico" >nul
    )
)

:: 步骤6: 编译安装程序
echo [步骤 6/7] 编译安装程序...
cd /d "%INSTALLER_ROOT%"

if "%VERBOSE%"=="1" (
    makensis /V3 setup.nsi
) else (
    makensis /V2 setup.nsi
)

if %errorlevel% neq 0 (
    echo [错误] 安装程序编译失败
    pause
    exit /b 1
)

:: 步骤7: 验证输出
echo [步骤 7/7] 验证安装包...

set "OUTPUT_FILE=%INSTALLER_ROOT%\output\%PRODUCT_NAME%_Setup_v%VERSION%.exe"

if exist "%OUTPUT_FILE%" (
    for %%F in ("%OUTPUT_FILE%") do set "FILE_SIZE=%%~zF"
    set /a "FILE_SIZE_MB=!FILE_SIZE! / 1048576"
    echo   - 安装包大小: !FILE_SIZE_MB! MB
    echo   - 文件路径: %OUTPUT_FILE%
) else (
    echo [错误] 安装包生成失败
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   构建完成！
echo ============================================================
echo.
echo   安装包位置:
echo   %OUTPUT_FILE%
echo.
echo   使用说明:
echo   1. 双击安装包开始安装
echo   2. 选择"快速安装"或"自定义安装"
echo   3. 按照向导完成安装
echo.
echo ============================================================
echo.

:: 询问是否打开输出目录
set /p "OPEN_OUTPUT=是否打开输出目录？(Y/N): "
if /i "%OPEN_OUTPUT%"=="Y" (
    explorer "%INSTALLER_ROOT%\output"
)

pause
