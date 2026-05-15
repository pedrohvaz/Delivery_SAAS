'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  Bike, ShoppingBag, QrCode, MessageCircle, BarChart3, CreditCard, Tag, Gift,
  Star, Check, ArrowRight, Smartphone, Clock, Zap, Trophy, Users, ChevronDown,
  Sparkles, Rocket, ShieldCheck,
} from 'lucide-react'
import { usePlans } from '@/hooks/use-plans'

const FEATURES = [
  { icon: ShoppingBag, title: 'Cardápio Digital', desc: 'Vitrine online lindona, com fotos, complementos e categorias ilimitadas.', color: 'from-orange-400 to-pink-500' },
  { icon: Bike, title: 'Pedidos em Tempo Real', desc: 'Receba pedidos via WhatsApp, app e link próprio. Tudo em uma tela só.', color: 'from-purple-400 to-indigo-500' },
  { icon: QrCode, title: 'QR Code de Mesa', desc: 'Cliente escaneia, pede e paga sem garçom. Aumente o ticket médio.', color: 'from-pink-400 to-rose-500' },
  { icon: CreditCard, title: 'Pagamento Online', desc: 'PIX automático com Asaas e Mercado Pago. Receba antes mesmo de produzir.', color: 'from-green-400 to-emerald-500' },
  { icon: MessageCircle, title: 'WhatsApp Automático', desc: 'Cliente recebe atualização em cada etapa do pedido. Sem você levantar o dedo.', color: 'from-emerald-400 to-teal-500' },
  { icon: BarChart3, title: 'Relatórios Completos', desc: 'Saiba o que vende, quando vende e para quem. Decisões com dados, não achismos.', color: 'from-blue-400 to-cyan-500' },
  { icon: Tag, title: 'Cupons e Promoções', desc: 'Crie cupons percentuais, fixos ou frete grátis. Fidelize com cashback.', color: 'from-yellow-400 to-orange-500' },
  { icon: Gift, title: 'Programa de Fidelidade', desc: 'Cliente acumula pontos e troca por descontos. Quem come, volta.', color: 'from-violet-400 to-purple-500' },
  { icon: Trophy, title: 'Sorteios Integrados', desc: 'Sorteios entre clientes para bombar suas redes. Tudo automático.', color: 'from-amber-400 to-yellow-500' },
]

const STATS = [
  { value: '24/7', label: 'Disponível' },
  { value: '<5min', label: 'Para começar' },
  { value: '0%', label: 'Taxa por pedido' },
  { value: '∞', label: 'Pedidos por mês' },
]

// Planos vêm da API (/plans). Fallback abaixo só caso a API ainda não tenha planos cadastrados.
const FALLBACK_PLANS = [
  { slug: 'gratis', name: 'Grátis', tagline: 'Pra começar sem medo', monthlyPrice: 0,
    color: 'from-gray-400 to-gray-500', highlight: false, badge: null,
    features: ['Cardápio digital ilimitado', 'Até 50 pedidos por mês', '1 usuário', 'PIX manual', 'Relatórios básicos'] },
  { slug: 'pro', name: 'Pro', tagline: 'Pra quem quer crescer', monthlyPrice: 79,
    color: 'from-orange-500 to-pink-500', highlight: true, badge: 'MAIS POPULAR',
    features: ['Pedidos ilimitados', 'WhatsApp automatizado', 'PIX automático', 'Cupons + cashback', 'PDV completo', '5 usuários'] },
  { slug: 'elite', name: 'Elite', tagline: 'Pra dominar o mercado', monthlyPrice: 199,
    color: 'from-purple-500 to-indigo-600', highlight: false, badge: null,
    features: ['Tudo do Pro', 'Programa de fidelidade', 'Sorteios', 'QR Code mesas', 'IA atendente', 'Domínio próprio', 'Multi-lojas'] },
]

