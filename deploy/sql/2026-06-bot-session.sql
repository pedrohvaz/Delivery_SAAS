-- Migração idempotente para este deploy (bot híbrido + gerador de cardápio).
-- Rodar contra o banco de PRODUÇÃO ANTES do deploy do código que usa esses campos.
--   psql "$DATABASE_PUBLIC_URL" -f deploy/sql/2026-06-bot-session.sql
-- 100% aditiva (CREATE ... IF NOT EXISTS / ADD COLUMN IF NOT EXISTS) e segura
-- com a API antiga ainda rodando. Pode rodar mais de uma vez sem efeito colateral.

-- Enum ConversationState
DO $$ BEGIN
  CREATE TYPE "ConversationState" AS ENUM (
    'LLM_FREE', 'COLLECTING_ADDRESS', 'SELECTING_PAYMENT', 'AWAITING_CONFIRMATION', 'FINALIZED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Colunas novas em Conversation
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "state" "ConversationState" NOT NULL DEFAULT 'LLM_FREE';
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "draft" JSONB;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "customerId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "stateUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Índice por customerId
CREATE INDEX IF NOT EXISTS "Conversation_customerId_idx" ON "Conversation" ("customerId");

-- FK para Customer (SET NULL ao excluir o cliente)
DO $$ BEGIN
  ALTER TABLE "Conversation"
    ADD CONSTRAINT "Conversation_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Mensagem automática de "loja fechada" (configurável por loja)
ALTER TABLE "AutomationConfig" ADD COLUMN IF NOT EXISTS "closedMessage" TEXT;

-- Token de segurança do webhook do WhatsApp (por loja)
ALTER TABLE "AutomationConfig" ADD COLUMN IF NOT EXISTS "webhookToken" TEXT;

-- ─────────────────────────────────────────
-- Gerador de cardápio em imagem (tabela GeneratedMenu)
-- O código deployado referencia esta tabela; criada aqui de forma idempotente.
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "GeneratedMenu" (
  "id"          TEXT NOT NULL,
  "storeId"     TEXT NOT NULL,
  "imageUrl"    TEXT NOT NULL,
  "mode"        TEXT NOT NULL,
  "templateKey" TEXT NOT NULL,
  "config"      JSONB NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GeneratedMenu_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "GeneratedMenu_storeId_createdAt_idx" ON "GeneratedMenu" ("storeId", "createdAt");
DO $$ BEGIN
  ALTER TABLE "GeneratedMenu"
    ADD CONSTRAINT "GeneratedMenu_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
