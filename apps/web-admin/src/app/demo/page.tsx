import type { Metadata } from 'next'
import { Big_Shoulders } from 'next/font/google'
import ActiveSimulateDemo from '@/components/landing/ActiveSimulateDemo'

// Simulador de pedido, linkado pela página de vendas (public/site) como "pedido de teste".
// Big Shoulders com eixo de tamanho óptico: em letra grande vira o desenho "Display" da página de vendas.
const display = Big_Shoulders({ subsets: ['latin'], axes: ['opsz'], variable: '--font-bsd' })

export const metadata: Metadata = {
  title: 'Pedido de teste | ByLink',
  description: 'Monte um pedido como se fosse um cliente e veja como ele chega no painel da loja. Nada é cobrado.',
}

export default function DemoPage() {
  return (
    <div className={`${display.variable} min-h-screen bg-[#F4EBDD] text-[#1C1512]`}>
      <header className="sticky top-0 z-50 bg-[#1C1512] text-[#F4EBDD]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
          <a href="/" aria-label="ByLink, início" className="font-[family-name:var(--font-bsd)] text-[32px] font-black leading-none">
            ByL<span className="relative inline-block">ı<span className="absolute left-1/2 top-[0.02em] h-[0.2em] w-[0.2em] -translate-x-1/2 rounded-full bg-[#FFC21F]" /></span>nk
          </a>
          <a
            href="/register?plan=gratis"
            className="inline-flex h-10 items-center rounded-[10px] bg-[#FFC21F] px-4 text-[15px] font-bold text-[#1C1512] transition-colors duration-200 hover:bg-[#FFD04F]"
          >
            Criar conta grátis
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8 md:py-14">
        <a href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#5E5048] transition-colors duration-150 hover:text-[#1C1512]">
          <span aria-hidden>←</span> Voltar para o início
        </a>
        <h1 className="mt-4 font-[family-name:var(--font-bsd)] text-5xl font-black uppercase leading-[0.92] sm:text-7xl">
          Faça um pedido de teste.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#5E5048]">
          Monte o carrinho, escolha entrega ou retirada e veja o pedido chegando no painel da loja, do jeito que
          acontece de verdade. Nada é cobrado.
        </p>
        <div className="mt-10">
          <ActiveSimulateDemo />
        </div>
      </main>
    </div>
  )
}
