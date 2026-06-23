# Deploy numa VPS (DigitalOcean/Vultr — São Paulo) — migrando do Railway

Guia passo a passo para subir **tudo** (frontends + API + banco + Redis + WhatsApp/Evolution)
numa única VPS, migrando os dados que hoje estão no Railway.

> Arquitetura: 1 VPS Hetzner CX22 (4 GB RAM) → `docker-compose.server.yml` → Caddy (HTTPS) na frente.
> Funciona em qualquer VPS Linux (Hetzner, DigitalOcean, Vultr, Oracle...). Detalhes/decisões: `~/.claude/plans/`.

---

## 0. Pré-requisitos
- Conta **Oracle Cloud** (Always Free).
- Seu **domínio** (o mesmo que hoje aponta pro Railway) + acesso ao painel de DNS.
- **3 números de WhatsApp** (um por lojista de teste).
- Acesso ao painel do **Railway** (pra copiar segredos e o link do banco).

---

## 1. Levar o código (com estas alterações) pro servidor
As mudanças que fiz estão na sua máquina. Para chegarem à VM, o caminho mais simples é o GitHub:
1. Suba este projeto (com as alterações) pro seu repo `github.com/pedrohvaz/Delivery_SAAS`
   (via GitHub Desktop ou instalando o Git). 
2. Na VM, você fará `git clone` dele (passo 7).

> Alternativa sem GitHub: compactar a pasta e enviar pra VM via `scp`.

---

## 2. Criar a VM (Hetzner Cloud — CX22)
https://www.hetzner.com/cloud  (conta nova pode pedir um documento p/ verificar identidade — leva alguns minutos/horas).

1. Crie a conta e um **Project**.
2. Add Server:
   - **Location:** **Ashburn (EUA)** — mais perto do Brasil (menor latência).
   - **Image:** Ubuntu 22.04 (ou 24.04).
   - **Type:** **CX22** (2 vCPU / 4 GB / 40 GB) — ~€3.79/mês.
   - **SSH key:** cadastre a sua (recomendado) ou use senha de root.
   - Anote o **IP público**.

---

## 3. Preparar a VM
Acesse por SSH (`ssh root@SEU_IP`, ou `ssh ubuntu@SEU_IP` conforme o provedor) e rode:
```bash
# Docker + Compose
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
# saia e entre de novo no SSH para o grupo valer
exit
```
> DigitalOcean/Vultr já vêm com as portas abertas (firewall do SO inativo). Só confira que você
> **não** criou um *Cloud Firewall* bloqueando 80/443. Se o `ufw` estiver ativo, libere:
> `sudo ufw allow 80,443/tcp`.

---

## 4. DNS (repontar do Railway pra VM)
No painel de DNS do seu domínio, crie/ajuste registros **A** apontando pro **IP da VM**:
```
api     → IP_DA_VM
admin   → IP_DA_VM
loja    → IP_DA_VM
painel  → IP_DA_VM     (opcional, super-admin)
```
> Dica: baixe o **TTL** pra 5 min antes, pra propagação rápida. Pode fazer isso já;
> o Caddy só emite os certificados quando o DNS apontar pra VM (passo 8) — ele tenta sozinho.

---

## 5. Pegar os segredos do Railway
No Railway → seu projeto → cada serviço → aba **Variables**, copie os valores de:
`JWT_SECRET` (essencial!), `OPENROUTER_API_KEY`/`OPENAI_API_KEY`/`ANTHROPIC_API_KEY`,
`STRIPE_*`, `ASAAS_*`, `R2_*`, `FIREBASE_*`.
E o **link público do Postgres** (variável `DATABASE_URL`/`DATABASE_PUBLIC_URL` do serviço Postgres) —
guarde, vamos usar no passo 9.

---

