-- ============================================================================
-- Conta GLOBAL do cliente (estilo iFood) — vale para todas as lojas.
-- Mudanças ADITIVAS e IDEMPOTENTES (seguras para rodar em qualquer ambiente,
-- inclusive produção no Railway, e seguras para rodar mais de uma vez).
--
-- Aplicar:
--   Local:   pnpm --filter @delivery/database exec prisma db execute \
--              --file prisma/sql/add_customer_account.sql --schema prisma/schema.prisma
--   Railway: pnpm --filter @delivery/database exec prisma db execute \
--              --file prisma/sql/add_customer_account.sql --url "<DATABASE_URL_DO_RAILWAY>"
-- ============================================================================

-- CustomerAccount (conta global: telefone/e-mail + senha)
CREATE TABLE IF NOT EXISTS "CustomerAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "cpf" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerAccount_pkey" PRIMARY KEY ("id")
);

-- CustomerAccountAddress (agenda de endereços global)
CREATE TABLE IF NOT EXISTS "CustomerAccountAddress" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "label" TEXT,
    "street" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "complement" TEXT,
    "district" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "reference" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerAccountAddress_pkey" PRIMARY KEY ("id")
);

-- Vínculo do perfil store-scoped (Customer) com a conta global
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "accountId" TEXT;

-- Índices
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerAccount_email_key" ON "CustomerAccount"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "CustomerAccount_phone_key" ON "CustomerAccount"("phone");
CREATE INDEX IF NOT EXISTS "CustomerAccountAddress_accountId_idx" ON "CustomerAccountAddress"("accountId");
CREATE INDEX IF NOT EXISTS "Customer_accountId_idx" ON "Customer"("accountId");

-- Foreign keys (Postgres não tem ADD CONSTRAINT IF NOT EXISTS — usa guard)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Customer_accountId_fkey') THEN
    ALTER TABLE "Customer"
      ADD CONSTRAINT "Customer_accountId_fkey"
      FOREIGN KEY ("accountId") REFERENCES "CustomerAccount"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomerAccountAddress_accountId_fkey') THEN
    ALTER TABLE "CustomerAccountAddress"
      ADD CONSTRAINT "CustomerAccountAddress_accountId_fkey"
      FOREIGN KEY ("accountId") REFERENCES "CustomerAccount"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
