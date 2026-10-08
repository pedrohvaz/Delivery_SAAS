'use client'

import { Bike, ChefHat, MessageCircle, Receipt, Ticket } from 'lucide-react'

// Organizado por ONDE o dono da loja usa — só recursos que existem no sistema.
const GROUPS = [
  {
    where: 'No WhatsApp',
    icon: MessageCircle,
    items: [
      'Atendente automático que mostra o cardápio, entende "sem cebola" e monta o pedido',
      'Cliente recebe aviso quando o pedido sai e quando fica pronto',
      'Você liga, desliga e escreve o jeito de falar da sua loja',
    ],
  },
  {
    where: 'Na cozinha',
    icon: ChefHat,
    items: [
      'Tela de cozinha com as observações em destaque',
      'Comanda impressa com um toque',
      'Estoque que pausa sozinho o item que acabou',
    ],
  },
  {
    where: 'No salão e na rua',
    icon: Bike,
    items: [
      'Mesas com QR Code e chamada do garçom',
      'Taxa de entrega por bairro',
      'Entregadores e link de acompanhamento para o cliente',
    ],
  },
  {
    where: 'No caixa',
    icon: Receipt,
    items: [
      'Pix online pelo Asaas ou Mercado Pago, cartão e dinheiro com troco',
      'Caixa de balcão com abertura e fechamento',
      'Relatórios de vendas e produtos mais pedidos',
    ],
  },
  {
    where: 'Para vender de novo',
    icon: Ticket,
    items: [
      'Cupons de desconto e frete grátis',
      'Fidelidade com cashback e sorteios',
      'Lista de clientes com telefone e histórico',
    ],
  },
]

export default function Features() {
  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.015em] sm:text-5xl">
          O que vem no sistema.
        </h2>
        <p className="mt-5 max-w-sm leading-relaxed text-lp-muted">
          Feito para a rotina de quem atende no balcão, cozinha e ainda responde o WhatsApp — tudo no mesmo painel,
          no computador ou no celular.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-x-10 sm:grid-cols-2 lg:col-span-8">
        {GROUPS.map(({ where, icon: Icon, items }, i) => (
          <div
            key={where}
            className={`border-t border-lp-ink/80 py-6 ${i === 0 ? 'sm:col-span-2' : ''}`}
          >
            <h3 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-lp-brand">
              <Icon className="h-4 w-4" aria-hidden />
              {where}
            </h3>
            <ul className={`mt-4 space-y-3 ${i === 0 ? 'sm:grid sm:grid-cols-3 sm:gap-6 sm:space-y-0' : ''}`}>
              {items.map((t) => (
                <li key={t} className="leading-relaxed text-lp-ink/90">{t}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
