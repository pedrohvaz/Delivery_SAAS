'use client'

import { useState } from "react";
import { Check, Shield, HelpCircle, ArrowRight, Sparkles, AlertCircle, X, CheckCircle2, Store, CreditCard, ArrowLeft, RefreshCw, Sparkle } from "lucide-react";
import { PLANS, FAQS } from "./data";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";

export default function Planos() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  
  // Interactive Onboarding Activation flow
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [selectedPlanName, setSelectedPlanName] = useState("");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [storeName, setStoreName] = useState("");
  const [niche, setNiche] = useState("burger");
  const [hasCopiedUrl, setHasCopiedUrl] = useState(false);
  const [pixWebhookStatus, setPixWebhookStatus] = useState<"idle" | "loading" | "success">("idle");

  const handleToggleFaq = (index: number) => {
    setActiveFaq(prev => (prev === index ? null : index));
  };

  const handleOpenOnboarding = (planName: string) => {
    setSelectedPlanName(planName);
    setStoreName("");
    setNiche("burger");
    setHasCopiedUrl(false);
    setPixWebhookStatus("idle");
    setStep(1);
    setOnboardingOpen(true);
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!storeName.trim()) {
        alert("Por favor, digite o nome do seu estabelecimento!");
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setPixWebhookStatus("loading");
      setTimeout(() => {
        setPixWebhookStatus("success");
        setTimeout(() => {
          setStep(3);
          confetti({
            particleCount: 80,
            spread: 60,
            origin: { y: 0.6 }
          });
        }, 1200);
      }, 1500);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setHasCopiedUrl(true);
    setTimeout(() => setHasCopiedUrl(false), 2000);
  };

  // Convert store name to URL-friendly slug
  const storeSlug = storeName
    ? storeName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
    : "seudelivery";

  const getPrice = (name: string) => {
    if (name === "Plano Starter") return "R$ 0";
    if (billingCycle === "annual") {
      if (name === "Plano PRO") return "R$ 63";
      if (name === "Plano Elite") return "R$ 159";
    }
    if (name === "Plano PRO") return "R$ 79";
    return "R$ 199";
  };

  return (
    <div id="planos-top" className="scroll-mt-20">
      {/* Dynamic Header specifically for our dedicated plans page */}
      <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto mb-12">
        <span className="text-xs font-bold uppercase tracking-widest text-[#FF6B00] bg-[#FFF5F0] px-3.5 py-1.5 rounded-full inline-block border border-[#FF6B00]/10 font-mono">
          🚀 PLANOS DE CRESCIMENTO BYLINK
        </span>
        <h1 className="text-3xl md:text-5xl font-black font-display tracking-tight text-[#111111] mt-4 leading-tight">
          Investimento previsível, <span className="text-[#FF6B00] italic">lucro máximo</span> no seu bolso
        </h1>
        <p className="text-[#555555] text-sm md:text-base mt-2 max-w-xl font-sans leading-relaxed">
          Sem repasse de comissões, taxas escondidas ou intermediários de pagamentos. Escolha a solução ideal para expandir o seu delivery!
        </p>

        {/* Mensal / Anual toggle badge selector */}
        <div className="flex items-center gap-3 mt-8 bg-neutral-100 p-1.5 rounded-full border border-neutral-200 shadow-sm select-none">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 pointer-events-auto cursor-pointer ${
              billingCycle === "monthly"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            Faturamento Mensal
          </button>
          <button
            onClick={() => setBillingCycle("annual")}
            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 pointer-events-auto cursor-pointer flex items-center gap-1.5 relative ${
              billingCycle === "annual"
                ? "bg-[#FF6B00] text-white shadow-sm font-black"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <span>Faturamento Anual</span>
            <span className={`px-1.5 py-0.5 text-[9px] font-black rounded-full uppercase tracking-normal ${
              billingCycle === "annual" ? "bg-white text-[#FF6B00]" : "bg-green-100 text-green-700"
            }`}>
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* Plans Pricing Grid and Features info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mb-16 max-w-6xl mx-auto">
        {PLANS.map((plan) => {
          const price = getPrice(plan.name);
          const isFeatured = plan.featured;
          return (
            <motion.div
              layout
              key={plan.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={`flex flex-col justify-between border rounded-2xl p-6 relative transition-all duration-300 ${
                isFeatured
                  ? "border-[#FF6B00] bg-[#FFF9F5] shadow-lg md:-translate-y-2 ring-2 ring-[#FF6B00]/20"
                  : "border-[#E0E0E0] bg-white hover:border-[#FF6B00]/40 shadow-sm hover:shadow"
              }`}
            >
              {isFeatured && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#FF6B00] text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full flex items-center gap-1 shadow-sm font-sans">
                  <Sparkles className="w-3 h-3 animate-spin duration-3000" /> FAVORITO DOS PARCEIROS
                </span>
              )}

              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-extrabold font-display text-[#111111] text-lg">
                      {plan.name}
                    </h3>
                    <p className="text-xs text-[#666666] leading-normal mt-1 min-h-[36px] font-sans">
                      {plan.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-baseline gap-1.5 mb-5 pb-5 border-b border-neutral-100">
                  <span className="text-4xl font-extrabold font-mono text-neutral-900">
                    {price}
                  </span>
                  <span className="text-xs font-bold text-[#666666] uppercase tracking-wider font-mono">
                    {plan.name === "Plano Starter" ? "" : billingCycle === "annual" ? "/mês (anual)" : "/mês"}
                  </span>
                </div>

                <ul className="space-y-3 pt-2">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-xs text-neutral-700 leading-normal text-left">
                      <Check className="w-4 h-4 text-[#FF6B00] mt-0.5 flex-shrink-0 stroke-[2.5px]" />
                      <span className="font-sans font-medium">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => { const slug = plan.name === "Plano PRO" ? "pro" : plan.name === "Plano Elite" ? "elite" : "gratis"; window.location.href = `/register?plan=${slug}` }}
                  className={`w-full h-11 rounded-xl text-xs font-extrabold uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    isFeatured
                      ? "bg-[#FF6B00] hover:bg-[#111111] text-white shadow-md shadow-[#FF6B00]/20"
                      : "bg-[#111111] hover:bg-[#FF6B00] text-white"
                  }`}
                >
                  Ativar {plan.name.replace("Plano ", "")}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-[10px] text-center text-neutral-400 font-mono mt-2.5">
                  ✓ Configuração imediata • Cancele quando quiser
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 📊 MATRIZ COMPARATIVA DE RECURSOS - EXTREMAMENTE ROBUSTO */}
      <div className="max-w-4xl mx-auto mb-16 text-left">
        <h3 className="font-black font-display text-lg text-[#111111] mb-6 flex items-center gap-2">
          <Sparkle className="w-5 h-5 text-[#FF6B00] fill-[#FF6B00]" />
          Comparação Direta de Recursos
        </h3>
        
        <div className="border border-neutral-200 rounded-2xl overflow-hidden shadow-sm bg-white">
          <table className="w-full text-left font-sans text-xs">
            <thead>
              <tr className="bg-neutral-50/80 border-b border-neutral-200 font-display font-extrabold text-[#111111] uppercase tracking-wider">
                <th className="p-4 w-1/3">Recursos & Serviços</th>
                <th className="p-4 text-center">Starter</th>
                <th className="p-4 text-center text-[#FF6B00] bg-[#FFF9F5]/40">PRO</th>
                <th className="p-4 text-center">Elite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              <tr>
                <td className="p-4 font-bold text-neutral-800">Taxa de comissão por venda</td>
                <td className="p-4 text-center font-mono text-green-600 font-bold">0% (Isento)</td>
                <td className="p-4 text-center font-mono text-green-600 font-bold bg-[#FFF9F5]/40">0% (Isento)</td>
                <td className="p-4 text-center font-mono text-green-600 font-bold">0% (Isento)</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-neutral-800">Limite de Pedidos Mensais</td>
                <td className="p-4 text-center font-semibold text-neutral-600">Até 50 lances</td>
                <td className="p-4 text-center font-black text-neutral-900 bg-[#FFF9F5]/40 font-mono">ILIMITADO</td>
                <td className="p-4 text-center font-black text-neutral-900 font-mono">ILIMITADO</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-neutral-800">WhatsApp Oficial Automático</td>
                <td className="p-4 text-center text-red-400">❌</td>
                <td className="p-4 text-center text-green-600 bg-[#FFF9F5]/40">✅ Link Direto</td>
                <td className="p-4 text-center text-green-600 flex items-center justify-center gap-1 select-none">
                  ✅ <span className="bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase font-mono">Bot IA</span>
                </td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-neutral-800">Validação Pix Conciliação</td>
                <td className="p-4 text-center text-red-400">❌ Manual</td>
                <td className="p-4 text-center text-green-600 bg-[#FFF9F5]/40 font-bold">✅ Automático</td>
                <td className="p-4 text-center text-green-600 font-bold">✅ Automático</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-neutral-800">Layout e Cores Customizáveis</td>
                <td className="p-4 text-center text-neutral-500">Básico (Estilo laranja)</td>
                <td className="p-4 text-center text-green-600 bg-[#FFF9F5]/40 font-bold">✅ Completo</td>
                <td className="p-4 text-center text-green-600 font-bold">✅ Completo</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-neutral-800">Interface de Balcão (PDV / Cozinha)</td>
                <td className="p-4 text-center text-red-400">❌</td>
                <td className="p-4 text-center text-green-600 bg-[#FFF9F5]/40">✅ Completa</td>
                <td className="p-4 text-center text-green-600">✅ Completa</td>
              </tr>
              <tr>
                <td className="p-4 font-bold text-neutral-800">Canal de Atendimento / Suporte</td>
                <td className="p-4 text-center text-neutral-500">Apenas E-mail</td>
                <td className="p-4 text-center text-[#FF6B00] font-bold bg-[#FFF9F5]/40">Suporte WhatsApp VIP</td>
                <td className="p-4 text-center text-purple-600 font-bold">Gerente de Conta 1-a-1</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQs Section nested below to cover all customer questions */}
      <div className="bg-white rounded-3xl border border-[#E0E0E0] p-6 shadow-sm overflow-hidden max-w-5xl mx-auto mb-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Quick FAQ summary info box */}
          <div className="lg:col-span-4 flex flex-col justify-between h-full bg-[#FFF9F5] border border-[#FF6B00]/10 p-5 rounded-xl text-left">
            <div>
              <div className="flex items-center gap-2 text-[#FF6B00] mb-2.5">
                <Shield className="w-5 h-5 stroke-[2.5]" />
                <span className="font-extrabold font-display text-sm tracking-tight">Compromisso ByLink</span>
              </div>
              <p className="text-[#111111] text-xs font-bold leading-normal mb-2">
                Dúvidas frequentes sobre faturamento e ativação
              </p>
              <div className="text-xs text-[#555555] space-y-1.5 leading-relaxed font-sans">
                <div>- <strong className="text-[#111111]">Tem fidelidade comercial?</strong> Não, cancelamentos são efetuados instantaneamente quando desejar.</div>
                <div>- <strong className="text-[#111111]">A mensalidade é fixa?</strong> Sim, via PIX ou cartão sem taxas extras por venda feita.</div>
                <div>- <strong className="text-[#111111]">Como funciona a IA?</strong> Ela atende, anota pedidos e tira dúvidas no WhatsApp.</div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-[#FF6B00]/10 text-[#666666] text-[10px] font-mono">
              <AlertCircle className="w-4 h-4 text-[#FF6B00]" />
              <span>Dúvidas adicionais? Chame-nos via Whatsapp de Suporte.</span>
            </div>
          </div>

          {/* Interactive Accordion FAQs */}
          <div className="lg:col-span-8 space-y-3 text-left">
            <h4 className="font-extrabold font-display text-sm text-[#111111] mb-2 flex items-center gap-2">
              <HelpCircle className="w-4.5 h-4.5 text-[#FF6B00]" /> Perguntas Importantes
            </h4>

            {FAQS.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div
                  key={faq.question}
                  className="border border-[#E0E0E0] rounded-xl overflow-hidden bg-[#F8F9FA] transition-all duration-200"
                >
                  <button
                    onClick={() => handleToggleFaq(idx)}
                    className="w-full text-left py-3.5 px-4 flex justify-between items-center bg-white hover:bg-[#FFF9F5] transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-bold text-[#111111] leading-snug">
                      {faq.question}
                    </span>
                    <span className="text-xs font-bold font-mono text-[#FF6B00]">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="py-3 px-4 text-xs text-[#444444] bg-[#F8F9FA] leading-relaxed border-t border-[#E0E0E0]/60 font-sans">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dynamic CTA Banner to motivate users on their checkout */}
      <div className="max-w-4xl mx-auto p-5 md:p-6 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-5 text-left mb-6 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FF6B00]/10 flex items-center justify-center text-[#FF6B00] flex-shrink-0 border border-[#FF6B00]/25">
            <Sparkles className="w-5 h-5 stroke-[2]" />
          </div>
          <div>
            <p className="text-xs font-bold text-white tracking-wide uppercase font-display">Experimente sem compromisso</p>
            <p className="text-[11px] text-neutral-400 mt-0.5 max-w-md font-sans leading-normal">
              Comece agora mesmo com nosso Plano Starter gratuito ou desfrute de 7 dias grátis de todos os recursos do Plano PRO de forma instantânea!
            </p>
          </div>
        </div>
        <button
          onClick={() => { window.location.href = "/register?plan=pro" }}
          className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#FF6B00] hover:bg-white hover:text-neutral-900 text-white transition-all whitespace-nowrap cursor-pointer shadow"
        >
          Experimentar Grátis
        </button>
      </div>

      {/* ONBOARDING MODAL FLOW (ATIVADOR DE PLANO INTERATIVO) */}
      <AnimatePresence>
        {onboardingOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-neutral-200 rounded-3xl shadow-xl max-w-md w-full overflow-hidden text-neutral-900"
            >
              {/* Header */}
              <div className="bg-neutral-950 p-4 border-b border-white/5 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF6B00] animate-ping" />
                  <span className="font-bold text-xs font-mono uppercase tracking-widest text-[#FF6B00]">Ativando {selectedPlanName}</span>
                </div>
                <button
                  onClick={() => setOnboardingOpen(false)}
                  className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto max-h-[80vh]">
                {/* Steps Navigator */}
                <div className="flex items-center justify-between mb-6 px-4">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center gap-1.5 flex-1 last:flex-initial">
                      <span className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center ${
                        step === s
                          ? "bg-[#FF6B00] text-white"
                          : step > s
                          ? "bg-green-600 text-white"
                          : "bg-neutral-100 text-neutral-400 border border-neutral-200"
                      }`}>
                        {step > s ? "✓" : s}
                      </span>
                      <span className="text-[10px] font-bold text-neutral-500 font-sans hidden sm:inline">
                        {s === 1 ? "Identidade" : s === 2 ? "Integração" : "Criação"}
                      </span>
                      {s < 3 && <div className="h-[2px] bg-neutral-200 flex-1 mx-2" />}
                    </div>
                  ))}
                </div>

                {/* STEP 1: Identification / Store Setup */}
                {step === 1 && (
                  <div className="flex flex-col gap-4 text-left">
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm text-[#111111] font-display">Identidade do Estabelecimento</h4>
                      <p className="text-[11px] text-neutral-500 font-sans leading-relaxed">Defina o nome da sua loja virtual de forma que seus clientes a identifiquem instantaneamente.</p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wide text-neutral-600 font-mono">Nome da Loja</label>
                      <div className="flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5">
                        <Store className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                        <input
                          type="text"
                          value={storeName}
                          onChange={(e) => setStoreName(e.target.value)}
                          placeholder="Ex: Burger Street, Bella Pizza"
                          className="bg-transparent border-none text-xs text-neutral-900 focus:outline-none flex-1 font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wide text-neutral-600 font-mono">Endereço Web (Slug exclusivo)</label>
                      <p className="text-[11px] font-mono text-[#FF6B00] bg-[#FFF5F0] border border-[#FF6B00]/10 rounded-lg py-1 px-2.5 truncate font-bold text-left">
                        bylink.delivery/<span className="underline">{storeSlug}</span>
                      </p>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-extrabold uppercase tracking-wide text-neutral-600 font-mono">Nicho Principal</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { id: "burger", name: "🍔 Hamburgueria" },
                          { id: "pizza", name: "🍕 Pizzaria" },
                          { id: "sushi", name: "🍣 Sushi House" },
                          { id: "sweet", name: "🍧 Açai & Doces" }
                        ].map((n) => (
                          <button
                            key={n.id}
                            type="button"
                            onClick={() => setNiche(n.id)}
                            className={`px-3 py-2 border rounded-lg text-xs font-bold text-neutral-700 transition-all text-left cursor-pointer ${
                              niche === n.id
                                ? "border-[#FF6B00] bg-[#FFF5F0] text-[#FF6B00]"
                                : "border-neutral-200 hover:bg-neutral-50"
                            }`}
                          >
                            {n.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: Payment Webhook Integration */}
                {step === 2 && (
                  <div className="flex flex-col gap-4 text-left">
                    <div className="space-y-1">
                      <h4 className="font-extrabold text-sm text-[#111111] font-display">Segurança de Pagamento e Pix</h4>
                      <p className="text-[11px] text-neutral-500 font-sans leading-relaxed">Configure as validações para que o dinheiro de cada venda Pix caia diretamente na sua conta corrente financeira sem intermediadores.</p>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-[#FFF5F0] border border-[#FF6B00]/10 rounded-xl">
                      <CreditCard className="w-5 h-5 text-[#FF6B00]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#111111] leading-tight">Taxa de Checkout: 0% + R$ 0,00</p>
                        <p className="text-[10px] text-neutral-500 font-sans leading-normal">Seus lucros líquidos em tempo integral.</p>
                      </div>
                    </div>

                    <div className="border border-neutral-200 rounded-xl p-3 space-y-2.5">
                      <p className="text-[10px] font-black uppercase tracking-wider text-neutral-600 font-mono">Simular Validador Pix</p>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-neutral-500 flex items-center gap-1.5 leading-normal">
                          <Check className="w-3.5 h-3.5 text-green-600 stroke-[3px]" /> Chave Pix do Estabelecimento (CNPJ ou Celular)
                        </label>
                        <input
                          type="text"
                          disabled
                          value="CNPJ: 00.123.456/0001-99"
                          className="w-full bg-neutral-100 border border-neutral-200 rounded py-1.5 px-2 text-xs text-neutral-500 font-mono cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {pixWebhookStatus === "loading" && (
                      <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                        <RefreshCw className="w-5 h-5 text-[#FF6B00] animate-spin" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF6B00] font-mono">Conectando Webhook de Vendas...</span>
                      </div>
                    )}

                    {pixWebhookStatus === "success" && (
                      <div className="flex flex-col items-center justify-center py-4 gap-1 text-center text-green-600 bg-green-50 rounded-xl border border-green-200">
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                        <span className="text-[11px] font-extrabold uppercase tracking-wider">Gateway Conciliação Pix Ativo!</span>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: Setup Complete Panel */}
                {step === 3 && (
                  <div className="flex flex-col items-center justify-center py-2 text-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-green-600/10 text-green-600 border border-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-7 h-7 stroke-[2.2]" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-extrabold text-[#111111] font-display text-base">Parabéns! Loja no ar com sucesso!</h4>
                      <p className="text-[11px] text-neutral-500 font-sans leading-relaxed">O seu painel de controle ByLink Delivery já está gerado e integrado com o plano <strong className="text-neutral-900">{selectedPlanName}</strong>.</p>
                    </div>

                    <div className="w-full bg-[#FFF9F5] border border-[#FF6B00]/15 rounded-xl p-3 flex flex-col gap-2 text-left">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#FF6B00] font-mono">Endereço Web Ativo da sua Loja</span>
                      <div className="flex items-center justify-between gap-1.5 bg-white border border-neutral-200 rounded-lg p-2 overflow-hidden">
                        <span className="text-[10px] font-mono font-bold text-neutral-700 truncate">bylink.delivery/{storeSlug}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyUrl(`bylink.delivery/${storeSlug}`)}
                          className="px-2 py-1 text-[9px] font-bold rounded bg-[#FF6B00] hover:bg-neutral-900 text-white transition-colors cursor-pointer flex items-center gap-1 flex-shrink-0"
                        >
                          {hasCopiedUrl ? "Copiado!" : "Copiar"}
                        </button>
                      </div>
                    </div>

                    <div className="text-left w-full border border-neutral-200 rounded-xl p-3 bg-neutral-50 space-y-1">
                      <p className="text-[10px] font-bold text-neutral-700 font-sans">Próximos Passos rápidos:</p>
                      <ul className="text-[10px] text-neutral-500 list-disc list-inside space-y-1 font-sans">
                        <li>Adicione os produtos no seu cardápio através do menu "Produtos"</li>
                        <li>Insira o seu link de vendas nas redes sociais (Instagram e WhatsApp)</li>
                        <li>Comece a receber pedidos diretamente no seu celular sem taxas!</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="bg-neutral-50 p-4 border-t border-neutral-200 flex justify-between items-center gap-2">
                {step > 1 && step < 3 ? (
                  <button
                    onClick={() => setStep(prev => (prev - 1) as 1 | 2)}
                    className="h-10 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-white border border-neutral-200 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                  </button>
                ) : (
                  <div />
                )}

                {step === 3 ? (
                  <button
                    onClick={() => setOnboardingOpen(false)}
                    className="h-10 px-6 rounded-xl text-xs font-bold uppercase tracking-widest bg-neutral-900 hover:bg-[#FF6B00] text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer w-full shadow"
                  >
                    Acessar meu Painel Admin
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleNextStep}
                    disabled={pixWebhookStatus === "loading"}
                    className="h-10 px-6 rounded-xl text-xs font-bold uppercase tracking-widest bg-[#FF6B00] hover:bg-neutral-950 text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    Próximo Passo
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
