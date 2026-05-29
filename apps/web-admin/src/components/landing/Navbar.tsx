'use client'

import { Menu } from "lucide-react";

interface NavbarProps {
  currentPage?: "home" | "planos" | "simulador";
  onNavigate?: (page: "home" | "planos" | "simulador", section?: string) => void;
}

export default function Navbar({ currentPage = "home", onNavigate }: NavbarProps) {
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
    <header className="sticky top-0 z-50 bg-white border-b border-[#E0E0E0] h-16 flex items-center justify-between px-6 md:px-12 shadow-sm">
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
        <button className="md:hidden p-1 text-[#111111] hover:text-[#FF6B00] transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
