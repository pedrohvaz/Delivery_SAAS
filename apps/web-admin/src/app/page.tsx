'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import Navbar from '@/components/landing/Navbar'
import Features from '@/components/landing/Features'
import Segments from '@/components/landing/Segments'
import ActiveSimulateDemo from '@/components/landing/ActiveSimulateDemo'
import AutomationShowcase from '@/components/landing/AutomationShowcase'
import Planos from '@/components/landing/Planos'
import FloatingWhatsapp from '@/components/landing/FloatingWhatsapp'
import { Comparison, CommissionCalculator, FinalCta, Hero, HowItWorks, PlansTeaser, SiteFooter } from '@/components/landing/sections'

type Page = 'home' | 'planos' | 'simulador'

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home')

  const handleNavigate = (page: Page, section?: string) => {
    setCurrentPage(page)
    window.location.hash = page === 'planos' ? '#planos-page' : page === 'simulador' ? '#simulador-page' : section ? `#${section}` : ''

    if (page === 'home' && section) {
      setTimeout(() => document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' }), 120)
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Navegação por hash (botão voltar, favoritos e links diretos)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash
      if (hash === '#planos-page') {
        setCurrentPage('planos')
        window.scrollTo({ top: 0 })
      } else if (hash === '#simulador-page') {
        setCurrentPage('simulador')
        window.scrollTo({ top: 0 })
      } else {
        setCurrentPage('home')
        if (hash) {
          const el = document.getElementById(hash.replace('#', ''))
          if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 120)
        }
      }
    }
    window.addEventListener('hashchange', handleHash)
    handleHash()
    return () => window.removeEventListener('hashchange', handleHash)
  }, [])

  return (
    <div className="lp flex min-h-screen flex-col selection:bg-lp-brand selection:text-white">
      <Navbar currentPage={currentPage} onNavigate={handleNavigate} />

      <main className="flex-1">
        {currentPage === 'home' && (
          <>
            <Hero onNavigate={handleNavigate} />
            <CommissionCalculator onNavigate={handleNavigate} />
            <HowItWorks />

            <section id="funcionalidades" className="section border-b border-lp-line scroll-mt-16">
              <div className="mx-auto max-w-6xl px-5 sm:px-8">
                <Features />
              </div>
            </section>

            <AutomationShowcase />
            <Comparison />

            <section id="segmentos" className="section border-b border-lp-line scroll-mt-16">
              <div className="mx-auto max-w-6xl px-5 sm:px-8">
                <Segments />
              </div>
            </section>

            <PlansTeaser onNavigate={handleNavigate} />
            <FinalCta />
          </>
        )}

        {currentPage === 'simulador' && (
          <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 md:py-14">
            <BackLink onClick={() => handleNavigate('home')} />
            <div className="mb-10 mt-6 max-w-2xl">
              <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.015em] sm:text-5xl">
                Faça um pedido de teste.
              </h1>
              <p className="mt-4 leading-relaxed text-lp-muted">
                Monte o carrinho, escolha entrega ou retirada e pague com Pix: você vê o pedido chegando no WhatsApp da
                loja, do jeito que acontece de verdade. Nada é cobrado.
              </p>
            </div>
            <ActiveSimulateDemo />
          </div>
        )}

        {currentPage === 'planos' && (
          <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 md:py-14">
            <BackLink onClick={() => handleNavigate('home')} />
            <div className="mt-6">
              <Planos />
            </div>
          </div>
        )}
      </main>

      <SiteFooter onNavigate={handleNavigate} />
      <FloatingWhatsapp />
    </div>
  )
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-1.5 text-sm font-medium text-lp-muted transition-colors duration-150 hover:text-lp-ink"
    >
      <ArrowLeft className="h-4 w-4 transition-transform duration-150 group-hover:-translate-x-0.5" />
      Voltar para o início
    </button>
  )
}
