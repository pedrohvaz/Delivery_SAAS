-- Horários: pausa temporária da loja e datas especiais (feriados/folgas). Aditivo e idempotente.
-- Local:    pnpm --filter @delivery/database exec prisma db execute --file prisma/sql/add_store_pause_special_days.sql --schema prisma/schema.prisma
-- Produção: rodar com backup feito antes (deploy\backup-db.ps1).

ALTER TABLE "Store" ADD COLUMN IF NOT EXISTS "pausedUntil" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "StoreSpecialDay" (
  "id"        TEXT         NOT NULL,
  "storeId"   TEXT         NOT NULL,
  "date"      TEXT         NOT NULL,
  "isClosed"  BOOLEAN      NOT NULL DEFAULT true,
  "openTime"  TEXT,
  "closeTime" TEXT,
  "note"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StoreSpecialDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StoreSpecialDay_storeId_date_key" ON "StoreSpecialDay"("storeId", "date");

DO $$ BEGIN
  ALTER TABLE "StoreSpecialDay" ADD CONSTRAINT "StoreSpecialDay_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
