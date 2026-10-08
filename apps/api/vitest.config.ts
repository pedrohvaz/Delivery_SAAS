import { defineConfig } from 'vitest/config'

// Testes de integração: sobem a app Fastify (app.inject) contra um banco/Redis de QA.
// NUNCA aponte para o banco de produção — os testes criam e alteram dados.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false, // banco compartilhado entre os arquivos
    testTimeout: 30000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'postgresql://delivery:delivery123@localhost:5433/delivery_qa',
      REDIS_URL: process.env.TEST_REDIS_URL ?? 'redis://localhost:6380',
      JWT_SECRET: 'test-secret-only-for-tests',
      CORS_ORIGIN: 'http://localhost:3001',
      STRIPE_SECRET_KEY: 'sk_test_dummy_for_tests',
      STRIPE_WEBHOOK_SECRET: 'whsec_test_secret_for_tests',
      ASAAS_WEBHOOK_TOKEN: '',
      EVOLUTION_API_URL: '',
      EVOLUTION_API_KEY: '',
      OPENAI_API_KEY: '',
      ANTHROPIC_API_KEY: '',
      OPENROUTER_API_KEY: '',
    },
  },
})
