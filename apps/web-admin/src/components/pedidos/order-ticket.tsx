'use client'

import { formatBRL } from '@delivery/ui'
import type { Order } from '@/hooks/use-orders'
import { useAuthStore } from '@/store/auth'
import { useStoreInfo } from '@/hooks/use-settings'
import { getPrintSettings, type PrintSettings } from '@/lib/print-settings'

const money = (n: number) => formatBRL(Number(n) || 0)

const TYPE_LABEL: Record<Order['type'], string> = {
  DELIVERY: 'ENTREGA',
  PICKUP: 'RETIRADA',
  TABLE: 'MESA',
  COUNTER: 'BALCÃO',
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Dinheiro', PIX: 'Pix', CREDIT_CARD: 'Cartão de crédito', DEBIT_CARD: 'Cartão de débito', PICPAY: 'PicPay',
}

function esc(s: string): string {
  return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)
}

export interface TicketStore {
  name: string
  phone?: string | null
  address?: string | null
}

export type TicketKind = 'full' | 'kitchen'

const fmtDate = (iso: string, opts: Intl.DateTimeFormatOptions) => new Date(iso).toLocaleString('pt-BR', opts)

/** Uma via da comanda (HTML de uma página). */
function ticketBody(order: Order, store: TicketStore, kind: TicketKind): string {
  const kitchen = kind === 'kitchen'
  const tipo = order.type === 'TABLE' && order.table
    ? `MESA ${order.table.number}${order.table.label ? ` · ${esc(order.table.label)}` : ''}`
    : TYPE_LABEL[order.type]
  const agendado = order.scheduledTo
    ? `<div class="box big center">AGENDADO P/ ${fmtDate(order.scheduledTo, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>`
    : ''

  const itens = order.items.map((i) => {
    const addons = i.addons.length
      ? `<div class="sub">${i.addons.map((a) => `+ ${esc(a.optionName)}${!kitchen && Number(a.price) > 0 ? ` (${money(Number(a.price))})` : ''}`).join('<br/>')}</div>`
      : ''
    const obs = i.notes ? `<div class="sub obs">» ${esc(i.notes)}</div>` : ''
    // A API manda preços Decimal como texto ("40"): sem Number(), "40" + 5 vira "405"
    const lineTotal = (Number(i.price) + i.addons.reduce((s, a) => s + Number(a.price), 0)) * i.quantity
    return `<div class="item"><div class="item-row"><span class="qty">${i.quantity}x</span><span class="name">${esc(i.name)}</span>${kitchen ? '' : `<span class="price">${money(lineTotal)}</span>`}</div>${addons}${obs}</div>`
  }).join('')

  const obsPedido = order.notes ? `<div class="box"><b>OBS DO PEDIDO:</b> ${esc(order.notes)}</div>` : ''

  if (kitchen) {
    return `<section class="ticket kitchen">
      <div class="center"><div class="tag">COZINHA</div><div class="num">#${order.orderNumber}</div><div class="type">${tipo}</div>
      <div class="meta">${fmtDate(order.createdAt, { dateStyle: 'short', timeStyle: 'short' })}${order.customer?.name ? ` · ${esc(order.customer.name)}` : ''}</div></div>
      ${agendado}<hr/>${itens}${obsPedido ? `<hr/>${obsPedido}` : ''}<hr/>
      <div class="center meta">${order.items.reduce((s, i) => s + i.quantity, 0)} item(ns)</div>
    </section>`
  }

  const addr = order.type === 'DELIVERY' && order.address
    ? `<div class="box"><b>ENDEREÇO DE ENTREGA</b><br/>${esc(order.address.street)}, ${esc(order.address.number)}${order.address.complement ? ' - ' + esc(order.address.complement) : ''}<br/>${esc(order.address.district)} · ${esc(order.address.city)}${order.address.reference ? `<br/>Ref.: ${esc(order.address.reference)}` : ''}</div>`
    : ''

  const pago = order.paymentStatus === 'PAID'
  const pagamento = order.paymentMethod
    ? `<div class="row"><span>Pagamento</span><span>${esc(PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod.replace(/_/g, ' '))}</span></div>` +
      (order.paymentMethod === 'CASH' && order.changeFor && Number(order.changeFor) > 0
        ? `<div class="row"><span>Troco para</span><span>${money(Number(order.changeFor))}</span></div><div class="row b"><span>Levar de troco</span><span>${money(Number(order.changeFor) - Number(order.total))}</span></div>`
        : '')
    : ''

  return `<section class="ticket">
    <div class="center">
      <div class="store">${esc(store.name)}</div>
      ${store.phone ? `<div class="meta">${esc(store.phone)}</div>` : ''}
      ${store.address ? `<div class="meta">${esc(store.address)}</div>` : ''}
      <div class="num">PEDIDO #${order.orderNumber}</div>
      <div class="type">${tipo}</div>
      <div class="meta">${fmtDate(order.createdAt, { dateStyle: 'short', timeStyle: 'short' })}</div>
    </div>
    ${agendado}<hr/>
    <div class="meta"><b>Cliente:</b> ${esc(order.customer?.name ?? '—')}${order.customer?.phone ? `<br/><b>Tel:</b> ${esc(order.customer.phone)}` : ''}${order.deliveryman ? `<br/><b>Entregador:</b> ${esc(order.deliveryman.name)}` : ''}</div>
    ${addr}<hr/>${itens}<hr/>
    <div class="row"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
    ${Number(order.deliveryFee) > 0 ? `<div class="row"><span>Taxa de entrega</span><span>${money(order.deliveryFee)}</span></div>` : ''}
    ${Number(order.discount) > 0 ? `<div class="row"><span>Desconto</span><span>-${money(order.discount)}</span></div>` : ''}
    <div class="total"><span>TOTAL</span><span>${money(order.total)}</span></div>
    ${pagamento}
    <div class="paid ${pago ? '' : 'due'}">${pago ? 'PAGO' : 'A RECEBER'}</div>
    ${obsPedido}<hr/>
    <div class="center meta">Obrigado pela preferência!<br/>Pedido feito pelo ByLink</div>
  </section>`
}

