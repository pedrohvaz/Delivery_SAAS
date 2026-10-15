-- Áreas de entrega: cobrança por distância (taxa base + R$ por km). Aditivo e idempotente.
-- Local:    pnpm --filter @delivery/database exec prisma db execute --file prisma/sql/add_delivery_distance.sql --schema prisma/schema.prisma
-- Produção: rodar com backup feito antes (deploy\backup-db.ps1).

ALTER TYPE "AreaType" ADD VALUE IF NOT EXISTS 'DISTANCE';

ALTER TABLE "DeliveryArea" ADD COLUMN IF NOT EXISTS "baseKm" DOUBLE PRECISION;
ALTER TABLE "DeliveryArea" ADD COLUMN IF NOT EXISTS "perKmFee" DECIMAL(65,30);
