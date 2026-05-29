'use client'

import { MessageSquareCode, Smartphone, Coins, BarChart3, Receipt, Users } from "lucide-react";

export default function Features() {
  const list = [
    {
      title: "Automação no WhatsApp",
      description: "Esqueça pedidos bagunçados. Receba os pedidos já formatados, com valores calculados e dados do cliente direto no seu WhatsApp.",
      icon: MessageSquareCode,
      tag: "Mais Rápido",
    },
    {
      title: "Cardápio 100% Personalizado",
      description: "Crie categorias, adicione complementos, combos e gerencie a disponibilidade de pratos em tempo real através do celular.",
      icon: Smartphone,
    },
    {
      title: "Validação PIX Automática",
      description: "Valida instantaneamente o Pix gerado no fechamento da compra. Sem necessidade de conferir extratos no meio da correria.",
      icon: Coins,
      tag: "Mais Seguro",
    },
    {
      title: "Relatórios & CRM Integrado",
      description: "Saiba quais são seus melhores clientes, pratos mais vendidos, taxas de faturamento e históricos mensais com cliques simples.",
      icon: BarChart3,
    },
    {
      title: "PDV de Balcão e Expedição",
      description: "Gerencie a cozinha e os motoqueiros em uma tela limpa, atualize o status para o cliente e imprima vias de produção facilmente.",
      icon: Receipt,
    },
    {
      title: "Base de Clientes Própria",
      description: "Seus clientes são de fato seus! Tenha o contato de telefone de todo mundo e faça ações de cupom e fidelidade sem intermediários.",
      icon: Users,
    },
  ];

  return (
    <div id="funcionalidades" className="scroll-mt-20">
      <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs font-bold uppercase tracking-widest text-[#FF6B00] bg-[#FFF5F0] px-3.5 py-1.5 rounded-full inline-block border border-[#FF6B00]/10 font-mono">
          Gestão Descomplicada
        </span>
        <h2 className="text-3xl md:text-4xl font-extrabold font-display tracking-tight text-[#111111] mt-3">
          Tudo o que você precisa em uma única plataforma
        </h2>
        <p className="text-[#555555] text-sm mt-2">
          Do fechamento da conta à entrega final, otimizamos o seu tempo para você focar no que realmente importa: a qualidade da sua comida.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {list.map((item) => (
          <div
            key={item.title}
            className="group flex flex-col justify-between bg-white border border-[#E0E0E0] rounded-2xl p-5 hover:border-[#FF6B00] transition-all duration-300 shadow-sm"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#FFF5F0] hover:bg-[#FF6B00] text-[#FF6B00] hover:text-white flex items-center justify-center transition-colors">
                  <item.icon className="w-5 h-5 stroke-[2.3px]" />
                </div>
                {item.tag && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#FF6B00] bg-[#FFF5F0] border border-[#FF6B00]/10 px-2 py-0.5 rounded-md font-mono">
                    {item.tag}
                  </span>
                )}
              </div>

              <h3 className="font-extrabold font-display text-sm text-[#111111] mb-1.5 leading-tight group-hover:text-[#FF6B00] transition-colors">
                {item.title}
              </h3>
              <p className="text-[#555555] text-xs leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-neutral-400 group-hover:text-[#FF6B00] transition-all">
              <span className="text-[10px] font-bold uppercase tracking-wider font-mono">Entenda mais</span>
              <span className="text-xs transition-transform group-hover:translate-x-1">→</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
