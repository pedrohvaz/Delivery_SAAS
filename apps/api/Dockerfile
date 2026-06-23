# API (Fastify) — roda via tsx em runtime (mesmo modelo do apps/api/railway.toml).
# O script "build" da API é um no-op; o start é `tsx src/index.ts`.
FROM node:20-alpine AS base
# Prisma precisa do openssl no Alpine.
RUN apk add --no-cache openssl
RUN npm install -g pnpm@10
WORKDIR /app

# Só o necessário para instalar deps da API + packages compartilhados.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY apps/api/ apps/api/

RUN pnpm install --frozen-lockfile
# Gera o Prisma Client (engine para a arquitetura desta imagem).
RUN pnpm --filter @delivery/database db:generate

EXPOSE 3333
# start = tsx src/index.ts (ver apps/api/package.json). DATABASE_URL/REDIS_URL vêm do compose.
CMD ["pnpm", "--filter", "@delivery/api", "start"]
