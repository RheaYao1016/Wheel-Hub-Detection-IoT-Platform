$ErrorActionPreference = "Stop"

$root = "D:\Projects\Wheel-Hub-Detection-IoT-Platform"

$aiJob = Start-Job -ScriptBlock {
    param($rootPath)
    Set-Location "$rootPath\services\ai-ml"
    $env:AI_ML_WORKSPACE = "$rootPath\backend\data\ai-ml"
    & "$rootPath\services\ai-ml\.venv\Scripts\python.exe" -m uvicorn main:app --host 127.0.0.1 --port 18100
} -ArgumentList $root

$backendJob = Start-Job -ScriptBlock {
    param($rootPath)
    Set-Location "$rootPath\backend"
    $env:SERVER_PORT = "18081"
    $env:APP_DATA_HOME = "$rootPath\backend\data"
    $env:APP_CORS_ALLOWED_ORIGINS = "http://127.0.0.1:3001"
    $env:APP_AI_ML_BASE_URL = "http://127.0.0.1:18100"
    & ".\mvnw.cmd" spring-boot:run
} -ArgumentList $root

$frontendJob = Start-Job -ScriptBlock {
    param($rootPath)
    Set-Location $rootPath
    $env:PORT = "3001"
    $env:NEXT_PUBLIC_API_BASE_URL = "http://127.0.0.1:18081/api"
    npm run start -- --port 3001
} -ArgumentList $root

try {
    Start-Sleep -Seconds 28
    $smoke = & $env:ComSpec /c "python $root\tools\ui_param_smoke.py 2>&1"
    if ($LASTEXITCODE -ne 0) {
        throw ($smoke | Out-String)
    }
    $backend = Invoke-RestMethod -Uri "http://127.0.0.1:18081/api/dashboard/health" -Method Get
    $ai = Invoke-RestMethod -Uri "http://127.0.0.1:18100/health" -Method Get
    [pscustomobject]@{
        smoke = $smoke
        backend = $backend
        ai = $ai
    } | ConvertTo-Json -Depth 8
}
catch {
    [pscustomobject]@{
        smoke = ($_ | Out-String)
    } | ConvertTo-Json -Depth 6
}
finally {
    Stop-Job $frontendJob -ErrorAction SilentlyContinue | Out-Null
    Stop-Job $backendJob -ErrorAction SilentlyContinue | Out-Null
    Stop-Job $aiJob -ErrorAction SilentlyContinue | Out-Null
    Remove-Job $frontendJob -Force -ErrorAction SilentlyContinue
    Remove-Job $backendJob -Force -ErrorAction SilentlyContinue
    Remove-Job $aiJob -Force -ErrorAction SilentlyContinue
}
