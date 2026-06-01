-- Troco para dinheiro: valor com que o cliente vai pagar. Aditivo e idempotente.
-- Local:   pnpm --filter @delivery/database exec prisma db execute --file prisma/sql/add_order_change_for.sql --schema prisma/schema.prisma
-- Railway: pnpm --filter @delivery/database exec prisma db execute --file prisma/sql/add_order_change_for.sql --url "<DATABASE_URL_DO_RAILWAY>"

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "changeFor" DECIMAL(65,30);