const FAQ = [
  {
    q: 'Preciso pagar comissão por pedido?',
    a: 'Não. Você paga apenas a mensalidade da plataforma. 100% das vendas são suas — diferente do iFood que cobra 12-30% de cada pedido.',
  },
  {
    q: 'Funciona para qualquer tipo de negócio?',
    a: 'Sim. Pizzarias, hamburguerias, açaís, doçarias, restaurantes, lanchonetes, mercados, farmácias — qualquer negócio que vende com delivery ou retirada.',
  },
  {
    q: 'Quanto tempo leva para começar?',
    a: 'Menos de 5 minutos. Você se cadastra, monta seu cardápio (pode importar pelo WhatsApp), configura áreas de entrega e já está vendendo.',
  },
  {
    q: 'Posso aceitar pagamento online?',
    a: 'Sim! Integramos com Asaas e Mercado Pago para PIX automático. O cliente paga e o dinheiro cai direto na sua conta.',
  },
  {
    q: 'E o WhatsApp funciona como?',
    a: 'Conectamos com a Evolution API para automatizar mensagens: pedido recebido, em produção, saiu pra entrega, entregue. Tudo sem você digitar nada.',
  },
  {
    q: 'Tem teste grátis?',
    a: 'Sim, primeira semana é grátis. Sem cartão de crédito. Se não gostar, é só não pagar.',
  },
]

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const { data: apiPlans } = usePlans()
  const plans = (apiPlans && apiPlans.length > 0 ? apiPlans : FALLBACK_PLANS) as Array<typeof FALLBACK_PLANS[number] & { stripePriceId?: string | null }>

  return (
    <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden">

      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white text-lg shadow-lg">🛵</div>
            <span className="font-black text-lg bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">DeliveryFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="#planos" className="text-sm font-semibold text-gray-700 hover:text-orange-500 transition hidden sm:block">Planos</a>
            <Link href="/login" className="text-sm font-semibold text-gray-700 hover:text-orange-500 transition hidden sm:block">Entrar</Link>
            <Link href="/register" className="rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-5 py-2.5 text-sm font-bold text-white hover:shadow-lg hover:shadow-orange-500/40 transition-all hover:-translate-y-0.5">
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="relative px-4 sm:px-6 pt-12 pb-24 sm:pt-20 sm:pb-32 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-orange-300/30 blur-3xl -z-10 animate-pulse" />
        <div className="absolute top-20 right-1/4 h-96 w-96 rounded-full bg-pink-300/30 blur-3xl -z-10 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/2 h-96 w-96 rounded-full bg-purple-300/20 blur-3xl -z-10" />

        <div className="mx-auto max-w-5xl text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/20 px-4 py-1.5 text-xs font-bold text-orange-600">
            <Sparkles className="h-3.5 w-3.5" />
            7 DIAS GRÁTIS · SEM CARTÃO DE CRÉDITO
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.05]">
            Seu delivery
            <br />
            <span className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">
              sem comissão
            </span>
            <br />
            por pedido.
          </h1>

          <p className="mx-auto max-w-2xl text-lg sm:text-xl text-gray-600 leading-relaxed">
            Cardápio digital, PDV, controle de mesas com QR Code, WhatsApp automático e relatórios.
            <strong className="text-gray-900"> Tudo num lugar só</strong>, e por menos do que o iFood te cobra em <strong className="text-gray-900">um único pedido</strong>.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link href="/register" className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 px-8 py-4 text-base font-bold text-white shadow-xl shadow-orange-500/30 hover:shadow-2xl hover:shadow-orange-500/40 transition-all hover:-translate-y-0.5">
              Começar grátis agora
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#features" className="inline-flex items-center justify-center gap-2 rounded-full bg-white border-2 border-gray-200 px-8 py-4 text-base font-bold text-gray-900 hover:border-orange-500 hover:text-orange-500 transition">
              Ver funcionalidades
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-12 max-w-3xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 hover:shadow-lg hover:-translate-y-1 transition-all">
                <div className="text-3xl sm:text-4xl font-black bg-gradient-to-br from-orange-500 to-pink-500 bg-clip-text text-transparent">{s.value}</div>
                <div className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wide">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARATIVO ── */}
      <section className="px-4 sm:px-6 py-20 bg-gradient-to-br from-gray-900 to-gray-800 text-white">
        <div className="mx-auto max-w-5xl space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-5xl font-black">
              Por que pagar <span className="text-red-400 line-through">12-30% de comissão</span>?
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              A diferença entre marketplaces e ter sua própria operação está no seu bolso.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            {/* iFood */}
            <div className="rounded-3xl bg-red-900/20 border border-red-500/30 p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center text-xl">📉</div>
                <h3 className="text-xl font-bold text-red-300">Marketplaces tradicionais</h3>
              </div>
              <ul className="space-y-3 text-gray-300">
                {['12% a 30% de comissão por pedido', 'Cliente é deles, não seu', 'Sem WhatsApp automático', 'Sem PDV nem caixa', 'Você compete com 50 lojas iguais', 'Anúncios pagos pra aparecer'].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <span className="text-red-400 mt-0.5">✕</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* DeliveryFlow */}
            <div className="rounded-3xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 border border-orange-500/40 p-8 space-y-4 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 blur-3xl opacity-30" />
              <div className="flex items-center gap-3 relative">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-xl">🚀</div>
                <h3 className="text-xl font-bold text-orange-300">DeliveryFlow</h3>
              </div>
              <ul className="space-y-3 text-gray-200 relative">
                {[
                  'Mensalidade fixa, sem % por pedido',
                  'Seus clientes, seu cadastro, seu CRM',
                  'WhatsApp 100% automatizado',
                  'PDV, caixa, fluxo financeiro completo',
                  'Sua marca, sua loja, sua identidade',
                  'Link próprio que você divulga onde quiser',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="px-4 sm:px-6 py-24">
        <div className="mx-auto max-w-7xl space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-4 py-1.5 text-xs font-bold text-orange-600">
              <Zap className="h-3.5 w-3.5" />
              TUDO QUE VOCÊ PRECISA
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Mais que um sistema.
              <br />
              <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                Uma operação completa.
              </span>
            </h2>
            <p className="text-lg text-gray-600">
              Cada funcionalidade pensada pra você vender mais, gastar menos e dormir tranquilo.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="group relative rounded-3xl bg-white border border-gray-100 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                <div className={`absolute -top-12 -right-12 h-24 w-24 rounded-full bg-gradient-to-br ${f.color} opacity-10 group-hover:opacity-20 blur-2xl transition-opacity`} />
                <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg`}>
                  <f.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── DEMO SECTION ── */}
      <section className="px-4 sm:px-6 py-24 bg-gradient-to-br from-orange-50 to-pink-50">
        <div className="mx-auto max-w-6xl grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-orange-200 px-4 py-1.5 text-xs font-bold text-orange-600">
              <Smartphone className="h-3.5 w-3.5" />
              TESTADO EM CELULAR E COMPUTADOR
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Funciona em qualquer
              <br />
              <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">tela, qualquer lugar.</span>
            </h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              Atenda pedidos do balcão, da cozinha, da entrega ou do escritório.
              Tudo sincronizado em tempo real entre todos os dispositivos.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Clock, t: 'Tempo real' },
                { icon: ShieldCheck, t: '100% seguro' },
                { icon: Rocket, t: 'Super rápido' },
                { icon: Users, t: 'Multi-usuário' },
              ].map(({ icon: Icon, t }) => (
                <div key={t} className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <Icon className="h-5 w-5 text-orange-500" /> {t}
                </div>
              ))}
            </div>
          </div>

          {/* Mock device */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-pink-500 rounded-3xl blur-2xl opacity-30" />
            <div className="relative rounded-3xl bg-gray-900 p-2 shadow-2xl">
              <div className="rounded-2xl bg-white aspect-[9/16] sm:aspect-[3/4] overflow-hidden p-4 space-y-3">
                <div className="h-2 w-16 mx-auto rounded-full bg-gray-300" />
                <div className="h-12 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">🛵 Sua Loja</div>
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-orange-300 to-pink-300" />
                    <div className="flex-1 space-y-1">
                      <div className="h-2.5 w-3/4 rounded-full bg-gray-300" />
                      <div className="h-2 w-1/2 rounded-full bg-gray-200" />
                    </div>
                    <div className="h-6 w-12 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center">R$ 29</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF / TESTIMONIAL ── */}
      <section className="px-4 sm:px-6 py-24">
        <div className="mx-auto max-w-4xl text-center space-y-12">
          <div className="space-y-4">
            <div className="flex justify-center gap-1">
              {[1,2,3,4,5].map((i) => <Star key={i} className="h-6 w-6 fill-yellow-400 text-yellow-400" />)}
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Lojistas que dormem
              <br />
              <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">tranquilos</span>
            </h2>
          </div>

          <blockquote className="text-xl sm:text-2xl font-medium text-gray-700 leading-relaxed">
            "Saí do iFood e em 2 meses já tinha pago o ano todo da plataforma só com o que eu economizei de comissão.
            Meu lucro <strong>dobrou</strong>."
          </blockquote>

          <div className="flex items-center justify-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-orange-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg">M</div>
            <div className="text-left">
              <div className="font-bold">Marcos Silva</div>
              <div className="text-sm text-gray-500">Pizzaria do Marcão · São Paulo</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="planos" className="px-4 sm:px-6 py-24">
        <div className="mx-auto max-w-7xl space-y-16">
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-4 py-1.5 text-xs font-bold text-orange-600">
              <Sparkles className="h-3.5 w-3.5" />
              ESCOLHA SEU PLANO
            </div>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
              Comece grátis.
              <br />
              <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                Cresça no seu ritmo.
              </span>
            </h2>
            <p className="text-lg text-gray-600">
              Sem fidelidade. Cancele quando quiser. Mude de plano a qualquer momento.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {plans.map((plan) => {
              const isFree = Number(plan.monthlyPrice) === 0
              const ctaText = isFree ? 'Começar grátis' : plan.highlight ? `Assinar ${plan.name}` : 'Escolher plano'
              return (
                <div
                  key={plan.slug}
                  className={`relative rounded-3xl p-8 flex flex-col transition-all duration-300 ${
                    plan.highlight
                      ? 'bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-2xl shadow-orange-500/30 scale-105 lg:scale-110 ring-4 ring-orange-500/20'
                      : 'bg-white border-2 border-gray-100 hover:border-orange-300 hover:-translate-y-1 hover:shadow-xl'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-yellow-400 px-4 py-1 text-xs font-black text-orange-900 shadow-lg">
                      ⚡ {plan.badge}
                    </div>
                  )}

                  <div className="space-y-2 mb-6">
                    <h3 className={`text-2xl font-black ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                      {plan.name}
                    </h3>
                    <p className={`text-sm ${plan.highlight ? 'text-white/80' : 'text-gray-500'}`}>
                      {plan.tagline}
                    </p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl font-bold ${plan.highlight ? 'text-white/80' : 'text-gray-500'}`}>R$</span>
                      <span className={`text-6xl font-black ${plan.highlight ? 'text-white' : 'text-gray-900'}`}>
                        {Number(plan.monthlyPrice).toFixed(0)}
                      </span>
                      <span className={`text-sm ${plan.highlight ? 'text-white/80' : 'text-gray-500'}`}>
                        {isFree ? 'pra sempre' : '/mês'}
                      </span>
                    </div>
                  </div>

                  <Link
                    href={`/register?plan=${plan.slug}`}
                    className={`block text-center rounded-2xl px-6 py-3.5 font-bold text-sm mb-6 transition-all ${
                      plan.highlight
                        ? 'bg-white text-orange-600 hover:shadow-lg hover:scale-105'
                        : 'bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg'
                    }`}
                  >
                    {ctaText}
                  </Link>

                  <ul className="space-y-3 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className={`flex items-start gap-2 text-sm ${plan.highlight ? 'text-white/95' : 'text-gray-700'}`}>
                        <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
                          plan.highlight ? 'bg-white/20' : 'bg-gradient-to-br ' + plan.color
                        }`}>
                          <Check className="h-3 w-3 text-white" />
                        </div>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>

          <p className="text-center text-sm text-gray-500">
            💳 Aceitamos cartão e PIX · 🔒 Pagamento 100% seguro · 🚀 Ative na hora
          </p>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-4 sm:px-6 py-24 bg-gray-50">
        <div className="mx-auto max-w-3xl space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight">Dúvidas? Aqui!</h2>
            <p className="text-lg text-gray-600">Tudo que você precisa saber antes de começar.</p>
          </div>

          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <button
                key={i}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full text-left rounded-2xl bg-white border border-gray-200 p-6 hover:border-orange-300 transition group"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-bold text-lg">{item.q}</span>
                  <ChevronDown className={`h-5 w-5 text-orange-500 shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </div>
                {openFaq === i && (
                  <p className="text-gray-600 mt-3 leading-relaxed">{item.a}</p>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="relative px-4 sm:px-6 py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 to-pink-500" />
        <div className="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-yellow-300/30 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-purple-500/30 blur-3xl" />

        <div className="relative mx-auto max-w-3xl text-center text-white space-y-8">
          <h2 className="text-4xl sm:text-6xl font-black tracking-tight">
            Pronto para parar de pagar
            <br />
            comissão pro iFood?
          </h2>
          <p className="text-xl text-white/90">
            Crie sua conta em menos de 5 minutos. Sem cartão de crédito. Sem letra miúda.
          </p>
          <Link href="/register" className="group inline-flex items-center justify-center gap-2 rounded-full bg-white text-orange-600 px-10 py-5 text-lg font-black hover:shadow-2xl hover:-translate-y-1 transition-all">
            Começar grátis agora
            <ArrowRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="text-sm text-white/70">
            ⚡ Mais de 1.000 lojistas já mudaram de vida
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="px-4 sm:px-6 py-12 bg-gray-900 text-gray-400">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-white">🛵</div>
            <span className="font-black text-white">DeliveryFlow</span>
          </div>
          <div className="flex gap-6 text-sm">
            <a href="#features" className="hover:text-white transition">Funcionalidades</a>
            <a href="#planos" className="hover:text-white transition">Planos</a>
            <Link href="/login" className="hover:text-white transition">Entrar</Link>
            <Link href="/register" className="hover:text-white transition">Cadastrar</Link>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} DeliveryFlow. Todos os direitos reservados.</p>
        </div>
        <div className="mx-auto max-w-6xl mt-6 pt-6 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-500">
            Produzido por{' '}
            <span className="font-semibold bg-gradient-to-r from-orange-400 to-pink-400 bg-clip-text text-transparent">
              Pedro Vaz
            </span>
          </p>
        </div>
      </footer>
    </div>
  )
}
