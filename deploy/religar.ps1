# Religa o servidor da ByLink sem reconstruir nada (use depois de reiniciar o PC ou fechar o Docker).
# Dois cliques: atalho "Religar ByLink" na Área de Trabalho.
$ErrorActionPreference = 'Continue'
$projectDir = Split-Path -Parent $PSScriptRoot
Set-Location $projectDir

function Docker-Ok { docker info *> $null; return ($LASTEXITCODE -eq 0) }

Write-Host '==> Conferindo o Docker...'
if (-not (Docker-Ok)) {
  Write-Host '    Abrindo o Docker Desktop (pode levar 1 ou 2 minutos)...'
  Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
  $t = 0
  while (-not (Docker-Ok) -and $t -lt 180) { Start-Sleep -Seconds 5; $t += 5 }
  if (-not (Docker-Ok)) { Write-Host 'ERRO: o Docker não abriu. Abra o Docker Desktop e rode de novo.' -ForegroundColor Red; Read-Host 'Enter para fechar'; exit 1 }
}

Write-Host '==> Ligando os serviços da ByLink...'
docker compose --env-file .env.tunnel -f docker-compose.server.yml -f docker-compose.tunnel.yml up -d --no-build

Write-Host '==> Esperando os sites responderem...'
$urls = 'https://api.bylink.shop/health', 'https://bylink.shop', 'https://admin.bylink.shop/login', 'https://painel.bylink.shop/login'
$ok = $false
for ($i = 0; $i -lt 24 -and -not $ok; $i++) {
  Start-Sleep -Seconds 5
  $ok = $true
  foreach ($u in $urls) {
    try { $c = (Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 10).StatusCode } catch { $c = 0 }
    if ($c -ne 200) { $ok = $false }
  }
}
foreach ($u in $urls) {
  try { $c = (Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 10).StatusCode } catch { $c = 'sem resposta' }
  Write-Host ("  {0,-38} {1}" -f $u, $c)
}
if ($ok) { Write-Host "`nByLink no ar." -ForegroundColor Green } else { Write-Host "`nAlgum endereço ainda não respondeu. Espere 1 minuto e rode de novo." -ForegroundColor Yellow }
Read-Host 'Enter para fechar'
