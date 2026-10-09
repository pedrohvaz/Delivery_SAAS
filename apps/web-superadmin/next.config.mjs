import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build "standalone" para imagem Docker enxuta (server.js + deps rastreadas).
  output: 'standalone',
  // Em monorepo pnpm, a raiz de rastreamento de arquivos é a raiz do repo.
  outputFileTracingRoot: join(__dirname, '../../'),
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  poweredByHeader: false,
  // Cabeçalhos de segurança em todas as páginas (impede embutir o site em página falsa, etc.)
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