## 6. Clonar o projeto e configurar variáveis (na VM)
```bash
git clone https://github.com/pedrohvaz/Delivery_SAAS.git app
cd app

# .env de produção
cp .env.production.example .env
nano .env        # preencha senhas, JWT_SECRET (do Railway), chaves, e troque SEU-DOMINIO.com

# .env.local de cada frontend (URLs públicas, fixadas no build)
cp apps/web-admin/.env.local.example      apps/web-admin/.env.local
cp apps/web-store/.env.local.example      apps/web-store/.env.local
cp apps/web-superadmin/.env.local.example apps/web-superadmin/.env.local
# troque SEU-DOMINIO.com nos três:
sed -i 's/SEU-DOMINIO.com/SEUDOMINIO.com/g' apps/web-*/.env.local

# Caddyfile (domínio + e-mail)
nano Caddyfile   # troque SEU-DOMINIO.com (todas as linhas) e o e-mail
```

---

## 7. Migrar o banco do Railway
Primeiro suba **só o Postgres** da VM:
```bash
docker compose -f docker-compose.server.yml up -d postgres
```
Faça o dump do banco do Railway (use o link público do passo 5):
```bash
docker run --rm -v "$PWD":/backup postgres:16-alpine \
  pg_dump "POSTGRES_PUBLIC_URL_DO_RAILWAY" -Fc --no-owner -f /backup/railway.dump
```
Restaure no Postgres da VM:
```bash
docker cp railway.dump delivery_postgres:/tmp/railway.dump
docker exec delivery_postgres pg_restore -U delivery -d delivery_dev \
  --clean --if-exists --no-owner /tmp/railway.dump
```
Reconcilie o schema com o código atual (idempotente):
```bash
docker compose -f docker-compose.server.yml run --rm api \
  pnpm --filter @delivery/database db:push
```

---

## 8. Subir a stack completa
```bash
docker compose -f docker-compose.server.yml up -d --build
```
- O **build** dos frontends/API leva alguns minutos (ARM).
- Com o DNS já apontando pra VM (passo 4), o **Caddy emite os certificados HTTPS sozinho**.
- Acompanhe: `docker compose -f docker-compose.server.yml logs -f caddy api`.

Teste:
```bash
curl https://api.SEUDOMINIO.com/health     # deve responder {"status":"ok"}
```
Abra no navegador: `https://loja.SEUDOMINIO.com` e `https://admin.SEUDOMINIO.com` (com cadeado).

---

## 9. Reconectar o WhatsApp de cada loja
As lojas migradas ainda apontam pro Evolution **antigo** (do Railway/VPS anterior). Na VM o
Evolution é novo, então cada lojista precisa reconectar:
1. Entrar em `https://admin.SEUDOMINIO.com` (login do lojista).
2. **Automação** → conferir provedor/chave de IA → **Conectar WhatsApp** → escanear o **QR**.
3. Mandar uma mensagem de teste de **outro número** → o bot responde.

---

## 10. Verificação fim a fim
- [ ] `https://api...` responde `/health` com TLS válido.
- [ ] `loja.` e `admin.` abrem com HTTPS no celular.
- [ ] Login do lojista funciona (dados migrados do Railway aparecem).
- [ ] Automação: **Testar Atendente** responde (IA OK).
- [ ] WhatsApp conecta (QR) e o bot responde a uma mensagem real.
- [ ] Um pedido de teste flui da vitrine até o painel do lojista.

---

## 11. Operação e cuidados
- **Logs:** `docker compose -f docker-compose.server.yml logs -f <serviço>`.
- **Atualizar código:** `git pull && docker compose -f docker-compose.server.yml up -d --build`.
  (Se mudou alguma URL pública, os frontends precisam **rebuildar** — o `--build` cuida disso.)
- **Backup:** snapshot dos volumes `postgres_data` e `evolution_instances` (ou `pg_dump` periódico).
- **NUNCA** rode `docker compose ... down -v` → o `-v` apaga os volumes, incluindo as **sessões do
  WhatsApp** (todas as lojas teriam que reparear).
- **IA:** começando no modelo `:free` do OpenRouter. Se ficar lento/instável, troque pra
  `gpt-4o-mini` no painel de cada loja (custa centavos).
- **WhatsApp (Baileys) é não-oficial:** use números dedicados de teste; evite reinícios frequentes.

---

## 12. Desligar o Railway
Só depois de validar tudo acima (passo 10) e o DNS já estar 100% na VM, **pause/exclua** os serviços
no Railway para parar a cobrança. Guarde um `pg_dump` final do Railway por segurança.
