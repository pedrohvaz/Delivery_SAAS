-- Banner separado para celular. Aditivo e idempotente.
-- Produção: rodar com backup feito antes (deploy\backup-db.ps1).
ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "bannerMobileUrl" TEXT;
