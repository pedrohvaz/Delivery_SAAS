-- ============================================================================
-- Avaliação da LOJA sobre o CLIENTE (privada). Aditivo e idempotente.
-- Aplicar:
--   Local:   pnpm --filter @delivery/database exec prisma db execute \
--              --file prisma/sql/add_customer_review.sql --schema prisma/schema.prisma
--   Railway: pnpm --filter @delivery/database exec prisma db execute \
--              --file prisma/sql/add_customer_review.sql --url "<DATABASE_URL_DO_RAILWAY>"
-- ============================================================================

CREATE TABLE IF NOT EXISTS "CustomerReview" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerReview_orderId_key" ON "CustomerReview"("orderId");
CREATE INDEX IF NOT EXISTS "CustomerReview_customerId_idx" ON "CustomerReview"("customerId");
CREATE INDEX IF NOT EXISTS "CustomerReview_storeId_idx" ON "CustomerReview"("storeId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerReview_orderId_fkey') THEN
    ALTER TABLE "CustomerReview" ADD CONSTRAINT "CustomerReview_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerReview_storeId_fkey') THEN
    ALTER TABLE "CustomerReview" ADD CONSTRAINT "CustomerReview_storeId_fkey"
      FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerReview_customerId_fkey') THEN
    ALTER TABLE "CustomerReview" ADD CONSTRAINT "CustomerReview_customerId_fkey"
      FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
