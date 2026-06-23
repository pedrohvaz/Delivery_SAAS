import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Build "standalone" para imagem Docker enxuta (server.js + deps rastreadas).
  output: 'standalone',
  // Em monorepo pnpm, a raiz de rastreamento de arquivos é a raiz do repo.
  experimental: { outputFileTracingRoot: join(__dirname, '../../') },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
}

export default nextConfig
