'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, UtensilsCrossed, MapPin, Clock, CreditCard, Zap, Store } from 'lucide-react'
import { cn } from '@delivery/ui'
import { useAuthStore } from '@/store/auth'

interface Step {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  href: string
  checkFn: (store: any) => boolean
}

const STEPS: Step[] = [
  {
    id: 'store-info',
    title: 'Dados da loja',
    description: 'Preencha nome, contato e endereço (CEP e cidade)',
    icon: <Store className="h-5 w-5" />,
    href: '/dashboard/configuracoes',
    checkFn: (s) => !!(s?.name && s?.phone),
  },
  {
    id: 'cardapio',
    title: 'Cardápio',
    description: 'Adicione categorias e produtos',
    icon: <UtensilsCrossed className="h-5 w-5" />,
    href: '/dashboard/cardapio',
    checkFn: () => false, // verificado via API
  },
  {
    id: 'delivery',
    title: 'Áreas de entrega',
    description: 'Configure bairros e taxas',
    icon: <MapPin className="h-5 w-5" />,
    href: '/dashboard/areas',
    checkFn: () => false,
  },
  {
    id: 'horarios',
    title: 'Horários',
    description: 'Defina quando sua loja funciona',
    icon: <Clock className="h-5 w-5" />,
    href: '/dashboard/horarios',
    checkFn: () => false,
  },
  {
    id: 'pagamentos',
    title: 'Formas de pagamento',
    description: 'Ative PIX, cartão ou dinheiro',
    icon: <CreditCard className="h-5 w-5" />,
    href: '/dashboard/configuracoes',
    checkFn: () => false,
  },
]

export function OnboardingWizard({ completedSteps }: { completedSteps: string[] }) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)

  const done = completedSteps.length
  const total = STEPS.length
  const pct = Math.round((done / total) * 100)

  if (dismissed || pct === 100) return null

  return (
    <div className="rounded-2xl border bg-gradient-to-br from-primary/5 to-primary/10 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Configure sua loja
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {done} de {total} etapas concluídas
          </p>
        </div>
        <button onClick={() => setDismissed(true)} className="text-xs text-muted-foreground hover:text-foreground">
          Fechar
        </button>
      </div>

      {/* Barra de progresso */}
      <div className="h-2 rounded-full bg-white/60 overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      {/* Etapas */}
      <div className="space-y-2">
        {STEPS.map((step) => {
          const isCompleted = completedSteps.includes(step.id)
          return (
            <button key={step.id} onClick={() => router.push(step.href)}
              className={cn(
                'w-full flex items-center gap-3 rounded-xl p-3 text-left transition-colors',
                isCompleted ? 'bg-white/40 opacity-60' : 'bg-white hover:bg-white/80 shadow-sm',
              )}>
              <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0',
                isCompleted ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary')}>
                {isCompleted ? <Check className="h-4 w-4" /> : step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium', isCompleted ? 'line-through text-muted-foreground' : 'text-foreground')}>
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
              {!isCompleted && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
