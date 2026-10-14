# Roda as mesmas verificações da publicação, mas sem publicar nada.
#
#   powershell -ExecutionPolicy Bypass -File deploy\testar.ps1            # tipos + testes da API
#   powershell -ExecutionPolicy Bypass -File deploy\testar.ps1 -SoTipos   # só a checagem de tipos (rápido)

param([switch]$SoTipos)

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$falhas = @()

Write-Host "`n==> Verificando tipos" -ForegroundColor Cyan
foreach ($app in @('api', 'web-admin', 'web-store', 'web-superadmin')) {
  Push-Location "apps\$app"
  npx tsc --noEmit -p . | Out-Host
  if ($LASTEXITCODE -ne 0) { $falhas += "tipos em $app" } else { Write-Host "  $app ok" }
  Pop-Location
}

if (-not $SoTipos) {
  Write-Host "`n==> Testes da API (banco delivery_qa + Redis qa_redis)" -ForegroundColor Cyan
  docker start qa_redis | Out-Null
  docker exec qa_redis redis-cli FLUSHALL | Out-Null
  Push-Location 'apps\api'
  npx vitest run | Out-Host
  if ($LASTEXITCODE -ne 0) { $falhas += 'testes da API' }
  Pop-Location
}

if ($falhas.Count) { Write-Host "`nFALHOU: $($falhas -join ', ')" -ForegroundColor Red; exit 1 }
Write-Host "`nTudo certo." -ForegroundColor Green
