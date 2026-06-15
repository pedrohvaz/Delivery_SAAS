# Cardápio em Imagem (serviço Python)

Microsserviço FastAPI que renderiza a imagem do cardápio (Pillow) a partir do
payload enviado pela API Fastify (`apps/api`). Não faz parte do workspace
pnpm — é executado separadamente.

## Rodando localmente

```bash
cd apps/cardapio-service
python -m venv .venv
.venv/Scripts/activate   # Windows
pip install -r requirements.txt
cp .env.example .env     # preencha OPENAI_API_KEY para usar os modos ia_fundo/ia_completo
uvicorn app.main:app --reload --port 8001
```

A API Fastify deve apontar `PYTHON_SERVICE_URL=http://localhost:8001` no `.env`.

## Endpoints

- `GET /health` — healthcheck.
- `POST /gerar-cardapio` — recebe o payload (`schemas.CardapioRequest`) e
  retorna a imagem PNG gerada.
  - `manual`: renderização feita inteiramente com Pillow.
  - `ia_fundo`: preenche descrições vazias dos produtos (GPT-4o-mini), gera
    uma imagem de fundo com DALL-E 3 a partir de `config_ia` e renderiza o
    cardápio normalmente por cima desse fundo.
  - `ia_completo`: gera o cardápio inteiro com DALL-E 3 a partir dos
    produtos/preços/categorias, redimensionando o resultado para `largura`.
  - Se `template_key`/`template_customizado` não forem informados em modos de
    IA, o template é sugerido automaticamente (GPT-4o-mini, com fallback
    `dark_red`).
  - Os modos `ia_fundo`/`ia_completo` exigem `OPENAI_API_KEY` configurado no
    `.env` deste serviço.

## Assets bundlados (`app/assets/`)

- `fonts/DejaVuSans.ttf` e `DejaVuSans-Bold.ttf` — texto (suporte a acentos
  PT-BR), extraídas do pacote `matplotlib` (licença permissiva).
- `fonts/fa-solid-900.ttf` — ícones do Font Awesome Free (SIL OFL 1.1),
  usados para os emojis de `infos_extras` (ver `app/icons.py`). Por serem
  desenhados como texto, os ícones são tingidos automaticamente com as cores
  do template.
