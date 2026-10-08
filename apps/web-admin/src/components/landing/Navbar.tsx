'use client'

import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";

const MOBILE_LINKS: { section: string; label: string }[] = [
  { section: "funcionalidades", label: "Funcionalidades" },
  { section: "automacao-session", label: "Automação" },
  { section: "simulador", label: "Simulador" },
  { section: "planos", label: "Planos" },
  { section: "comparativo", label: "ByLink vs Marketplaces" },
];

interface NavbarProps {
  currentPage?: "home" | "planos" | "simulador";
  onNavigate?: (page: "home" | "planos" | "simulador", section?: string) => void;
}

export default function Navbar({ currentPage = "home", onNavigate }: NavbarProps) {
  // Menu do celular (antes o botão não tinha ação e o login ficava inacessível no mobile)
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    const onClick = (e: MouseEvent) => { if (!headerRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onClick); };
  }, [menuOpen]);

  const handleNav = (section?: string) => {
    if (onNavigate) {
      if (section === "planos") {
        onNavigate("planos");
      } else if (section === "simulador" || section === "simulador-demo") {
        onNavigate("simulador");
      } else {
        onNavigate("home", section);
      }
    } else {
      if (section) {
        const el = document.getElementById(section);
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  };

  return (
    <header ref={headerRef} className="sticky top-0 z-50 bg-white border-b border-[#E0E0E0] h-16 flex items-center justify-between px-6 md:px-12 shadow-sm">
      {/* Logo */}
      <div 
        onClick={() => {
          if (onNavigate) {
            onNavigate("home");
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
        className="text-[20px] font-black text-[#111111] tracking-tight cursor-pointer font-display select-none"
      >
        ByLink<span className="text-[#FF6B00]">Delivery</span>
      </div>

      {/* Nav links */}
      <nav className="hidden md:flex items-center gap-7">
        <button
          onClick={() => handleNav("funcionalidades")}
          className={`text-[12px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            currentPage === "home" ? "text-[#666666] hover:text-[#FF6B00]" : "text-neutral-500 hover:text-[#FF6B00]"
          }`}
        >
          Funcionalidades
        </button>
        <button
          onClick={() => handleNav("automacao-session")}
          className={`text-[12px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            currentPage === "home" ? "text-[#666666] hover:text-[#FF6B00]" : "text-neutral-500 hover:text-[#FF6B00]"
          }`}
        >
          Automação
        </button>
        <button
          onClick={() => handleNav("simulador")}
          className={`text-[12px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            currentPage === "simulador" ? "text-[#FF6B00] underline underline-offset-4 decoration-2" : "text-[#666666] hover:text-[#FF6B00]"
          }`}
        >
          Simulador
        </button>
        <button
          onClick={() => handleNav("planos")}
          className={`text-[12px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            currentPage === "planos" ? "text-[#FF6B00] underline underline-offset-4 decoration-2" : "text-[#666666] hover:text-[#FF6B00]"
          }`}
        >
          Planos
        </button>
        <button
          onClick={() => handleNav("comparativo")}
          className={`text-[12px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            currentPage === "home" ? "text-[#666666] hover:text-[#FF6B00]" : "text-neutral-500 hover:text-[#FF6B00]"
          }`}
        >
          ByLink vs Marketplaces
        </button>
      </nav>

      {/* CTA Buttons */}
      <div className="flex items-center gap-3">
        <a
          href="/login"
          className="hidden sm:inline-flex items-center justify-center h-9 px-4 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#FF6B00] hover:bg-[#111111] text-white transition-all cursor-pointer shadow-md shadow-[#FF6B00]/10"
        >
          Login do Parceiro
        </a>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-menu"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg text-[#111111] hover:text-[#FF6B00] transition-colors"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {menuOpen && (
        <div
          id="landing-mobile-menu"
          className="md:hidden absolute inset-x-0 top-16 border-b border-[#E0E0E0] bg-white shadow-lg"
        >
          <nav className="flex flex-col px-6 py-3">
            {MOBILE_LINKS.map(({ section, label }) => (
              <button
                key={section}
                type="button"
                onClick={() => { setMenuOpen(false); handleNav(section); }}
                className="py-3 text-left text-sm font-bold uppercase tracking-wider text-[#333333] hover:text-[#FF6B00] border-b border-[#F0F0F0] last:border-0"
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="grid grid-cols-2 gap-3 px-6 pb-5 pt-2">
            <a href="/login" className="flex h-11 items-center justify-center rounded-lg border border-[#111111] text-sm font-bold text-[#111111]">
              Entrar
            </a>
            <a href="/register" className="flex h-11 items-center justify-center rounded-lg bg-[#FF6B00] text-sm font-bold text-white">
              Criar conta grátis
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
