FROM node:20-alpine AS base
RUN npm install -g pnpm@10

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/web-admin/ apps/web-admin/
COPY apps/web-admin/.env.local apps/web-admin/.env.local
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @delivery/web-admin build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@10
COPY --from=builder /app/apps/web-admin/.next/standalone ./
COPY --from=builder /app/apps/web-admin/.next/static ./apps/web-admin/.next/static
COPY --from=builder /app/apps/web-admin/public ./apps/web-admin/public
EXPOSE 3000
ENV PORT=3000
CMD ["node", "apps/web-admin/server.js"]
