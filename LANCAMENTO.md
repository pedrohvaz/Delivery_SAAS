# Checklist de Lançamento — bylink.shop

> Atualizado em 01/06/2026, após revisão geral completa do sistema.

## ✅ Validado e funcionando (revisão geral)

- **Tipagem**: 0 erros de TypeScript nos 3 apps web.
- **API (24 checks E2E)**: vitrine, loja, cardápio, pedido guest e logado, troco (CASH),
  conta global (registro/login por telefone ou e-mail), endereços, vínculo de pedidos por
  telefone, histórico global, avaliações (cliente→loja e loja→cliente), guards de autorização.
- **Storefront (19 checks no navegador)**: marketplace (busca, nota, tema), loja (cardápio,
  header), checkout completo (troco, cupom, visitante e logado), acompanhamento de pedido,
  convite de conta pós-pedido, /conta, menu inferior mobile — zero erros de runtime.
- **Painel do lojista**: login, lista de pedidos, modal (troco exibido, avaliar cliente),
  avanço de status.
- **Cupons**: validação e desconto aplicado no pedido.
- **Mesa/Garçom**: token de QR resolve, pedido TABLE sem taxa, páginas renderizam.
- **Segurança**: corrigido vazamento crítico (token de cliente acessava pedidos de todas as
  lojas nas rotas do admin); rate limit de 10/min nas rotas de login/registro.

## ⚠️ Riscos conhecidos (aceitos para o lançamento)

1. **Sem verificação de telefone (OTP)** — qualquer pessoa pode registrar uma conta com um
   telefone que não é dela e (a) ver o histórico de pedidos guest daquele número e
   (b) "ocupar" o número (phone é único). Mitigado por rate limit (10/min).
   **Fast-follow nº 1**: OTP via WhatsApp (Evolution API com instância da plataforma).
2. **Sem "esqueci a senha"** —
   - Cliente: sem caminho de recuperação (depende do OTP acima).
   - Lojista: o super-admin reseta via painel (`/super-admin` → Usuários → reset de senha).
3. **Entrega por raio (RADIUS)** sem geocoding real — usa a taxa da primeira área.
   Entrega por **bairro (DISTRICT)** funciona normalmente. ("Fase 6+" no código.)

## 🔧 Conferir antes de divulgar (configuração, não código)

- [ ] **PIX automático (Asaas)**: fazer 1 cobrança real de teste por loja que configurar a
      `asaasApiKey` (webhook de confirmação não foi testado com gateway real).
- [ ] **Planos pagos (Stripe)**: se for cobrar lojistas, testar checkout/webhook com chave
      real (`STRIPE_SECRET_KEY` no Railway). Lançando grátis: ignorar.
- [ ] **WhatsApp (Evolution)**: notificações de pedido são por loja
      (`evolutionApiUrl/Key/Instance` nas configurações) — orientar lojistas.
- [ ] **Backup do Postgres** no Railway (ativar/conferir agendamento).
- [ ] **Termos de Uso / Política de Privacidade (LGPD)** — páginas não existem ainda.

## Operacional

- Deploy: push na `main` → Railway rebuilda os 4 serviços (~2–7 min).
- Migrações de banco: manuais, SQL idempotente em `packages/database/prisma/sql/`
  aplicado com `prisma db execute` (ver scripts existentes como modelo).
- Banco local de dev: `docker compose up -d` + `pnpm --filter @delivery/database exec prisma db push`.
