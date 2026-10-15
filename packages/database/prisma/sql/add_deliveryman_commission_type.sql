-- Entregadores: forma de pagamento (% da taxa ou R$ por entrega) e placa. Aditivo e idempotente.
-- Produção: rodar com backup feito antes (deploy\backup-db.ps1).
ALTER TABLE "Deliveryman" ADD COLUMN IF NOT EXISTS "commissionType" TEXT NOT NULL DEFAULT 'PERCENT';
ALTER TABLE "Deliveryman" ADD COLUMN IF NOT EXISTS "plate" TEXT;
