'use client'

import { useEffect, useRef, useState } from 'react'
import { ChefHat, Printer, Receipt, Settings2, X } from 'lucide-react'
import { cn } from '@delivery/ui'
import type { Order } from '@/hooks/use-orders'
import { usePrintSettings, type PrintSettings } from '@/lib/print-settings'
import { buildTicketHtml, usePrinter, useTicketStore } from './order-ticket'

/** Botão de imprimir com menu: vias configuradas, só completa, só cozinha, configurar. */
export function PrintMenu({ order, className, size = 'sm' }: { order: Order; className?: string; size?: 'sm' | 'md' }) {
  const print = usePrinter()
  const [open, setOpen] = useState(false)
  const [config, setConfig] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const item = 'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted'
  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setOpen((v) => !v)} title="Imprimir pedido" aria-label="Imprimir pedido" aria-expanded={open}
        className={cn('flex items-center justify-center border text-muted-foreground hover:bg-muted transition',
          size === 'sm' ? 'h-7 w-7 rounded-lg' : 'h-8 w-8 rounded-full border-transparent', className)}>
        <Printer className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-56 rounded-xl border bg-card p-1 shadow-lg">
          <button className={cn(item, 'font-semibold')} onClick={() => { print(order); setOpen(false) }}>
            <Printer className="h-4 w-4" /> Imprimir
          </button>
          <button className={item} onClick={() => { print(order, ['full']); setOpen(false) }}>
            <Receipt className="h-4 w-4" /> Só via completa
          </button>
          <button className={item} onClick={() => { print(order, ['kitchen']); setOpen(false) }}>
            <ChefHat className="h-4 w-4" /> Só via da cozinha
          </button>
          <div className="my-1 border-t" />
          <button className={cn(item, 'text-muted-foreground')} onClick={() => { setConfig(true); setOpen(false) }}>
            <Settings2 className="h-4 w-4" /> Configurar impressão
          </button>
        </div>
      )}
      {config && <PrintSettingsDialog sample={order} onClose={() => setConfig(false)} />}
    </div>
  )
}

const AUTO: { k: PrintSettings['auto']; t: string; d: string }[] = [
  { k: 'off', t: 'Desligada', d: 'Imprimo pelo botão' },
  { k: 'new', t: 'Quando chega', d: 'Imprime assim que o pedido entra' },
  { k: 'confirmed', t: 'Quando aceito', d: 'Imprime ao confirmar o pedido' },
]

/** Pedido de exemplo para a prévia e o teste quando ainda não há pedido na tela. */
export const DEMO_ORDER: Order = {
  id: 'exemplo', orderNumber: 123, type: 'DELIVERY', status: 'CONFIRMED', paymentStatus: 'PENDING', paymentMethod: 'CASH',
  changeFor: 100, subtotal: 62, deliveryFee: 6, discount: 0, total: 68, notes: 'Tocar a campainha', scheduledTo: null, cancelReason: null,
  createdAt: new Date().toISOString(),
  address: { street: 'Rua das Flores', number: '120', complement: 'Apto 201', district: 'Centro', city: 'Sua cidade', state: 'MG', reference: 'Ao lado da padaria' },
  customer: { name: 'Cliente Exemplo', phone: '(31) 99999-0000' },
  deliveryman: null,
  items: [
    { name: 'X-Tudo', quantity: 2, price: 21, notes: 'sem cebola', addons: [{ groupName: 'Adicionais', optionName: 'Bacon', price: 5 }] },
    { name: 'Coca-Cola Lata 350ml', quantity: 1, price: 7, notes: null, addons: [] },
  ],
}

