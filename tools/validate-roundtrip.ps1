$ErrorActionPreference = "Stop"

$repoRoot = "D:\Projects\Wheel-Hub-Detection-IoT-Platform"
$outputDir = Join-Path $repoRoot "output\restart-check"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$sampleCsvPath = Join-Path $outputDir "roundtrip-bridge-import.csv"
@"
segment_id,inspection_domain,corrosion_ratio,wire_break_count,tension_loss_ratio,vibration_rms,temperature_c,inspector,note
B-001,bridge_cable,0.19,4,0.13,2.7,41.2,team-a,critical span section
B-002,bridge_cable,0.07,1,0.05,1.8,36.9,team-b,normal status
B-003,bridge_cable,0.28,6,0.24,3.4,44.8,team-a,anchor side abnormal
"@ | Set-Content -Path $sampleCsvPath -Encoding UTF8

$loginBody = @{
  username = "admin-demo"
  password = "admin123"
  role = "admin"
} | ConvertTo-Json

$login = Invoke-RestMethod `
  -Method Post `
  -Uri "http://127.0.0.1:18081/api/auth/login" `
  -ContentType "application/json" `
  -Body $loginBody
Write-Output "step: login ok"

$token = $login.token
$headers = @{ Authorization = "Bearer $token" }

$providersEnvelope = Invoke-RestMethod `
  -Method Get `
  -Uri "http://127.0.0.1:18081/api/ai/providers" `
  -Headers $headers
$providers = if ($providersEnvelope.data) { $providersEnvelope.data } else { $providersEnvelope }
$providerId = $providers[0].id
Write-Output "step: provider loaded"

$uploadJson = & curl.exe `
  -sS `
  -H "Authorization: Bearer $token" `
  -F "file=@$sampleCsvPath" `
  -F "name=Bridge Cable Roundtrip Source" `
  -F "schemaProfile=bridge_cable_roundtrip" `
  "http://127.0.0.1:18081/api/data-sources/upload"

$uploadEnvelope = $uploadJson | ConvertFrom-Json
$source = if ($uploadEnvelope.data) { $uploadEnvelope.data } else { $uploadEnvelope }
Write-Output "step: source uploaded"

$jobsEnvelope = Invoke-RestMethod `
  -Method Get `
  -Uri "http://127.0.0.1:18081/api/analysis/jobs" `
  -Headers $headers
$jobs = if ($jobsEnvelope.data) { $jobsEnvelope.data } else { $jobsEnvelope }
$job = $jobs | Where-Object { $_.sourceIds -contains $source.id } | Select-Object -First 1
if (-not $job -or -not $job.id) {
  $analysisPayload = @{
    prompt = "Assess bridge cable damage risk from uploaded measurements, include corrosion, wire break and tension-loss impacts."
    template = "bridge-cable-risk"
    verbosity = "deep"
    persona = "manager"
    locale = "zh-CN"
    providerId = $providerId
    sourceIds = @($source.id)
  } | ConvertTo-Json -Depth 8 -Compress
  $analysisJson = & curl.exe `
    -sS `
    --max-time 120 `
    -H "Authorization: Bearer $token" `
    -H "Content-Type: application/json" `
    -d $analysisPayload `
    "http://127.0.0.1:18081/api/analysis/jobs"
  $jobEnvelope = $analysisJson | ConvertFrom-Json
  $job = if ($jobEnvelope.data) { $jobEnvelope.data } else { $jobEnvelope }
}
Write-Output "step: analysis ready $($job.id)"

function New-Report($format) {
  $body = @{ format = $format } | ConvertTo-Json -Compress
  $json = & curl.exe `
    -sS `
    --max-time 120 `
    -H "Authorization: Bearer $token" `
    -H "Content-Type: application/json" `
    -d $body `
    "http://127.0.0.1:18081/api/analysis/jobs/$($job.id)/reports"
  $envelope = $json | ConvertFrom-Json
  if ($envelope.data) { return $envelope.data }
  return $envelope
}

$xlsxReport = New-Report "xlsx"
$csv7Report = New-Report "csv7"
$chartReport = New-Report "chart"
Write-Output "step: artifacts generated"

$csv7Path = Join-Path $outputDir "roundtrip-export.csv7.csv"
$xlsxPath = Join-Path $outputDir "roundtrip-export.xlsx"
$chartPath = Join-Path $outputDir "roundtrip-export.png"

& curl.exe -sS --max-time 120 -H "Authorization: Bearer $token" -o $csv7Path "http://127.0.0.1:18081/api/reports/$($csv7Report.id)/download" | Out-Null
& curl.exe -sS --max-time 120 -H "Authorization: Bearer $token" -o $xlsxPath "http://127.0.0.1:18081/api/reports/$($xlsxReport.id)/download" | Out-Null
& curl.exe -sS --max-time 120 -H "Authorization: Bearer $token" -o $chartPath "http://127.0.0.1:18081/api/reports/$($chartReport.id)/download" | Out-Null
Write-Output "step: downloads done"

$csv7Preview = Get-Content -Path $csv7Path -Encoding UTF8 | Select-Object -First 8

$result = [ordered]@{
  generatedAt = (Get-Date).ToString("o")
  importTable = @{
    path = $sampleCsvPath
    rowCount = 3
  }
  source = @{
    id = $source.id
    name = $source.name
    type = $source.type
    qualityScore = $source.qualityScore
  }
  analysis = @{
    id = $job.id
    inspectionDomain = $job.result.inspectionDomain
    riskLevel = $job.result.riskLevel
    riskScore = $job.result.riskScore
    headline = $job.result.headline
    metrics = $job.result.metrics
  }
  exports = @{
    xlsx = @{
      reportId = $xlsxReport.id
      filename = $xlsxReport.filename
      bytes = (Get-Item $xlsxPath).Length
    }
    csv7 = @{
      reportId = $csv7Report.id
      filename = $csv7Report.filename
      bytes = (Get-Item $csv7Path).Length
    }
    chart = @{
      reportId = $chartReport.id
      filename = $chartReport.filename
      bytes = (Get-Item $chartPath).Length
    }
  }
  csv7Preview = $csv7Preview
}

$reportPath = Join-Path $outputDir "backend-fullchain-validation-round2.json"
$result | ConvertTo-Json -Depth 12 | Set-Content -Path $reportPath -Encoding UTF8
Write-Output "Roundtrip validation report: $reportPath"
