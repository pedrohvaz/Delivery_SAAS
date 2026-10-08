# Publica o Bylink no PC (stack Docker + Cloudflare Tunnel) com verificações antes.
#
#   powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1                 # tudo
#   powershell -ExecutionPolicy Bypass -File deploy\deploy.ps1 -Services api   # só a API
#   ... -SkipChecks   # pula typecheck/testes (só em emergência)
#
# Passos: 1) typecheck dos apps  2) testes da API (banco/Redis de QA)  3) backup do banco
#         4) build + restart de cada serviço, um por vez, com nova tentativa em falha de rede
#         5) confere os endereços públicos

param(
  [string[]]$Services = @('api', 'web-admin', 'web-store', 'web-superadmin'),
  [switch]$SkipChecks
)

$ErrorActionPreference = 'Stop'
# Com "powershell -File" uma lista chega como texto único ("api,web-store"): separa aqui
$Services = @($Services | ForEach-Object { $_ -split ',' } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$compose = @('compose', '--env-file', '.env.tunnel', '-f', 'docker-compose.server.yml', '-f', 'docker-compose.tunnel.yml')

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Fail($msg) { Write-Host "FALHOU: $msg" -ForegroundColor Red; exit 1 }

if (-not $SkipChecks) {
  Step 'Verificando tipos'
  foreach ($app in @('api', 'web-admin', 'web-store', 'web-superadmin')) {
    Push-Location "apps\$app"
    npx tsc --noEmit -p . | Out-Host
    $code = $LASTEXITCODE
    Pop-Location
    if ($code -ne 0) { Fail "erros de tipo em $app" }
    Write-Host "  $app ok"
  }

  Step 'Rodando os testes da API (banco delivery_qa + Redis qa_redis)'
  docker start qa_redis | Out-Null
  docker exec qa_redis redis-cli FLUSHALL | Out-Null
  Push-Location 'apps\api'
  npx vitest run | Out-Host
  $code = $LASTEXITCODE
  Pop-Location
  if ($code -ne 0) { Fail 'testes da API' }
}

Step 'Backup do banco antes de publicar'
powershell -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\backup-db.ps1"
if ($LASTEXITCODE -ne 0) { Fail 'backup (veja backups\backup.log)' }

foreach ($svc in $Services) {
  Step "Publicando $svc"
  $ok = $false
  for ($try = 1; $try -le 3 -and -not $ok; $try++) {
    docker @compose up -d --build --no-deps $svc | Out-Host
    if ($LASTEXITCODE -eq 0) { $ok = $true } else { Write-Host "  tentativa $try falhou; tentando de novo em 10s"; Start-Sleep 10 }
  }
  if (-not $ok) { Fail "build/restart de $svc (o site continua com a versão anterior desse serviço)" }
}

Step 'Conferindo os endereços públicos'
$urls = @('https://api.bylink.shop/health', 'https://bylink.shop', 'https://admin.bylink.shop/login', 'https://painel.bylink.shop/login')
$bad = 0
foreach ($u in $urls) {
  $code = 0
  for ($i = 0; $i -lt 30 -and $code -ne 200; $i++) {
    try { $code = (Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 20).StatusCode } catch { $code = 0; Start-Sleep 2 }
  }
  Write-Host ("  {0,-40} {1}" -f $u, $code)
  if ($code -ne 200) { $bad++ }
}
if ($bad -gt 0) { Fail "$bad endereço(s) sem resposta 200" }

Write-Host "`nPublicado com sucesso." -ForegroundColor Green
