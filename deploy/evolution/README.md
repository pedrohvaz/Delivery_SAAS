# Evolution API (WhatsApp) — deploy em VPS

Stack de produção isolado da Evolution: **Evolution + Postgres + Redis** com volumes
persistentes. Roda num VPS barato (Hetzner/Contabo/DigitalOcean ~US$5/mês). A API do
delivery (Railway) fala com este servidor para **provisionar uma instância por loja**.

## 1. Pré-requisitos no VPS
- Docker + Docker Compose
- Um subdomínio com **registro A** apontando para o IP do VPS (ex.: `whatsapp.bylink.shop`)
- Portas **80** e **443** livres (o Caddy embutido emite o HTTPS automaticamente)

## 2. Subir (com HTTPS automático — um comando)
```bash
cp .env.example .env
nano .env   # troque CHANGE_ME, EVOLUTION_DOMAIN e SERVER_URL (=https://<EVOLUTION_DOMAIN>)
docker compose --env-file .env --profile proxy up -d
docker compose logs -f evolution-api caddy   # esperar Evolution "started" e o Caddy obter o cert
```
O `--profile proxy` sobe o **Caddy**, que pega o certificado Let's Encrypt sozinho e
encaminha `https://<EVOLUTION_DOMAIN>` → Evolution. Teste:
```bash
curl -H "apikey: SUA_CHAVE" https://whatsapp.SEU-DOMINIO.com/instance/fetchInstances
```

> Sem o `--profile proxy` a Evolution sobe **só no localhost** do servidor (sem HTTPS) —
> útil para dev/local. Em produção, use sempre o profile `proxy`.

## 3. Ligar na API do delivery (Railway)
No serviço da API, configure as variáveis:
```
EVOLUTION_API_URL=https://whatsapp.SEU-DOMINIO.com
EVOLUTION_API_KEY=<AUTHENTICATION_API_KEY do .env daqui>
API_PUBLIC_URL=https://api.bylink.shop      # alvo dos webhooks (precisa ser público)
```
Pronto: cada lojista clica em **Conectar WhatsApp** no painel → a API cria a instância
(`/instance/create`), registra o webhook (`…/automation/webhook/{slug}`) e mostra o QR.

## 4. Cuidados
- **NUNCA** rode `docker compose down -v` — o `-v` apaga o volume `evolution_instances`
  (todas as sessões de WhatsApp), forçando todos os lojistas a reparear.
- Faça backup periódico dos volumes (`evolution_instances`, `evolution_pgdata`).
- WhatsApp não-oficial (Baileys): evite restarts frequentes para reduzir risco de queda/ban.
- Para escalar (centenas de lojas), suba um segundo servidor Evolution e distribua as
  lojas entre eles (cada `Store.evolutionApiUrl` pode apontar para um servidor diferente).
