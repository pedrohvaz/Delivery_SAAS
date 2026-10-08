'use client'

import { useEffect, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'

type Page = 'home' | 'planos' | 'simulador'

interface NavbarProps {
  currentPage?: Page
  onNavigate?: (page: Page, section?: string) => void
}

const LINKS: { label: string; page: Page; section?: string }[] = [
  { label: 'Como funciona', page: 'home', section: 'como-funciona' },
  { label: 'Recursos', page: 'home', section: 'funcionalidades' },
  { label: 'Simulador', page: 'simulador' },
  { label: 'Planos', page: 'planos' },
]

export default function Navbar({ currentPage = 'home', onNavigate }: NavbarProps) {
  // Menu do celular: fecha ao escolher, tocar fora ou apertar Esc
  const [menuOpen, setMenuOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false) }
    const onDown = (e: MouseEvent) => { if (!headerRef.current?.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown) }
  }, [menuOpen])

  const go = (page: Page, section?: string) => {
    setMenuOpen(false)
    if (onNavigate) onNavigate(page, section)
    else if (section) document.getElementById(section)?.scrollIntoView({ behavior: 'smooth' })
    else window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const isActive = (l: (typeof LINKS)[number]) => !l.section && l.page === currentPage

  return (
    <header ref={headerRef} className="sticky top-0 z-50 border-b border-lp-line bg-lp-paper/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <button type="button" onClick={() => go('home')} className="font-display text-[1.6rem] font-semibold tracking-[-0.02em]" aria-label="ByLink — início">
          ByLink<span className="text-lp-brand">.</span>
        </button>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Principal">
          {LINKS.map((l) => (
            <button
              key={l.label}
              type="button"
              onClick={() => go(l.page, l.section)}
              aria-current={isActive(l) ? 'page' : undefined}
              className={`text-[0.9375rem] transition-colors duration-150 hover:text-lp-ink ${
                isActive(l) ? 'font-semibold text-lp-ink underline decoration-lp-brand decoration-2 underline-offset-8' : 'text-lp-muted'
              }`}
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a href="/login" className="hidden h-10 items-center px-3 text-[0.9375rem] font-medium text-lp-ink transition-colors duration-150 hover:text-lp-brand sm:inline-flex">
            Entrar
          </a>
          <a
            href="/register?plan=gratis"
            className="hidden h-10 items-center rounded-md bg-lp-ink px-4 text-[0.9375rem] font-semibold text-white transition-colors duration-200 hover:bg-lp-brand sm:inline-flex"
          >
            Criar conta grátis
          </a>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            className="flex h-10 w-10 items-center justify-center rounded-md text-lp-ink transition-colors duration-150 hover:bg-lp-cream md:hidden"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div id="landing-mobile-menu" className="absolute inset-x-0 top-16 border-b border-lp-line bg-lp-paper shadow-[0_12px_24px_-16px_rgba(28,25,23,0.35)] md:hidden">
          <nav className="flex flex-col px-5 py-2" aria-label="Menu">
            {LINKS.map((l) => (
              <button
                key={l.label}
                type="button"
                onClick={() => go(l.page, l.section)}
                className="border-b border-lp-line py-3.5 text-left text-lg font-medium last:border-0"
              >
                {l.label}
              </button>
            ))}
          </nav>
          <div className="grid grid-cols-2 gap-3 px-5 pb-5 pt-2">
            <a href="/login" className="flex h-11 items-center justify-center rounded-md border border-lp-ink/20 font-semibold">
              Entrar
            </a>
            <a href="/register?plan=gratis" className="flex h-11 items-center justify-center rounded-md bg-lp-brand font-semibold text-white">
              Criar conta grátis
            </a>
          </div>
        </div>
      )}
    </header>
  )
}
