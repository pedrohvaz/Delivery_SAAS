FROM node:20-alpine AS base
RUN npm install -g pnpm@10

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY apps/web-store/ apps/web-store/
COPY apps/web-store/.env.local apps/web-store/.env.local
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @delivery/web-store build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@10
COPY --from=builder /app/apps/web-store/.next/standalone ./
COPY --from=builder /app/apps/web-store/.next/static ./apps/web-store/.next/static
COPY --from=builder /app/apps/web-store/public ./apps/web-store/public
EXPOSE 3001
ENV PORT=3001
CMD ["node", "apps/web-store/server.js"]
