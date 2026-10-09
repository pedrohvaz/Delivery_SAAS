# Backup diário do banco de produção (container delivery_postgres).
# - Gera backups\delivery_<data>.sql.gz na pasta do projeto
# - Copia para o OneDrive (cópia fora deste disco)
# - Mantém só os últimos $Keep backups em cada lugar
#
# Rodar manualmente:  powershell -ExecutionPolicy Bypass -File deploy\backup-db.ps1
# Agendado pelo Agendador de Tarefas do Windows ("Bylink - Backup diario").
#
# Restaurar (CUIDADO: sobrescreve o banco):
#   gzip -dc backups\delivery_AAAAMMDD_HHMM.sql.gz | docker exec -i delivery_postgres psql -U delivery -d delivery_dev
# Restaurar as fotos:
#   docker cp backups\uploads_AAAAMMDD_HHMM.tar.gz delivery_api:/tmp/u.tar.gz
#   docker exec delivery_api tar -xzf /tmp/u.tar.gz -C /app/apps/api

param(
  [int]$Keep = 14,
  [string]$CloudDir = "$env:USERPROFILE\OneDrive\Bylink-backups"
)

$ErrorActionPreference = 'Stop'
$projectDir = Split-Path -Parent $PSScriptRoot
$localDir = Join-Path $projectDir 'backups'
$logFile = Join-Path $localDir 'backup.log'
New-Item -ItemType Directory -Force -Path $localDir | Out-Null

function Log($msg) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $msg" | Add-Content -Path $logFile -Encoding utf8 }

try {
  $stamp = Get-Date -Format 'yyyyMMdd_HHmm'
  $file = Join-Path $localDir "delivery_$stamp.sql.gz"

  # pg_dump comprimido dentro do container; o arquivo é copiado para fora em seguida
  docker exec delivery_postgres sh -c "pg_dump -U delivery -d delivery_dev --no-owner | gzip > /tmp/backup.sql.gz"
  if ($LASTEXITCODE -ne 0) { throw "pg_dump falhou (código $LASTEXITCODE). O Docker está aberto?" }
  docker cp delivery_postgres:/tmp/backup.sql.gz $file
  if ($LASTEXITCODE -ne 0) { throw "docker cp falhou (código $LASTEXITCODE)" }
  docker exec delivery_postgres rm -f /tmp/backup.sql.gz | Out-Null

  $size = (Get-Item $file).Length
  if ($size -lt 1024) { throw "Backup suspeito: só $size bytes" }

  # Fotos enviadas pelo painel (produtos, banners, logos): ficam num volume do Docker, fora do banco
  $uploadsFile = Join-Path $localDir "uploads_$stamp.tar.gz"
  docker exec delivery_api sh -c "tar -czf /tmp/uploads.tar.gz -C /app/apps/api uploads"
  if ($LASTEXITCODE -ne 0) { throw "backup das fotos falhou (código $LASTEXITCODE)" }
  docker cp delivery_api:/tmp/uploads.tar.gz $uploadsFile
  if ($LASTEXITCODE -ne 0) { throw "docker cp das fotos falhou (código $LASTEXITCODE)" }
  docker exec delivery_api rm -f /tmp/uploads.tar.gz | Out-Null

  if (Test-Path (Split-Path -Parent $CloudDir)) {
    New-Item -ItemType Directory -Force -Path $CloudDir | Out-Null
    Copy-Item $file $CloudDir -Force
    Copy-Item $uploadsFile $CloudDir -Force
  }

  foreach ($dir in @($localDir, $CloudDir)) {
    if (Test-Path $dir) {
      foreach ($pattern in @('delivery_*.sql.gz', 'uploads_*.tar.gz')) {
        Get-ChildItem $dir -Filter $pattern | Sort-Object Name -Descending | Select-Object -Skip $Keep | Remove-Item -Force
      }
    }
  }

  Log "OK $file ($([math]::Round($size / 1KB)) KB) + fotos $uploadsFile ($([math]::Round((Get-Item $uploadsFile).Length / 1KB)) KB)"
} catch {
  Log "ERRO $($_.Exception.Message)"
  exit 1
}
