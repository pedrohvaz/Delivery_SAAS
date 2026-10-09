-- Preços por período de contrato (mensal, 3, 6 e 12 meses). Aditivo e idempotente.
-- Local/QA: pnpm --filter @delivery/database exec prisma db execute --file prisma/sql/add_plan_prices.sql --url "<DATABASE_URL>"
-- Produção: docker exec -i delivery_postgres psql -U delivery -d delivery_dev < packages/database/prisma/sql/add_plan_prices.sql

DO $$ BEGIN
  CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMIANNUAL', 'ANNUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Subscription" ADD COLUMN IF NOT EXISTS "cycle" "BillingCycle";

CREATE TABLE IF NOT EXISTS "PlanPrice" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "cycle" "BillingCycle" NOT NULL,
    "monthlyPrice" DECIMAL(65,30) NOT NULL,
    "stripePriceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlanPrice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PlanPrice_stripePriceId_key" ON "PlanPrice"("stripePriceId");
CREATE UNIQUE INDEX IF NOT EXISTS "PlanPrice_planId_cycle_key" ON "PlanPrice"("planId", "cycle");

DO $$ BEGIN
  ALTER TABLE "PlanPrice" ADD CONSTRAINT "PlanPrice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
