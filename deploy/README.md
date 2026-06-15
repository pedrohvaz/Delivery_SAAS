# Deploy — ByLink Delivery

Arranjo recomendado (econômico) para começar com poucos clientes:

```
Front-ends (Next.js)      →  Vercel (free)        admin / loja / superadmin
API + Postgres + Redis    →  Railway              apps/api (já configurado)
Evolution API (WhatsApp)  →  VPS barato           deploy/evolution/
Microsserviço de cardápio →  Railway ou VPS       apps/cardapio-service (opcional)
```

## 1. API (Railway)
Já tem `apps/api/railway.toml` (Nixpacks) e `apps/api/Dockerfile`. Variáveis a configurar
no serviço (além das já existentes de DB/JWT/Stripe/R2):

```
# IA (chaves da plataforma — fallback quando a loja não tem chave própria)
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
OPENROUTER_API_KEY=...

# WhatsApp / Evolution (provisionamento automático por loja)
EVOLUTION_API_URL=https://whatsapp.SEU-DOMINIO.com
EVOLUTION_API_KEY=<AUTHENTICATION_API_KEY do servidor Evolution>
API_PUBLIC_URL=https://api.bylink.shop      # alvo dos webhooks do WhatsApp
STORE_URL=https://bylink.shop               # base do link do cardápio no bot
```

### Migração do banco (produção)
O build do Railway roda `prisma migrate deploy`, mas as colunas do bot foram
aplicadas via `db push` (sem arquivo de migração). Antes de subir o código novo,
rode a migração idempotente contra o banco de produção:
```bash
psql "$DATABASE_PUBLIC_URL" -f deploy/sql/2026-06-bot-session.sql
```

## 2. Evolution API (VPS)
Ver [deploy/evolution/README.md](evolution/README.md). Resumo:
```bash
cd deploy/evolution
cp .env.example .env   # troque CHANGE_ME e SERVER_URL
docker compose --env-file .env up -d
```
Depois aponte `EVOLUTION_API_URL` / `EVOLUTION_API_KEY` da API para este servidor.

## 3. Front-ends (Vercel)
Cada app (`apps/web-admin`, `apps/web-store`, `apps/web-superadmin`) como projeto Vercel
separado (root = a pasta do app). Variáveis `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STORE_URL`, etc.

## Fluxo de onboarding do WhatsApp (automático, por loja)
1. Lojista abre **Automação** no painel → **Conectar WhatsApp**.
2. A API chama `POST /whatsapp/connect`: cria a instância na Evolution (nome = slug),
   registra o webhook `…/automation/webhook/{slug}` e salva `evolutionApiUrl/apiKey/instance`
   na loja.
3. O painel mostra o **QRCode**; o lojista escaneia.
4. Mensagens chegam no webhook → orquestrador do bot responde (se a automação estiver ligada).
