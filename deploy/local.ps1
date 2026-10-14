# Liga o Bylink no próprio PC para testar mudanças na hora, sem publicar.
# Usa o banco de TESTES (delivery_qa) e o Redis de testes (qa_redis): não mexe na loja real.
#
#   powershell -ExecutionPolicy Bypass -File deploy\local.ps1          # liga tudo
#   powershell -ExecutionPolicy Bypass -File deploy\local.ps1 -Parar   # desliga tudo
#
# Cada parte abre numa janela própria. Ao salvar um arquivo, a tela atualiza sozinha.
#   Vitrine     http://localhost:3101
#   Painel      http://localhost:3110
#   Superadmin  http://localhost:3102
#   API         http://localhost:3433

param([switch]$Parar)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$portas = @(3433, 3101, 3110, 3102)

function Desligar {
  foreach ($p in $portas) {
    Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue |
      ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -Confirm:$false -ErrorAction SilentlyContinue }
  }
}

if ($Parar) { Desligar; Write-Host 'Ambiente local desligado.'; exit 0 }
Desligar

# Senha do Postgres lida do .env.tunnel (nunca é mostrada na tela)
$linha = Get-Content "$root\.env.tunnel" | Where-Object { $_ -match '^POSTGRES_PASSWORD=' } | Select-Object -First 1
if (-not $linha) { Write-Host 'POSTGRES_PASSWORD não encontrado no .env.tunnel' -ForegroundColor Red; exit 1 }
$pg = $linha.Substring('POSTGRES_PASSWORD='.Length).Trim('"', "'", ' ')

docker start delivery_postgres qa_redis | Out-Null

$api = 'http://localhost:3433'
$jwt = [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
$envApi = @{
  DATABASE_URL = "postgresql://delivery:$pg@localhost:5433/delivery_qa"
  REDIS_URL = 'redis://localhost:6380'
  PORT = '3433'; HOST = '127.0.0.1'; NODE_ENV = 'production'
  JWT_SECRET = $jwt
  RATE_LIMIT_MAX = '100000'
  CORS_ORIGIN = 'http://localhost:3101,http://localhost:3110,http://localhost:3102'
  API_PUBLIC_URL = $api; UPLOADS_PUBLIC_URL = $api
  # Integrações externas desligadas: nada sai do PC (WhatsApp, IA, pagamentos)
  EVOLUTION_API_URL = ''; EVOLUTION_API_KEY = ''; OPENAI_API_KEY = ''; ANTHROPIC_API_KEY = ''
  OPENROUTER_API_KEY = ''; ASAAS_WEBHOOK_TOKEN = ''
  STRIPE_SECRET_KEY = 'sk_test_local_dummy'; STRIPE_WEBHOOK_SECRET = 'whsec_local_dummy'
}
$envWeb = @{
  NEXT_PUBLIC_API_URL = $api; NEXT_PUBLIC_WS_URL = $api
  NEXT_PUBLIC_STORE_URL = 'http://localhost:3101'; NEXT_PUBLIC_ADMIN_URL = 'http://localhost:3110'
}

function Abrir($titulo, $pasta, $comando, $vars) {
  $sets = ($vars.GetEnumerator() | ForEach-Object { "`$env:$($_.Key)='$($_.Value -replace "'", "''")'" }) -join '; '
  # O que aparece na janela também vai para %TEMP%\bylink-<pasta>.log (para ver erros depois)
  $script = "`$Host.UI.RawUI.WindowTitle='$titulo'; $sets; Set-Location '$root\apps\$pasta'; $comando 2>&1 | Tee-Object -FilePath '$env:TEMP\bylink-$pasta.log'"
  Start-Process powershell -ArgumentList '-NoExit', '-NoProfile', '-Command', $script -WindowStyle Minimized
}

Abrir 'Bylink API (testes)' 'api' 'npx tsx watch src/index.ts' $envApi
Abrir 'Bylink Vitrine' 'web-store' 'npx next dev -p 3101' $envWeb
Abrir 'Bylink Painel' 'web-admin' 'npx next dev -p 3110' $envWeb
Abrir 'Bylink Superadmin' 'web-superadmin' 'npx next dev -p 3102' $envWeb

Write-Host "`nLigando (leva uns 30 segundos)..." -ForegroundColor Cyan
for ($i = 0; $i -lt 60; $i++) {
  try { Invoke-WebRequest "http://127.0.0.1:3433/health" -UseBasicParsing -TimeoutSec 2 | Out-Null; break } catch { Start-Sleep 2 }
}
Write-Host @"

Pronto. Abra no navegador:
  Vitrine     http://localhost:3101/<slug-da-loja>
  Painel      http://localhost:3110
  Superadmin  http://localhost:3102

A primeira abertura de cada página demora uns segundos (ela é montada na hora).
Para desligar: powershell -ExecutionPolicy Bypass -File deploy\local.ps1 -Parar
"@
