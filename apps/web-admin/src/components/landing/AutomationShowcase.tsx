'use client'

import { useState, useEffect } from "react";
import { 
  Bot, 
  Smartphone, 
  Send, 
  Check, 
  CheckCheck, 
  Flame, 
  Receipt, 
  Sparkles, 
  ArrowRight, 
  Play, 
  Pause, 
  RefreshCw,
  Eye,
  BellRing
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatMessage {
  id: string;
  sender: "customer" | "bot";
  text: string;
  time: string;
  status?: "sent" | "delivered" | "read";
  isMenuLink?: boolean;
  isOrderCard?: boolean;
  phaseIndex: number;
}

export default function AutomationShowcase() {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Simulated Chat Messages in a single continuous layout representation of all phases
  const allMessages: ChatMessage[] = [
    {
      id: "msg1",
      sender: "customer",
      text: "Boa noite! Gostaria de ver o cardápio e fazer um pedido",
      time: "20:00",
      status: "read",
      phaseIndex: 0
    },
    {
      id: "msg2",
      sender: "bot",
      text: "Olá! Seja muito bem-vindo à Hamburgueria Real! 🍔🍟\n\nNossa assistente virtual vai te guiar de forma rápida e segura. Nós atendemos de forma 100% autônoma e imediata!",
      time: "20:00",
      phaseIndex: 0
    },
    {
      id: "msg3",
      sender: "bot",
      text: "Para montar o seu carrinho em menos de 1 minuto, clique no link abaixo. Lá você escolhe complementos e adicionais com total facilidade!",
      time: "20:00",
      phaseIndex: 1
    },
    {
      id: "msg4",
      sender: "bot",
      text: "👉 bylink.delivery/hamburgueria",
      time: "20:00",
      isMenuLink: true,
      phaseIndex: 1
    },
    {
      id: "msg5",
      sender: "customer",
      text: "Acabei de fechar meu carrinho lá no link!",
      time: "20:02",
      status: "read",
      phaseIndex: 2
    },
    {
      id: "msg6",
      sender: "bot",
      text: "Novo Pedido Recebido com Sucesso! 🎉",
      time: "20:02",
      isOrderCard: true,
      phaseIndex: 2
    },
    {
      id: "msg7",
      sender: "bot",
      text: "✅ Nosso robô de automação financeira já está pronto para validar seu pagamento instantaneamente se você optou por Pix!",
      time: "20:02",
      phaseIndex: 2
    },
    {
      id: "msg8",
      sender: "bot",
      text: "💸 PIX Confirmado com Sucesso via Automação ByLink! Nota fiscal emitida e enviada para produção na cozinha.",
      time: "20:03",
      phaseIndex: 3
    },
    {
      id: "msg9",
      sender: "bot",
      text: "Diga adeus ao iFood! Acompanhe o preparo em tempo real clicando aqui:\n👉 bylink.delivery/acompanhar/BY-7489",
      time: "20:03",
      phaseIndex: 3
    }
  ];

  const stepsInfo = [
    {
      title: "Atende Sozinha",
      subtitle: "Autonomia 100%",
      description: "O robô atende o cliente no exato milissegundo em que ele manda um 'oi' no seu WhatsApp. Acabe para sempre com a demora que faz o cliente desistir e comprar do concorrente.",
      highlight: "Resposta imediata 24 horas por dia, 7 dias por semana.",
      badge: "Início Instantâneo",
      icon: Bot,
      color: "border-[#FF6B00] text-[#FF6B00] bg-[#FFF5F0]"
    },
    {
      title: "Envia o Cardápio",
      subtitle: "Link Inteligente",
      description: "A automação envia o link exclusivo do seu cardápio virtual ByLink. O cliente escolhe tamanhos, complementos, adicionais (com fotos e promoções) no celular dele, sem fricção.",
      highlight: "Sem instalar aplicativo, abre em qualquer navegador em 1 segundo.",
      badge: "Zero Uploads",
      icon: Smartphone,
      color: "border-amber-500 text-amber-600 bg-amber-50"
    },
    {
      title: "Recebe o Pedido",
      subtitle: "Carrinho Estruturado",
      description: "Quando o cliente finaliza o pedido na página web, o carrinho chega estruturado no seu WhatsApp e na tela do estabelecimento com o endereço, forma de pagamento e adicionais selecionados.",
      highlight: "Nada de anotar errado ou esquecer dados. Evita erros de entrega em 100%.",
      badge: "Integração Perfeita",
      icon: Receipt,
      color: "border-emerald-500 text-emerald-600 bg-emerald-50"
    },
    {
      title: "Rastreamento Ativo",
      subtitle: "Até a Entrega",
      description: "Assim que aceito pelo restaurante, o cliente recebe um link dinâmico em que pode acompanhar o preparo e a moto saindo para entrega em tempo real, sem precisar ligar ou mandar mensagem cobrando.",
      highlight: "Otimiza a sua expedição e gera encantamento de ponta a ponta.",
      badge: "Fidelização Garantida",
      icon: Flame,
      color: "border-purple-500 text-purple-600 bg-purple-50"
    }
  ];

  // Auto progression system
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Auto scroll active step messages inside the whatsapp simulator container safely
  useEffect(() => {
    const container = document.getElementById("whatsapp-chat-container");
    const activeEl = document.getElementById(`step-group-${activeStep}`);
    if (container && activeEl) {
      const containerRect = container.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();
      // Smooth scroll inside the whatsapp simulator frame
      const scrollOffset = elRect.top - containerRect.top + container.scrollTop - 15;
      container.scrollTo({ top: scrollOffset, behavior: "smooth" });
    }
  }, [activeStep]);

  return (
    <div id="automacao-session" className="py-20 px-6 md:px-12 bg-white border-b border-[#E0E0E0] scroll-mt-20 select-none">
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <div className="flex flex-col items-center justify-center text-center max-w-3xl mx-auto mb-14">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#FF6B00] bg-[#FFF5F0] border border-[#FF6B00]/10 px-3.5 py-1.5 rounded-full font-mono">
            <Sparkles className="w-3.5 h-3.5" /> AGENTE INTELIGENTE WHATSAPP
          </span>
          <h2 className="text-3xl md:text-5xl font-black font-display tracking-tight text-[#111111] mt-3 leading-tight">
            Como funciona a nossa <span className="text-[#FF6B00] italic">Automação de Vendas</span>?
          </h2>
          <p className="text-[#555555] text-sm md:text-base mt-3 max-w-xl font-sans leading-relaxed">
            Esqueça o caos de ter que digitar comandas escrevendo tudo à mão, conferir comprovantes e deixar clientes no vácuo. Centralize e fature muito mais com robôs eficientes.
          </p>
        </div>

        {/* Dynamic Display Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-11 items-stretch mt-6">
          
          {/* Interactive Steps List: Column 1 (4 cols) */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-4 order-2 lg:order-1">
            <div className="space-y-3.5 text-left font-sans">
              {stepsInfo.map((step, idx) => {
                const IconComponent = step.icon;
                const isActive = activeStep === idx;
                
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setActiveStep(idx);
                      setIsPlaying(false); // Stop autoplay once user explicitly clicks
                    }}
                    className={`p-4 border rounded-2xl cursor-pointer transition-all relative overflow-hidden group ${
                      isActive 
                        ? "bg-[#FFF9F5]/90 border-[#FF6B00] shadow-md shadow-[#FF6B00]/5" 
                        : "bg-white hover:bg-neutral-50 border-neutral-200"
                    }`}
                  >
                    {/* Active highlight side line */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FF6B00]" />
                    )}

                    <div className="flex items-start gap-3.5 relative z-10">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border transition-transform group-hover:scale-105 duration-200 ${
                        isActive 
                          ? "bg-[#FF6B00] text-white border-[#FF6B00]" 
                          : "bg-neutral-100 border-neutral-200 text-neutral-600"
                      }`}>
                        <IconComponent className="w-4 h-4 stroke-[2.2]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[9.5px] font-mono font-bold uppercase text-neutral-400">
                            {step.subtitle}
                          </p>
                          <span className={`text-[8.5px] font-mono uppercase font-black px-1.5 py-0.2 rounded ${
                            isActive ? "bg-[#FF6B00]/10 text-[#FF6B00]" : "bg-neutral-100 text-neutral-500"
                          }`}>
                            Fase {idx + 1}
                          </span>
                        </div>

                        <h3 className={`text-[13.5px] font-black font-display tracking-tight leading-none mt-1.5 ${
                          isActive ? "text-[#FF6B00]" : "text-neutral-900"
                        }`}>
                          {step.title}
                        </h3>

                        <p className={`text-[11.5px] leading-relaxed mt-2 ${
                          isActive ? "text-neutral-700" : "text-neutral-500"
                        }`}>
                          {step.description}
                        </p>

                        <AnimatePresence>
                          {isActive && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-2.5 pt-2.5 border-t border-[#FF6B00]/10"
                            >
                              <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-neutral-800">
                                <Check className="w-4 h-4 text-[#FF6B00]" />
                                <span>{step.highlight}</span>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Automation Playback controller toolbar */}
            <div className="p-4 bg-[#F8F9FA] rounded-2xl border border-neutral-200/80 mt-4 flex items-center justify-between text-xs font-sans text-neutral-500">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center border border-neutral-200 transition-colors cursor-pointer bg-white ${
                    isPlaying ? "text-[#FF6B00] hover:text-[#111111]" : "text-neutral-600 hover:text-[#FF6B00]"
                  }`}
                  title={isPlaying ? "Pausar auto-simulação" : "Iniciar auto-simulação"}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 pl-0.5" />}
                </button>
                <button
                  onClick={() => {
                    setActiveStep(0);
                    setIsPlaying(true);
                  }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-neutral-200 hover:text-[#FF6B00] transition-colors cursor-pointer bg-white"
                  title="Reiniciar Simulação"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF6B00] opacity-75 ${isPlaying ? "" : "hidden"}`}></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF6B00]"></span>
                  </span>
                  <span className="text-[11px] font-mono font-bold text-neutral-600">
                    {isPlaying ? "Simulação Ativa (Auto)" : "Simulação Pausada"}
                  </span>
                </div>
              </div>

              <div className="text-[11px] font-mono font-bold text-neutral-400">
                Fase {activeStep + 1} de 4
              </div>
            </div>
          </div>

          {/* Interactive Simulation Viewports: Column 2 (8 cols) */}
          <div className="lg:col-span-8 flex flex-col justify-center order-1 lg:order-2">
            
            {/* Immersive Sandbox Screen Shell */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 md:p-8 shadow-2xl relative overflow-hidden flex flex-col justify-between sm:min-h-[540px]">
              
              {/* Top notch detail for the system interface */}
              <div className="absolute top-0 left-0 right-0 h-12 bg-neutral-950 border-b border-neutral-800 px-5 flex items-center justify-between z-10 select-none">
                <div className="flex items-center gap-2 font-mono text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>ByLink Automation Terminal v2.4</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-white/5 border border-white/10 px-2.5 py-1 rounded text-neutral-300 font-mono font-bold">
                    {activeStep === 0 && "Fase 1: Atendimento Comercial"}
                    {activeStep === 1 && "Fase 2: Envio de Cardápio Virtual"}
                    {activeStep === 2 && "Fase 3: Captura de Carrinho"}
                    {activeStep === 3 && "Fase 4: Rastreamento em Tempo Real"}
                  </span>
                </div>
              </div>

              {/* Main Active Screen Morph Canvas */}
              <div className="flex-1 mt-8 flex flex-col lg:flex-row gap-5">
                
                {/* Visual Pane A: WhatsApp Inside Phone (Left half) */}
                <div className="flex-1 bg-neutral-950 border border-neutral-800/80 rounded-2xl overflow-hidden flex flex-col justify-between relative shadow-inner">
                  {/* Whatsapp Header */}
                  <div className="bg-emerald-900 text-white p-3.5 flex items-center justify-between select-none">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 flex items-center justify-center font-bold text-xs uppercase font-mono">
                        HB
                      </div>
                      <div className="text-left leading-normal">
                        <h4 className="text-xs font-black tracking-wide leading-none flex items-center gap-1">
                          Hamburgueria Real
                          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-ping" />
                        </h4>
                        <span className="text-[9px] text-emerald-100 font-bold tracking-widest font-mono">ASSISTENTE COMERCIAL ATIVO</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-emerald-200">whatsapp web</span>
                  </div>

                  {/* Chat Messages Frame area */}
                  <div id="whatsapp-chat-container" className="flex-1 p-4 space-y-4 overflow-y-auto h-[380px] sm:h-[450px] scrollbar-none flex flex-col bg-[#0B141A] scroll-smooth">
                    <AnimatePresence mode="popLayout">
                      {allMessages.map((msg, index) => {
                        const isFirstOfPhase = index === 0 || allMessages[index - 1].phaseIndex !== msg.phaseIndex;
                        const isActive = msg.phaseIndex === activeStep;

                        return (
                          <div 
                            key={msg.id} 
                            id={isFirstOfPhase ? `step-group-${msg.phaseIndex}` : undefined}
                            className="flex flex-col space-y-3"
                          >
                            <motion.div
                              initial={{ opacity: 0, y: 15, scale: 0.95 }}
                              animate={{ 
                                opacity: isActive ? 1 : 0.8, 
                                scale: isActive ? 1 : 0.99,
                                filter: isActive ? "none" : "brightness(0.85)"
                              }}
                              transition={{ type: "spring", stiffness: 450, damping: 28 }}
                              className={`flex flex-col max-w-[88%] rounded-2xl p-4 leading-relaxed font-sans text-xs sm:text-[13px] relative shadow-md transition-all duration-300 ${
                                msg.sender === "customer"
                                  ? "bg-emerald-800 text-white self-end text-right rounded-tr-none rounded-br-md"
                                  : "bg-neutral-800/95 text-neutral-100 self-start text-left rounded-tl-none rounded-bl-md"
                              }`}
                              style={{
                                border: isActive ? `1.5px solid ${msg.sender === "customer" ? "#10b981" : "#FF6B00"}` : "1.5px solid transparent"
                              }}
                            >
                              {/* Rich Cards Render details inside chat */}
                              {msg.isMenuLink ? (
                                <div className="text-left font-sans flex flex-col gap-1.5 rounded-xl bg-neutral-900/85 p-3.5 border-l-4 border-[#FF6B00] shadow-md w-full">
                                  <p className="font-black text-[11px] text-[#FF6B00] uppercase font-mono tracking-widest leading-none">Cardápio Interativo 🍔</p>
                                  <a href="#simulador" className="text-sky-300 hover:underline font-black font-mono text-sm block py-1 truncate">
                                    bylink.delivery/hamburgueria
                                  </a>
                                  <p className="text-[11.5px] text-neutral-300 mt-0.5 font-sans leading-normal">Toque no cardápio para pedir em 30 segundos, sem taxas e sem precisar baixar nada!</p>
                                </div>
                              ) : msg.isOrderCard ? (
                                <div className="text-left font-sans flex flex-col gap-2 rounded-xl bg-neutral-900/85 p-3.5 border-l-4 border-emerald-500 shadow-md w-full">
                                  <div className="flex justify-between items-center bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg">
                                    <p className="font-black text-[11px] text-emerald-400 font-mono uppercase tracking-wider">PEDIDO CONFIRMADO 🎉</p>
                                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-black font-mono px-2 py-0.5 rounded-full">#BY-7489</span>
                                  </div>
                                  <div className="text-[11.5px] text-neutral-200 mt-1.5 space-y-1 bg-black/30 p-2.5 rounded-lg font-sans">
                                    <p className="flex justify-between gap-2"><span>🍔 <strong>1x</strong> X-Burger Premium</span> <span className="text-neutral-450 font-mono">R$ 28,90</span></p>
                                    <p className="flex justify-between gap-2"><span>🍟 <strong>1x</strong> Batata Suprema Grande</span> <span className="text-neutral-450 font-mono">R$ 22,00</span></p>
                                    <p className="flex justify-between gap-2"><span>🥤 <strong>1x</strong> Refrigerante Lata</span> <span className="text-neutral-450 font-mono">R$ 6,00</span></p>
                                  </div>
                                  <div className="border-t border-dashed border-neutral-700 my-1" />
                                  <div className="flex justify-between items-baseline px-1">
                                    <span className="text-[11px] text-neutral-400">Total com Taxa R$ 0,00:</span>
                                    <strong className="text-sm text-emerald-400 font-mono font-black">R$ 56,90</strong>
                                  </div>
                                </div>
                              ) : (
                                <p className="whitespace-pre-line leading-relaxed break-words text-[12px] sm:text-[13px]">{msg.text}</p>
                              )}
                              
                              <div className="flex justify-end gap-1 items-center mt-1.5 text-[9px] text-neutral-400 select-none">
                                <span>{msg.time}</span>
                                {msg.sender === "customer" && (
                                  <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                                )}
                              </div>
                            </motion.div>
                          </div>
                        );
                      })}
                    </AnimatePresence>
                  </div>

                  {/* Simulated texting footer bar */}
                  <div className="p-3 bg-[#1F2C34] border-t border-neutral-800 flex items-center gap-2 select-none">
                    <div className="flex-1 bg-[#2A3942] rounded-xl h-9 px-3.5 flex items-center justify-between text-xs text-neutral-400 font-sans">
                      <span>Ecreva uma mensagem...</span>
                    </div>
                    <button className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center cursor-default">
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Visual Pane B: Establishing Screen Dashboard (Right half) */}
                <div className="flex-1 bg-neutral-950 border border-neutral-800/80 rounded-2xl overflow-hidden flex flex-col justify-between shadow-lg max-h-[300px] lg:max-h-none">
                  {/* PDV Header */}
                  <div className="bg-neutral-900 border-b border-neutral-850 p-3.5 flex items-center justify-between select-none">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded bg-[#FF6B00]/10 border border-[#FF6B00]/20 flex items-center justify-center text-[#FF6B00]">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-extrabold text-white uppercase tracking-wider font-mono">
                        Painel de Expedição
                      </span>
                    </div>
                    <span className="text-[9px] bg-indigo-500/10 border border-indigo-400/20 text-indigo-400 font-mono px-2 py-1 rounded-full font-bold">
                      COZINHA CONECTADA
                    </span>
                  </div>

                  {/* Dynamic Panel update details mapping layout */}
                  <div className="flex-1 p-5 text-left font-sans flex flex-col justify-between min-h-[220px]">
                    <div className="space-y-4">
                      {/* Active Order State Indicator Container */}
                      {activeStep >= 2 ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 relative overflow-hidden"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-xs font-black text-white">#BY-7489</span>
                            {activeStep === 2 ? (
                              <span className="inline-flex items-center gap-1 text-[9px] bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded font-mono font-bold text-amber-500">
                                🕒 AGUARDANDO PIX
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded font-mono font-bold text-emerald-400">
                                🍳 PREPARANDO CARDÁPIO
                              </span>
                            )}
                          </div>

                          <div className="space-y-1 font-mono text-[10.5px]">
                            <p className="text-white font-sans text-[11.5px] font-bold">Cliente: Marcos G. <span className="text-[9.5px] text-neutral-400 font-mono font-normal">(Apenas Leitura)</span></p>
                            <p className="text-neutral-400">Total: R$ 56,90 &bull; Pagamento: Pix Online</p>
                          </div>

                          {/* Dynamic steps tracker indicator bar inside establishment widget */}
                          <div className="mt-4">
                            <div className="flex justify-between items-baseline mb-1">
                              <span className="text-[10px] text-neutral-400 font-sans">Barra de Progresso Interno</span>
                              <span className="text-[10.5px] font-mono text-neutral-300 font-bold">
                                {activeStep === 2 ? "35%" : "70%"}
                              </span>
                            </div>
                            <div className="w-full bg-neutral-950 rounded-full h-2 p-[1px] border border-neutral-850">
                              <div 
                                className="h-full rounded-full bg-[#FF6B00] transition-all duration-700" 
                                style={{ width: activeStep === 2 ? "35%" : "70%" }}
                              />
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <div className="py-10 px-5 flex flex-col items-center justify-center text-center bg-neutral-900/30 border border-neutral-800/80 border-dashed rounded-xl h-32">
                          <Eye className="w-7 h-7 text-neutral-500 mb-2.5 animate-pulse" />
                          <p className="text-xs font-black text-neutral-300 font-display">Aguardando Envio do Cliente</p>
                          <p className="text-[11px] text-neutral-500 font-sans max-w-[200px] mt-1 leading-normal">
                            Assim que o carrinho for enviado na Fase 3, as informações cairão aqui automaticamente.
                          </p>
                        </div>
                      )}

                      {/* Display Automation Notification alerts */}
                      <AnimatePresence mode="wait">
                        {activeStep === 3 ? (
                          <motion.div
                            key="notif-active"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-center gap-2 text-xs text-emerald-300 font-sans font-bold leading-normal"
                          >
                            <BellRing className="w-5 h-5 text-emerald-400 animate-bounce flex-shrink-0" />
                            <span>Impressora térmica ByLink acionada! O cupom de produção já saiu na cozinha de forma automática.</span>
                          </motion.div>
                        ) : activeStep === 2 ? (
                          <motion.div
                            key="notif-payment"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl p-3.5 flex items-center gap-2 text-xs text-[#25D366] font-sans font-bold leading-normal"
                          >
                            <span className="w-2 h-2 rounded-full bg-[#25D366] animate-ping flex-shrink-0" />
                            <span>Monitoramento Inteligente de PIX Ativo... Esperando o sinal bancário cair.</span>
                          </motion.div>
                        ) : (
                          <div className="bg-neutral-900 border border-neutral-850 rounded-xl p-3.5 text-xs text-neutral-400 font-mono text-center">
                            Sistema pronto para validar pedidos. Entrada: WhatsApp.
                          </div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Quick System KPIs */}
                    <div className="border-t border-neutral-850 pt-3 flex justify-between items-center text-[10.5px] font-mono text-neutral-500">
                      <span>Fila de Pedidos: 0</span>
                      <span className="text-[#FF6B00] font-bold">Automação: 100% ativa</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Ambient watermark disclaimer label */}
              <div className="mt-5 pt-3.5 border-t border-neutral-850 flex justify-between items-center text-xs font-mono text-[#FF6B00]">
                <span>Fluxo 100% integrado ao painel real do ByLink</span>
                <span className="text-neutral-500 text-right">Sem taxas sobre seu faturamento</span>
              </div>
            </div>

          </div>

        </div>

        {/* Dynamic Interactive Call-To-Action Card banner below the showcase */}
        <div className="mt-14 p-6 bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 rounded-3xl text-white text-left relative overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[#FF6B00]/10 blur-3xl rounded-full pointer-events-none" />
          <div className="z-10 flex items-center gap-4">
            <div className="w-12 h-12 bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-2xl flex items-center justify-center text-[#FF6B00] flex-shrink-0">
              <Bot className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h4 className="text-sm font-black font-display text-white uppercase tracking-wider mb-1">
                Quer ver essa automação funcionando nos seus próprios produtos?
              </h4>
              <p className="text-[11px] text-neutral-400 leading-normal font-sans max-w-2xl">
                Suba o seu próprio cardápio simulado em menos de 1 minuto na nossa página de teste. Faça pedidos de teste, veja as notificações caindo instantaneamente e sinta o poder da nossa validação de faturamento Pix.
              </p>
            </div>
          </div>
          
          <a
            href="#simulador"
            className="px-5 h-11 bg-[#FF6B00] hover:bg-white text-white hover:text-neutral-900 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-2 flex-shrink-0 z-10"
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById("simulador-teaser");
              if (el) {
                el.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            Experimente Grátis
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

      </div>
    </div>
  );
}
