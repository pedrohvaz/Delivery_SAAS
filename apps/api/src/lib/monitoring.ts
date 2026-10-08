import * as Sentry from '@sentry/node'

// Monitoramento de erros (Sentry). Só liga com SENTRY_DSN no .env — sem ele, tudo é no-op.
const dsn = process.env.SENTRY_DSN
export const monitoringEnabled = !!dsn && process.env.NODE_ENV !== 'test'

if (monitoringEnabled) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'production',
    tracesSampleRate: 0, // só erros; sem rastreamento de performance (fica no plano grátis)
    sendDefaultPii: false, // não envia IP, cookies nem cabeçalhos do cliente
  })
}

/** Reporta um erro inesperado (500). Não manda corpo da requisição — pode ter dados pessoais. */
export function captureError(err: unknown, context: { method?: string; url?: string; storeId?: string } = {}) {
  if (!monitoringEnabled) return
  Sentry.withScope((scope) => {
    if (context.storeId) scope.setTag('storeId', context.storeId)
    if (context.method) scope.setTag('method', context.method)
    if (context.url) scope.setExtra('url', context.url.split('?')[0])
    Sentry.captureException(err)
  })
}