/** Campos de configuração da impressão (usado na janela da tela Pedidos e em Configurações). */
export function PrintSettingsForm({ sample, inline = false }: { sample?: Order; inline?: boolean }) {
  const [s, save] = usePrintSettings()
  const print = usePrinter()
  const header = useTicketStore()
  const set = <K extends keyof PrintSettings>(k: K, v: PrintSettings[K]) => save({ ...s, [k]: v })
  const chip = (on: boolean) => cn('min-h-10 rounded-xl border px-3 text-sm', on ? 'border-primary bg-primary/10 font-semibold text-primary' : 'hover:bg-muted')
  const exemplo = sample ?? DEMO_ORDER

  return (
    <div className={cn('grid gap-5', inline ? 'lg:grid-cols-[1fr_auto]' : 'md:grid-cols-[1fr_auto]')}>
      <div className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Largura do papel</p>
            <div className="flex gap-2">
              <button className={chip(s.paper === '80')} onClick={() => set('paper', '80')}>80 mm (mais comum)</button>
              <button className={chip(s.paper === '58')} onClick={() => set('paper', '58')}>58 mm (mini)</button>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">O que imprimir</p>
            <label className="flex min-h-10 cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm">
              <input type="checkbox" checked={s.full} onChange={(e) => set('full', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" />
              <span><b>Via completa</b><br /><span className="text-xs text-muted-foreground">Cliente, endereço, itens com preço, total, pagamento e troco. Vai com o pedido.</span></span>
            </label>
            <label className="flex min-h-10 cursor-pointer items-start gap-2 rounded-xl border p-3 text-sm">
              <input type="checkbox" checked={s.kitchen} onChange={(e) => set('kitchen', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" />
              <span><b>Via da cozinha</b><br /><span className="text-xs text-muted-foreground">Só itens, adicionais e observações, letra grande e sem preços.</span></span>
            </label>
          </div>

          <div className="flex flex-wrap gap-4">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Cópias de cada via</p>
              <div className="flex gap-2">
                {[1, 2, 3].map((n) => <button key={n} className={chip(s.copies === n)} onClick={() => set('copies', n)}>{n}</button>)}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Tamanho da letra</p>
              <div className="flex gap-2">
                <button className={chip(!s.bigFont)} onClick={() => set('bigFont', false)}>Normal</button>
                <button className={chip(s.bigFont)} onClick={() => set('bigFont', true)}>Grande</button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Impressão automática</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {AUTO.map((a) => (
                <button key={a.k} onClick={() => set('auto', a.k)} className={cn(chip(s.auto === a.k), 'p-2 text-left')}>
                  <span className="block">{a.t}</span>
                  <span className="block text-[11px] font-normal text-muted-foreground">{a.d}</span>
                </button>
              ))}
            </div>
            {s.auto !== 'off' && (
              <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                Funciona com a tela <b>Pedidos</b> aberta neste computador. Para imprimir sem a janela de confirmação do navegador,
                abra o Chrome com a opção <b>--kiosk-printing</b> e deixe a impressora térmica como padrão.
              </p>
            )}
          </div>

          <button onClick={() => print(exemplo)}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Printer className="h-4 w-4" /> {sample ? `Imprimir teste com o pedido #${sample.orderNumber}` : 'Imprimir teste'}
          </button>
        </div>

        {/* Prévia */}
        <div className={inline ? 'hidden lg:block' : 'hidden md:block'}>
          <p className="mb-1 text-xs font-medium text-muted-foreground">Prévia{sample ? '' : ' (pedido de exemplo)'}</p>
          <iframe title="Prévia da comanda" srcDoc={buildTicketHtml(exemplo, header, s)}
            className="h-[70vh] max-h-[640px] rounded-xl border bg-white" style={{ width: s.paper === '58' ? 230 : 320 }} />
        </div>
    </div>
  )
}

/** Preferências de impressão deste computador, com prévia da comanda (janela). */
export function PrintSettingsDialog({ sample, onClose }: { sample?: Order; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Configurar impressão"
        className="max-h-[94vh] w-full max-w-3xl space-y-4 overflow-y-auto rounded-t-2xl bg-card p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold">Impressão de pedidos</h2>
            <p className="text-xs text-muted-foreground">Vale para este computador. Cada caixa ou cozinha pode ter a sua configuração.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
        </div>
        <PrintSettingsForm sample={sample} />
      </div>
    </div>
  )
}
