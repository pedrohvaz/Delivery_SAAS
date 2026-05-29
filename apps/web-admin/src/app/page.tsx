'use client'

import { useState, useEffect } from "react";
import Navbar from "@/components/landing/Navbar";
import Features from "@/components/landing/Features";
import Segments from "@/components/landing/Segments";
import ActiveSimulateDemo from "@/components/landing/ActiveSimulateDemo";
import AutomationShowcase from "@/components/landing/AutomationShowcase";
import Planos from "@/components/landing/Planos";
import FloatingWhatsapp from "@/components/landing/FloatingWhatsapp";
import { BadgeCheck, ArrowRight, ShieldAlert, CheckCircle2, XCircle, Home } from "lucide-react";
import { motion } from "motion/react";

export default function App() {
  const [currentPage, setCurrentPage] = useState<"home" | "planos" | "simulador">("home");

  const handleNavigate = (page: "home" | "planos" | "simulador", section?: string) => {
    setCurrentPage(page);
    window.location.hash = page === "planos" ? "#planos-page" : page === "simulador" ? "#simulador-page" : section ? `#${section}` : "";
    
    if (page === "home") {
      if (section) {
        setTimeout(() => {
          const el = document.getElementById(section);
          if (el) {
            el.scrollIntoView({ behavior: "smooth" });
          }
        }, 120);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Hash-based client routing to support back-button, bookmarking, and deep links
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash === "#planos-page") {
        setCurrentPage("planos");
        window.scrollTo({ top: 0 });
      } else if (hash === "#simulador-page") {
        setCurrentPage("simulador");
        window.scrollTo({ top: 0 });
      } else {
        setCurrentPage("home");
        if (hash) {
          const id = hash.replace("#", "");
          const el = document.getElementById(id);
          if (el) {
            setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 120);
          }
        }
      }
    };

    window.addEventListener("hashchange", handleHash);
    handleHash(); // Run on mount

    return () => window.removeEventListener("hashchange", handleHash);
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111111] flex flex-col selection:bg-[#FF6B00] selection:text-white">
      {/* Navigation Header */}
      <Navbar currentPage={currentPage} onNavigate={handleNavigate} />

      {/* Conditionally Render Current Page */}
      {currentPage === "home" ? (
        <motion.div
          key="home-page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex-1"
        >
          {/* Hero Section */}
          <section className="bg-gradient-to-b from-white to-[#FFF9F5] pt-12 pb-16 px-6 md:px-12 border-b border-[#E0E0E0] overflow-hidden relative">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Hero Content (7 columns) */}
              <div className="lg:col-span-7 flex flex-col gap-6 text-left relative z-10">
                <div className="inline-flex items-center gap-1.5 self-start bg-white border border-[#FF6B00]/20 rounded-full px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-[#FF6B00] shadow-sm">
                  <BadgeCheck className="w-3.5 h-3.5" /> CARDÁPIO ONLINE & AUTOMATO
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black font-display tracking-tight text-[#111111] leading-[1.05]">
                  Chega de pagar comissão pro <span className="text-[#FF6B00] relative italic inline-block">iFood</span>
                </h1>

                <p className="text-[#444444] text-sm md:text-base leading-relaxed max-w-xl">
                  Crie o seu próprio cardápio digital integrado ao WhatsApp de forma automatizada. Receba pedidos direto no seu celular, organize sua expedição e garanta <strong className="text-[#111111]">taxa 0% de comissão</strong> sobre seu faturamento.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 mt-2">
                  <button
                    onClick={() => handleNavigate("planos")}
                    className="h-12 px-6 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#FF6B00] hover:bg-[#111111] text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B00]/20"
                  >
                    Ver Planos de Assinatura
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleNavigate("simulador")}
                    className="h-12 px-6 rounded-xl text-xs font-bold uppercase tracking-wider bg-white border border-[#E0E0E0] hover:border-[#FF6B00] text-[#111111] hover:text-[#FF6B00] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    Testar Simulador Interativo
                  </button>
                </div>

                {/* Quick trust cues */}
                <div className="flex flex-wrap items-center gap-y-2 gap-x-5 mt-4 pt-4 border-t border-[#E0E0E0]/60 text-xs text-[#555555]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />
                    <span>Zero taxas escondidas</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />
                    <span>Pronto em menos de 5 min</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />
                    <span>Suporte via Whats</span>
                  </div>
                </div>
              </div>

              {/* Hero Device Mockup Asset (5 columns) */}
              <div className="lg:col-span-5 relative mt-8 lg:mt-0 flex justify-center">
                {/* Ambient glows */}
                <div className="absolute -inset-4 bg-[#FF6B00]/5 blur-2xl rounded-full pointer-events-none" />

                {/* Stacked layered card mockups */}
                <div className="relative w-full max-w-[340px] aspect-[10/11] bg-white border border-[#E0E0E0] rounded-2xl p-4 shadow-xl overflow-hidden group">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2.5 mb-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400">bylink.delivery/seuestabelecimento</span>
                  </div>

                  {/* Main Illustration Photo (Burger with high contrast) */}
                  <div className="w-full h-36 rounded-xl bg-neutral-100 overflow-hidden relative mb-3">
                    <img
                      src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=500&q=80"
                      alt="Hambúrguer Gourmet"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute top-2.5 right-2.5 bg-[#FF6B00] text-white text-[9px] font-bold px-2 py-0.5 rounded-md font-mono">
                      TAXA ZERO%
                    </span>
                  </div>

                  {/* Mock items list */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-[#F8F9FA] rounded-lg border border-[#E0E0E0]/60">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] font-mono text-[10px] font-bold flex items-center justify-center">1x</span>
                        <span className="text-xs font-bold text-[#111111]">Hamburgão Duplo Crisp</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#111111]">R$ 32,90</span>
                    </div>

                    <div className="flex justify-between items-center p-2 bg-[#F8F9FA] rounded-lg border border-[#E0E0E0]/60">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] font-mono text-[10px] font-bold flex items-center justify-center">1x</span>
                        <span className="text-xs font-bold text-[#111111]">Batata Rustica Cheddar</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-[#111111]">R$ 18,00</span>
                    </div>
                  </div>

                  {/* Simulated Customer Order Success feedback */}
                  <div className="absolute bottom-3 left-3 right-3 bg-neutral-900 border border-white/5 rounded-xl p-3 shadow-lg flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
                      <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider font-mono">Status do Pedido</p>
                      <p className="text-xs font-bold text-white leading-tight">Enviado com sucesso!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Stats Quick strip banner */}
          <section className="bg-white border-b border-[#E0E0E0] py-6 px-6">
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-center divide-y sm:divide-y-0 sm:divide-x divide-[#E0E0E0]/60">
              <div className="py-2">
                <span className="block text-2xl lg:text-3xl font-black font-mono text-[#FF6B00]">0%</span>
                <span className="block text-xs font-bold text-[#555555] uppercase tracking-wider mt-1">
                  Taxa de comissão por pedido
                </span>
              </div>
              <div className="py-2">
                <span className="block text-2xl lg:text-3xl font-black font-mono text-[#111111]">24/7</span>
                <span className="block text-xs font-bold text-[#555555] uppercase tracking-wider mt-1">
                  Disponibilidade permanente
                </span>
              </div>
              <div className="py-2">
                <span className="block text-2xl lg:text-3xl font-black font-mono text-[#111111]">&lt; 5 min</span>
                <span className="block text-xs font-bold text-[#555555] uppercase tracking-wider mt-1">
                  Tempo médio de configuração
                </span>
              </div>
            </div>
          </section>

          {/* Interactive Ordering simulation wrapper teaser */}
          <section id="simulador-teaser" className="py-20 px-6 md:px-12 border-b border-[#E0E0E0] bg-gradient-to-br from-neutral-900 to-neutral-950 text-white relative overflow-hidden select-none">
            {/* Ambient glows */}
            <div className="absolute -right-40 -top-40 w-96 h-96 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-40 -bottom-40 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-6 relative z-10">
              <span className="text-xs font-bold uppercase tracking-widest text-[#FF6B00] bg-white/5 px-3.5 py-1.5 rounded-full inline-block border border-white/10 font-mono">
                📱 SIMULADOR EM TEMPO REAL
              </span>
              <h2 className="text-3xl md:text-5xl font-black font-display tracking-tight text-white leading-tight">
                Veja o fluxo do cliente <span className="text-[#FF6B00] italic">na prática</span>
              </h2>
              <p className="text-neutral-400 text-sm md:text-base max-w-xl leading-relaxed">
                Quer ver como o seu cliente envia os pedidos e como eles chegam em tempo real sem intermediários? Criamos uma página dedicada para você simular toda a jornada de compra de forma interativa.
              </p>

              <div className="mt-4">
                <button
                  onClick={() => handleNavigate("simulador")}
                  className="h-12 px-8 rounded-xl text-xs font-black uppercase tracking-widest bg-[#FF6B00] hover:bg-white hover:text-neutral-900 text-white transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-[#FF6B00]/20"
                >
                  Abrir Simulador Interativo
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Steps display cards */}
              <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3.5 w-full pt-10 border-t border-white/5 font-sans">
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 hover:border-white/10 transition-all text-left">
                  <p className="text-xs font-bold text-white mb-1">🛒 1. Monte o Carrinho</p>
                  <p className="text-[10px] text-neutral-400">Selecione hambúrgueres e adicionais da lanchonete simulada.</p>
                </div>
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 hover:border-white/10 transition-all text-left">
                  <p className="text-xs font-bold text-white mb-1">📋 2. Escolha a Entrega</p>
                  <p className="text-[10px] text-neutral-400">Selecione entrega em domicílio ou balcão para retirada física.</p>
                </div>
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 hover:border-white/10 transition-all text-left">
                  <p className="text-xs font-bold text-white mb-1">🔑 3. Valide o PIX</p>
                  <p className="text-[10px] text-neutral-400">Confirme a transação instantânea e ative o robô de validação.</p>
                </div>
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 hover:border-white/10 transition-all text-left">
                  <p className="text-xs font-bold text-white mb-1">💬 4. WhatsApp Direto</p>
                  <p className="text-[10px] text-neutral-400">Assista à mensagem gerada exatamente como cai no estabelecimento.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Features bento list */}
          <section id="funcionalidades" className="py-16 bg-white border-b border-[#E0E0E0] px-6 md:px-12 scroll-mt-20">
            <div className="max-w-7xl mx-auto">
              <Features />
            </div>
          </section>

          {/* WhatsApp Automation Showcase Section */}
          <AutomationShowcase />

          {/* ByLink vs Marketplace Confrontation section */}
          <section id="comparativo" className="py-16 px-6 md:px-12 bg-neutral-950 border-b border-black text-white overflow-hidden scroll-mt-20">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto mb-12">
                <span className="text-xs font-bold uppercase tracking-widest text-[#FF6B00] bg-white/5 border border-white/5 px-3 py-1.5 rounded-full inline-block font-mono">
                  Economia Real
                </span>
                <h2 className="text-3xl md:text-4xl font-extrabold font-display tracking-tight text-white mt-3">
                  Quem lucra de verdade com o seu produto?
                </h2>
                <p className="text-neutral-400 text-sm mt-2">
                  Compare as condições reais de faturamento operando com marketplaces convencionais em oposição ao seu canal direto ByLink.
                </p>
              </div>

              {/* Table Container holding clean grid rows */}
              <div className="border border-neutral-800 rounded-2xl overflow-hidden bg-neutral-900/40">
                {/* Headers row */}
                <div className="grid grid-cols-12 bg-neutral-900/80 p-4 border-b border-neutral-800 font-display text-xs font-extrabold uppercase tracking-wider">
                  <div className="col-span-6 text-neutral-400">Comparativo Operacional</div>
                  <div className="col-span-3 text-red-400">Marketplaces (iFood)</div>
                  <div className="col-span-3 text-[#FF6B00]">ByLink Delivery</div>
                </div>

                {/* Row 1 */}
                <div className="grid grid-cols-12 p-4 border-b border-neutral-800 text-xs items-center">
                  <div className="col-span-6">
                    <p className="font-bold text-white">Comissão sobre pedido</p>
                    <p className="text-neutral-500 text-[10px] mt-0.5">Dinheiro retirado de cada entrega feita.</p>
                  </div>
                  <div className="col-span-3 text-red-400 font-bold font-mono">12% a 27% por pedido</div>
                  <div className="col-span-3 text-green-400 font-bold font-mono flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-green-400" /> 0% (Taxa ZERO)
                  </div>
                </div>

                {/* Row 2 */}
                <div className="grid grid-cols-12 p-4 border-b border-neutral-800 text-xs items-center">
                  <div className="col-span-6">
                    <p className="font-bold text-white">Domínio dos Clientes</p>
                    <p className="text-neutral-500 text-[10px] mt-0.5">Acesso ao contato e whatsapp para ofertas futuras.</p>
                  </div>
                  <div className="col-span-3 text-neutral-400 font-semibold flex items-center gap-1.5">
                    <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" /> Bloqueado (Os dados são deles)
                  </div>
                  <div className="col-span-3 text-green-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> Liberado (A base é 100% sua)
                  </div>
                </div>

                {/* Row 3 */}
                <div className="grid grid-cols-12 p-4 border-b border-neutral-800 text-xs items-center">
                  <div className="col-span-6">
                    <p className="font-bold text-white">Validação do Pix</p>
                    <p className="text-neutral-500 text-[10px] mt-0.5">Como você recebe pagamentos eletrônicos.</p>
                  </div>
                  <div className="col-span-3 text-neutral-400">Demorado / Taxas adicionais</div>
                  <div className="col-span-3 text-green-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-400 animate-pulse" /> Automático e cai na hora
                  </div>
                </div>

                {/* Row 4 */}
                <div className="grid grid-cols-12 p-4 text-xs items-center">
                  <div className="col-span-6">
                    <p className="font-bold text-white">Relacionamento & Fidelidade</p>
                    <p className="text-neutral-500 text-[10px] mt-0.5">Ações para reatar contatos sumidos.</p>
                  </div>
                  <div className="col-span-3 text-neutral-400">Inexistente (Sempre disputando atenção)</div>
                  <div className="col-span-3 text-green-400 font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-400" /> CRM integrado com WhatsApp
                  </div>
                </div>
              </div>

              {/* Core conclusion warning badge */}
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-neutral-900 border border-neutral-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-400/10 flex items-center justify-center text-red-400 flex-shrink-0">
                    <ShieldAlert className="w-5 h-5 stroke-[2.3]" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-white">Contas rápidas no final do mês:</p>
                    <p className="text-[11px] text-neutral-400 leading-normal">
                      Faturando R$ 15.000,00 mensais, os marketplaces retêm cerca de <strong>R$ 3.000,00</strong> em comissões. Na ByLink, seu custo é fixo e irrisório.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleNavigate("planos")}
                  className="px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-[#FF6B00] hover:bg-white hover:text-[#111111] text-white transition-all whitespace-nowrap scroll-smooth cursor-pointer"
                >
                  Quero economizar agora
                </button>
              </div>
            </div>
          </section>

          {/* Segments gallery list */}
          <section id="segmentos" className="py-16 px-6 md:px-12 border-b border-[#E0E0E0] scroll-mt-20">
            <div className="max-w-7xl mx-auto">
              <Segments />
            </div>
          </section>
        </motion.div>
      ) : currentPage === "simulador" ? (
        /* Standalone Dedicated Simulator Page Container */
        <motion.div
          key="simulador-page"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 bg-gradient-to-b from-white to-[#F8F9FA] py-12 px-6 md:px-12"
        >
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb / Back button bar */}
            <div className="flex items-center gap-2 mb-8 text-xs text-neutral-500">
              <button
                onClick={() => handleNavigate("home")}
                className="hover:text-[#FF6B00] transition-colors flex items-center gap-1 font-bold uppercase tracking-wider cursor-pointer font-sans"
              >
                <Home className="w-3.5 h-3.5" />
                Principal
              </button>
              <span className="font-mono text-neutral-300">/</span>
              <span className="text-neutral-800 font-bold uppercase tracking-wider font-sans">Simulador Interativo</span>
            </div>

            {/* Title / Description */}
            <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-widest text-[#FF6B00] bg-[#FFF5F0] px-3.5 py-1.5 rounded-full inline-block border border-[#FF6B00]/10 font-mono">
                ⚡ TESTE DE CARDÁPIO COMPLETO
              </span>
              <h1 className="text-3xl md:text-5xl font-black font-display tracking-tight text-[#111111] mt-4 leading-tight">
                Simulador de <span className="text-[#FF6B00] italic">Pedidos Sem Taxas</span>
              </h1>
              <p className="text-[#555555] text-sm md:text-base mt-2 max-w-xl font-sans leading-relaxed">
                Adicione itens, complete os dados de entrega / balcão e pague via chave PIX para acionar em tempo real o fluxo integrado do WhatsApp, tudo sem taxas para o seu bolso!
              </p>
            </div>

            <ActiveSimulateDemo />
          </div>
        </motion.div>
      ) : (
        /* Standalone Dedicated Plans Page Container */
        <motion.div
          key="planos-page"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 bg-gradient-to-b from-white to-[#F8F9FA] py-12 px-6 md:px-12"
        >
          <div className="max-w-7xl mx-auto">
            {/* Breadcrumb / Back button bar */}
            <div className="flex items-center gap-2 mb-10 text-xs text-neutral-500">
              <button
                onClick={() => handleNavigate("home")}
                className="hover:text-[#FF6B00] transition-colors flex items-center gap-1 font-bold uppercase tracking-wider cursor-pointer font-sans"
              >
                <Home className="w-3.5 h-3.5" />
                Principal
              </button>
              <span className="font-mono text-neutral-300">/</span>
              <span className="text-neutral-800 font-bold uppercase tracking-wider font-sans">Nossos Planos</span>
            </div>

            <Planos />
          </div>
        </motion.div>
      )}

      {/* Aesthetic pairing corporate Footer */}
      <footer className="bg-white border-t border-[#E0E0E0] pt-12 pb-8 px-6 md:px-12 text-[#111111] mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="text-left">
            <p className="text-lg font-black tracking-tight mb-3 font-display">
              ByLink<span className="text-[#FF6B00]">Delivery</span>
            </p>
            <p className="text-xs text-[#555555] leading-normal font-sans">
              Ajudamos restaurantes, lanchonetes e micro-comércios a reconquistarem o controle de suas vendas e o relacionamento direto com seus clientes faturando livre de taxas abusivas.
            </p>
          </div>

          <div className="text-left">
            <h4 className="font-extrabold font-display text-xs uppercase tracking-widest mb-3.5 text-[#FF6B00]">
              Empresa
            </h4>
            <ul className="space-y-2 text-xs text-[#555555] font-sans">
              <li>
                <button
                  onClick={() => handleNavigate("home", "funcionalidades")}
                  className="hover:text-[#FF6B00] transition-colors cursor-pointer"
                >
                  Funcionalidades
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigate("home", "segmentos")}
                  className="hover:text-[#FF6B00] transition-colors cursor-pointer"
                >
                  Nossos Segmentos
                </button>
              </li>
              <li>
                <button
                  onClick={() => handleNavigate("planos")}
                  className="hover:text-[#FF6B00] transition-colors cursor-pointer text-[#FF6B00] font-bold"
                >
                  Planos de Crescimento
                </button>
              </li>
            </ul>
          </div>

          <div className="text-left">
            <h4 className="font-extrabold font-display text-xs uppercase tracking-widest mb-3.5 text-[#FF6B00]">
              Contato
            </h4>
            <ul className="space-y-2 text-xs text-[#555555] font-mono">
              <li>Suporte: <span className="text-[#111111] font-bold">suporte@bylink.com.br</span></li>
              <li>WhatsApp: <span className="text-[#111111] font-bold">(11) 99999-9999</span></li>
              <li>Atendimento: Seg a Sex, das 9h às 18h</li>
            </ul>
          </div>

          <div className="text-left">
            <h4 className="font-extrabold font-display text-xs uppercase tracking-widest mb-3.5 text-[#FF6B00]">
              Sua Marca, Seu Lucro
            </h4>
            <p className="text-xs text-[#555555] leading-relaxed font-sans">
              Assine nosso plano PRO e teste grátis todo o nosso ecossistema sem risco algum.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-[#E0E0E0]/60 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-[#555555] font-mono">
          <span>&copy; {new Date().getFullYear()} ByLink Delivery Ltda. CNPJ: 00.000.000/0001-00.</span>
          <div className="flex gap-4">
            <span className="hover:text-[#FF6B00] transition-colors">Privacidade</span>
            <span>&bull;</span>
            <span className="hover:text-[#FF6B00] transition-colors">Termos</span>
          </div>
        </div>
      </footer>

      {/* Floating Interactive Trigger */}
      <FloatingWhatsapp />
    </div>
  );
}
