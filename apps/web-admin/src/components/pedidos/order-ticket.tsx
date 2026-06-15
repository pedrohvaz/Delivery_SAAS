import type { Order } from '@/hooks/use-orders'

const money = (n: number) => `R$ ${Number(n).toFixed(2).replace('.', ',')}`

const TYPE_LABEL: Record<Order['type'], string> = {
  DELIVERY: 'ENTREGA',
  PICKUP: 'RETIRADA',
  TABLE: 'MESA',
  COUNTER: 'BALCÃO',
}

function esc(s: string): string {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] ?? c)
}

function buildTicketHtml(order: Order, storeName: string): string {
  const dt = new Date(order.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

  const itemsHtml = order.items
    .map((i) => {
      const addons = i.addons.length ? `<div class="sub">+ ${esc(i.addons.map((a) => a.optionName).join(', '))}</div>` : ''
      const notes = i.notes ? `<div class="sub">obs: ${esc(i.notes)}</div>` : ''
      const lineTotal = (i.price + i.addons.reduce((s, a) => s + a.price, 0)) * i.quantity
      return `<div class="item"><div class="item-row"><span class="qty">${i.quantity}x</span><span class="name">${esc(i.name)}</span><span class="price">${money(lineTotal)}</span></div>${addons}${notes}</div>`
    })
    .join('')

  const addr =
    order.type === 'DELIVERY' && order.address
      ? `<div class="box"><b>ENTREGA</b><br/>${esc(order.address.street)}, ${esc(order.address.number)}${order.address.complement ? ' - ' + esc(order.address.complement) : ''}<br/>${esc(order.address.district)}, ${esc(order.address.city)}</div>`
      : ''

  const payment = order.paymentMethod
    ? `<div class="row"><span>Pagamento</span><span>${esc(order.paymentMethod.replace(/_/g, ' '))}</span></div>` +
      (order.paymentMethod === 'CASH' && order.changeFor && Number(order.changeFor) > 0
        ? `<div class="row"><span>Troco p/</span><span>${money(Number(order.changeFor))}</span></div>`
        : '')
    : ''

  const notes = order.notes ? `<div class="box"><b>OBS:</b> ${esc(order.notes)}</div>` : ''

  return `<!doctype html><html><head><meta charset="utf-8"><title>Pedido #${order.orderNumber}</title>
<style>
  @page { margin: 4mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; width: 76mm; margin: 0 auto; color: #000; }
  .center { text-align: center; }
  .store { font-size: 15px; font-weight: bold; }
  .num { font-size: 22px; font-weight: bold; margin: 4px 0; }
  .type { font-size: 14px; font-weight: bold; border: 2px solid #000; display: inline-block; padding: 1px 8px; border-radius: 4px; }
  hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
  .meta { font-size: 12px; }
  .item { margin: 5px 0; }
  .item-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: bold; gap: 6px; }
  .item-row .name { flex: 1; }
  .item-row .qty { min-width: 26px; }
  .sub { font-size: 12px; margin-left: 26px; font-weight: normal; }
  .row { display: flex; justify-content: space-between; font-size: 12px; }
  .total { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; margin-top: 4px; }
  .box { border: 1px solid #000; padding: 5px; margin: 6px 0; font-size: 13px; }
</style></head><body>
  <div class="center">
    <div class="store">${esc(storeName)}</div>
    <div class="num">PEDIDO #${order.orderNumber}</div>
    <div class="type">${TYPE_LABEL[order.type]}</div>
    <div class="meta">${dt}</div>
  </div>
  <hr/>
  <div class="meta"><b>Cliente:</b> ${esc(order.customer?.name ?? '—')}${order.customer?.phone ? `<br/><b>Tel:</b> ${esc(order.customer.phone)}` : ''}</div>
  ${addr}
  <hr/>
  ${itemsHtml}
  <hr/>
  <div class="row"><span>Subtotal</span><span>${money(order.subtotal)}</span></div>
  ${order.deliveryFee > 0 ? `<div class="row"><span>Entrega</span><span>${money(order.deliveryFee)}</span></div>` : ''}
  ${order.discount > 0 ? `<div class="row"><span>Desconto</span><span>-${money(order.discount)}</span></div>` : ''}
  <div class="total"><span>TOTAL</span><span>${money(order.total)}</span></div>
  ${payment}
  ${notes}
  <hr/>
  <div class="center meta">ByLink Delivery</div>
</body></html>`
}

/** Abre uma janela de impressão com a comanda do pedido. */
export function printOrder(order: Order, storeName: string): void {
  const w = window.open('', '_blank', 'width=380,height=640')
  if (!w) return
  w.document.write(buildTicketHtml(order, storeName))
  w.document.close()
  w.focus()
  setTimeout(() => {
    w.print()
    w.close()
  }, 300)
}
