FROM node:20-alpine AS base
RUN npm install -g pnpm@10

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ packages/
COPY apps/web-superadmin/ apps/web-superadmin/
COPY apps/web-superadmin/.env.local apps/web-superadmin/.env.local
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @delivery/web-superadmin build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g pnpm@10
COPY --from=builder /app/apps/web-superadmin/.next/standalone ./
COPY --from=builder /app/apps/web-superadmin/.next/static ./apps/web-superadmin/.next/static
COPY --from=builder /app/apps/web-superadmin/public ./apps/web-superadmin/public
EXPOSE 3002
ENV PORT=3002
CMD ["node", "apps/web-superadmin/server.js"]
