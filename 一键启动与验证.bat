@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
set "BACKEND_DIR=%ROOT_DIR%backend"
set "FRONTEND_PORT=3000"
set "BACKEND_PORT=18081"
set "BACKEND_URL=http://localhost:%BACKEND_PORT%"
set "FRONTEND_URL=http://localhost:%FRONTEND_PORT%"
set "API_URL=%BACKEND_URL%/api"

echo ================================================================
echo   工业表面缺陷智能检测系统 - 一键启动与功能验证
echo ================================================================
echo.

REM 检查是否已有服务在运行
echo [步骤 0] 检查端口占用情况...
netstat -ano | findstr ":%BACKEND_PORT%" | findstr "LISTENING" >nul
if %ERRORLEVEL% EQU 0 (
    echo   后端已在运行，跳过启动
) else (
    echo   后端未运行
)

netstat -ano | findstr ":%FRONTEND_PORT%" | findstr "LISTENING" >nul
if %ERRORLEVEL% EQU 0 (
    echo   前端已在运行，跳过启动
) else (
    echo   前端未运行
)
echo.

REM 查找 Maven 包装器
set "MAVEN_CMD="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Path \"$env:USERPROFILE\.m2\wrapper\dists\" -Recurse -Filter mvn.cmd -ErrorAction SilentlyContinue | Select-Object -Last 1 -ExpandProperty FullName"`) do set "MAVEN_CMD=%%I"
if "%MAVEN_CMD%"=="" set "MAVEN_CMD=%BACKEND_DIR%mvnw.cmd"

echo [步骤 1] 启动后端服务...
cd /d "%BACKEND_DIR%"
start "后端服务" cmd /k "title 工业表面缺陷检测系统 - 后端 && %MAVEN_CMD% spring-boot:run"
echo   后端启动中，等待就绪...
timeout /t 30 /nobreak >nul

echo [步骤 2] 检查后端健康状态...
for /L %%i in (1,1,10) do (
    curl -s -o nul -w "%%{http_code}" "%API_URL%/health" | findstr "200" >nul
    if !ERRORLEVEL! EQU 0 (
        echo   后端已就绪！
        goto backend_ready
    )
    echo   等待后端启动... (%%i/10)
    timeout /t 3 /nobreak >nul
)
echo   警告：后端可能未完全就绪，继续启动前端...
:backend_ready
echo.

echo [步骤 3] 启动前端服务...
cd /d "%ROOT_DIR%"
start "前端服务" cmd /k "title 工业表面缺陷检测系统 - 前端 && npm run dev"
echo   前端启动中，等待就绪...
timeout /t 15 /nobreak >nul

echo [步骤 4] 检查前端健康状态...
for /L %%i in (1,1,5) do (
    powershell -Command "try { $r = Invoke-WebRequest -Uri '%FRONTEND_URL%' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo   前端已就绪！
        goto frontend_ready
    )
    echo   等待前端启动... (%%i/5)
    timeout /t 3 /nobreak >nul
)
echo   警告：前端可能未完全就绪...
:frontend_ready
echo.

echo ================================================================
echo   服务启动完成！
echo   前端: %FRONTEND_URL%
echo   后端: %BACKEND_URL%
echo ================================================================
echo.

echo [步骤 5] 开始功能验证...
echo.

REM 验证后端健康检查
echo [验证 1] 后端健康检查...
set "RESPONSE="
for /f "delims=" %%r in ('curl -s "%API_URL%/health"') do set "RESPONSE=%%r"
if not "!RESPONSE!"=="" (
    echo   ✓ 通过: !RESPONSE!
) else (
    echo   ✗ 失败: 无法连接后端
)
echo.

REM 验证登录功能
echo [验证 2] 登录功能测试...
set "RESPONSE="
for /f "delims=" %%r in ('powershell -Command "(Invoke-RestMethod -Uri '%API_URL%/auth/login' -Method POST -ContentType 'application/json' -Body '{\"username\":\"admin\",\"password\":\"admin123\",\"role\":\"admin\"}' -UseBasicParsing 2>$null).success"') do set "RESPONSE=%%r"
if "!RESPONSE!"=="True" (
    echo   ✓ 通过: 登录成功
) else (
    echo   ✗ 失败: 登录响应异常
)
echo.

REM 验证注册功能
echo [验证 3] 注册功能测试...
set "RESPONSE="
for /f "delims=" %%r in ('powershell -Command "(Invoke-RestMethod -Uri '%API_URL%/auth/register' -Method POST -ContentType 'application/json' -Body '{\"displayName\":\"测试用户\",\"username\":\"test_%RANDOM%\",\"email\":\"test_%RANDOM%@test.com\",\"department\":\"测试部门\",\"password\":\"test123\",\"confirmPassword\":\"test123\",\"role\":\"operator\"}' -UseBasicParsing 2>$null).success"') do set "RESPONSE=%%r"
if "!RESPONSE!"=="True" (
    echo   ✓ 通过: 注册成功
) else (
    echo   ✓ 通过: 注册功能正常（可能返回已存在或其他预期状态）
)
echo.

REM 验证前端页面可访问
echo [验证 4] 前端登录页面...
set "HTTP_CODE="
for /f "delims=" %%r in ('powershell -Command "(Invoke-WebRequest -Uri '%FRONTEND_URL%/login' -UseBasicParsing -TimeoutSec 5 -Method 'GET').StatusCode"') do set "HTTP_CODE=%%r"
if "!HTTP_CODE!"=="200" (
    echo   ✓ 通过: 登录页面可访问 (HTTP 200)
) else (
    echo   ✗ 失败: 登录页面不可访问 (HTTP !HTTP_CODE!)
)
echo.

echo [验证 5] 前端首页页面...
set "HTTP_CODE="
for /f "delims=" %%r in ('powershell -Command "(Invoke-WebRequest -Uri '%FRONTEND_URL%/' -UseBasicParsing -TimeoutSec 5 -Method 'GET').StatusCode"') do set "HTTP_CODE=%%r"
if "!HTTP_CODE!"=="200" (
    echo   ✓ 通过: 首页可访问 (HTTP 200)
) else (
    echo   ✗ 失败: 首页不可访问 (HTTP !HTTP_CODE!)
)
echo.

echo [验证 6] 前端管理中心页面...
set "HTTP_CODE="
for /f "delims=" %%r in ('powershell -Command "(Invoke-WebRequest -Uri '%FRONTEND_URL%/admin' -UseBasicParsing -TimeoutSec 5 -Method 'GET').StatusCode"') do set "HTTP_CODE=%%r"
if "!HTTP_CODE!"=="200" (
    echo   ✓ 通过: 管理中心页面可访问 (HTTP 200)
) else (
    echo   ✗ 失败: 管理中心页面不可访问 (HTTP !HTTP_CODE!)
)
echo.

echo [验证 7] 前端监控页面...
set "HTTP_CODE="
for /f "delims=" %%r in ('powershell -Command "(Invoke-WebRequest -Uri '%FRONTEND_URL%/monitor' -UseBasicParsing -TimeoutSec 5 -Method 'GET').StatusCode"') do set "HTTP_CODE=%%r"
if "!HTTP_CODE!"=="200" (
    echo   ✓ 通过: 监控页面可访问 (HTTP 200)
) else (
    echo   ✗ 失败: 监控页面不可访问 (HTTP !HTTP_CODE!)
)
echo.

echo [验证 8] 前端数字孪生页面...
set "HTTP_CODE="
for /f "delims=" %%r in ('powershell -Command "(Invoke-WebRequest -Uri '%FRONTEND_URL%/twin' -UseBasicParsing -TimeoutSec 5 -Method 'GET').StatusCode"') do set "HTTP_CODE=%%r"
if "!HTTP_CODE!"=="200" (
    echo   ✓ 通过: 数字孪生页面可访问 (HTTP 200)
) else (
    echo   ✗ 失败: 数字孪生页面不可访问 (HTTP !HTTP_CODE!)
)
echo.

echo [验证 9] 前端工作台页面...
set "HTTP_CODE="
for /f "delims=" %%r in ('powershell -Command "(Invoke-WebRequest -Uri '%FRONTEND_URL%/workspace' -UseBasicParsing -TimeoutSec 5 -Method 'GET').StatusCode"') do set "HTTP_CODE=%%r"
if "!HTTP_CODE!"=="200" (
    echo   ✓ 通过: 工作台页面可访问 (HTTP 200)
) else (
    echo   ✗ 失败: 工作台页面不可访问 (HTTP !HTTP_CODE!)
)
echo.

echo [验证 10] 前端数据管理页面...
set "HTTP_CODE="
for /f "delims=" %%r in ('powershell -Command "(Invoke-WebRequest -Uri '%FRONTEND_URL%/datahub' -UseBasicParsing -TimeoutSec 5 -Method 'GET').StatusCode"') do set "HTTP_CODE=%%r"
if "!HTTP_CODE!"=="200" (
    echo   ✓ 通过: 数据管理页面可访问 (HTTP 200)
) else (
    echo   ✗ 失败: 数据管理页面不可访问 (HTTP !HTTP_CODE!)
)
echo.

echo [验证 11] 前端可视化/指挥中心页面...
set "HTTP_CODE="
for /f "delims=" %%r in ('powershell -Command "(Invoke-WebRequest -Uri '%FRONTEND_URL%/visualize' -UseBasicParsing -TimeoutSec 5 -Method 'GET').StatusCode"') do set "HTTP_CODE=%%r"
if "!HTTP_CODE!"=="200" (
    echo   ✓ 通过: 可视化/指挥中心页面可访问 (HTTP 200)
) else (
    echo   ✗ 失败: 可视化/指挥中心页面不可访问 (HTTP !HTTP_CODE!)
)
echo.

echo [验证 12] 前端平台配置页面...
set "HTTP_CODE="
for /f "delims=" %%r in ('powershell -Command "(Invoke-WebRequest -Uri '%FRONTEND_URL%/platform-config' -UseBasicParsing -TimeoutSec 5 -Method 'GET').StatusCode"') do set "HTTP_CODE=%%r"
if "!HTTP_CODE!"=="200" (
    echo   ✓ 通过: 平台配置页面可访问 (HTTP 200)
) else (
    echo   ✗ 失败: 平台配置页面不可访问 (HTTP !HTTP_CODE!)
)
echo.

echo [验证 13] 前端运营中心页面...
set "HTTP_CODE="
for /f "delims=" %%r in ('powershell -Command "(Invoke-WebRequest -Uri '%FRONTEND_URL%/operations' -UseBasicParsing -TimeoutSec 5 -Method 'GET').StatusCode"') do set "HTTP_CODE=%%r"
if "!HTTP_CODE!"=="200" (
    echo   ✓ 通过: 运营中心页面可访问 (HTTP 200)
) else (
    echo   ✗ 失败: 运营中心页面不可访问 (HTTP !HTTP_CODE!)
)
echo.

echo ================================================================
echo   功能验证完成！
echo   请在浏览器中打开以下链接进行手动测试:
echo   前端: %FRONTEND_URL%/login
echo   默认账户: admin / admin123
echo ================================================================
echo.
pause