/** Documento completo com as vias pedidas, uma por página (corte entre elas). */
export function buildTicketHtml(order: Order, store: TicketStore, s: PrintSettings, kinds?: TicketKind[]): string {
  const vias: TicketKind[] = kinds ?? [...(s.full ? ['full' as const] : []), ...(s.kitchen ? ['kitchen' as const] : [])]
  const lista = (vias.length ? vias : ['full' as const]).flatMap((k) => Array.from({ length: Math.max(1, Math.min(5, s.copies)) }, () => k))
  const w = s.paper === '58' ? 48 : 72 // área útil em mm
  const base = (s.paper === '58' ? 11 : 12) + (s.bigFont ? 2 : 0)

  return `<!doctype html><html><head><meta charset="utf-8"><title>Pedido #${order.orderNumber}</title>
<style>
  @page { size: ${s.paper}mm auto; margin: 2mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: 'Courier New', ui-monospace, monospace; color: #000; font-size: ${base}px; line-height: 1.25; }
  .ticket { width: ${w}mm; margin: 0 auto; page-break-after: always; break-after: page; }
  .ticket:last-child { page-break-after: auto; break-after: auto; }
  .center { text-align: center; }
  .store { font-size: ${base + 4}px; font-weight: bold; }
  .num { font-size: ${base + 12}px; font-weight: bold; margin: 3px 0; }
  .type { font-size: ${base + 3}px; font-weight: bold; border: 2px solid #000; display: inline-block; padding: 1px 8px; border-radius: 4px; }
  .tag { display: inline-block; background: #000; color: #fff; padding: 1px 8px; font-weight: bold; }
  hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  .meta { font-size: ${base - 1}px; }
  .item { margin: 4px 0; }
  .item-row { display: flex; justify-content: space-between; gap: 6px; font-weight: bold; font-size: ${base + 2}px; }
  .item-row .name { flex: 1; }
  .item-row .qty { min-width: 2.2em; }
  .sub { margin-left: 2.2em; font-size: ${base}px; }
  .obs { font-weight: bold; }
  .row { display: flex; justify-content: space-between; }
  .row.b { font-weight: bold; }
  .total { display: flex; justify-content: space-between; font-size: ${base + 5}px; font-weight: bold; margin: 3px 0; }
  .box { border: 1px solid #000; padding: 4px; margin: 5px 0; }
  .big { font-size: ${base + 3}px; font-weight: bold; }
  .paid { text-align: center; font-weight: bold; font-size: ${base + 3}px; border: 2px solid #000; margin: 5px 0; padding: 2px; }
  .paid.due { border-style: dashed; }
  .kitchen .item-row { font-size: ${base + 6}px; }
  .kitchen .sub { font-size: ${base + 3}px; }
</style></head><body>${lista.map((k) => ticketBody(order, store, k)).join('')}</body></html>`
}

/**
 * Imprime numa moldura invisível dentro da própria página: o navegador não bloqueia
 * (janela pop-up era barrada) e funciona também na impressão automática.
 */
export function printHtml(html: string) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
  document.body.appendChild(frame)
  const doc = frame.contentWindow!.document
  doc.open()
  doc.write(html)
  doc.close()
  const go = () => {
    try { frame.contentWindow!.focus(); frame.contentWindow!.print() } finally {
      setTimeout(() => frame.remove(), 60_000)
    }
  }
  // Espera fontes/layout antes de imprimir
  setTimeout(go, 250)
}

/** Imprime as vias do pedido conforme as preferências deste computador. */
export function printOrder(order: Order, store: TicketStore, kinds?: TicketKind[]) {
  printHtml(buildTicketHtml(order, store, getPrintSettings(), kinds))
}

/** Dados da loja para o cabeçalho da comanda. */
export function useTicketStore(): TicketStore {
  const store = useAuthStore((s) => s.store)
  const { data: settings } = useStoreInfo()
  return {
    name: settings?.name ?? store?.name ?? 'Pedido',
    phone: settings?.whatsapp || settings?.phone || null,
    address: settings?.address ? [`${settings.address}${settings.number ? `, ${settings.number}` : ''}`, settings.district].filter(Boolean).join(' · ') : null,
  }
}

/** Função pronta para imprimir um pedido com o cabeçalho da loja. */
export function usePrinter() {
  const header = useTicketStore()
  return (order: Order, kinds?: TicketKind[]) => printOrder(order, header, kinds)
}
