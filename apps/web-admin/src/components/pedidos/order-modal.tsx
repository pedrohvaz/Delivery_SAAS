'use client'

import { useState, useEffect } from 'react'
import { X, Bike, Home, MapPin, Phone, CreditCard, FileText, ChevronRight, UserCheck, Link, Check, Printer, MessageCircle } from 'lucide-react'
import {
  type Order,
  STATUS_CONFIG,
  getNextStatus,
  getAdvanceLabel,
  useUpdateOrderStatus,
  useUpdatePaymentStatus,
  relativeTime,
  whatsappLink,
} from '@/hooks/use-orders'
import { useDeliverymen, useAssignDeliveryman } from '@/hooks/use-deliverymen'
import { useAuthStore } from '@/store/auth'
import { currency } from '@/lib/utils'
import { CustomerReview } from './customer-review'
import { printOrder } from './order-ticket'

const CANCEL_REASONS = [
  'Produto indisponível',
  'Endereço fora da área de entrega',
  'Pagamento não confirmado',
  'Pedido duplicado',
  'Loja fechada no momento',
  'Cliente solicitou cancelamento',
  'Outro motivo',
]

interface Props {
  order: Order | null
  onClose: () => void
  initialCancelling?: boolean
}

export function OrderModal({ order, onClose, initialCancelling = false }: Props) {
  const updateStatus = useUpdateOrderStatus()
  const updatePayment = useUpdatePaymentStatus()
  const assignDeliveryman = useAssignDeliveryman()
  const { data: deliverymen = [] } = useDeliverymen()
  const { store } = useAuthStore()

  const [cancelling, setCancelling] = useState(initialCancelling)
  const [cancelReason, setCancelReason] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (!order) { setCancelling(false); setCancelReason(''); setLinkCopied(false) }
    else { setCancelling(initialCancelling) }
  }, [order, initialCancelling])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!order) return null

  const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['PENDING']!
  const nextStatus = getNextStatus(order.status, order.type)
  const advanceLabel = getAdvanceLabel(order.status, order.type)
  const isTerminal = !nextStatus
  const isCancelled = order.status === 'CANCELLED'

  async function handleAdvance() {
    if (!nextStatus || !order) return
    await updateStatus.mutateAsync({ id: order.id, status: nextStatus })
    onClose()
  }

  async function handleCancel() {
    if (!order || !cancelReason) return
    await updateStatus.mutateAsync({ id: order.id, status: 'CANCELLED', cancelReason })
    onClose()
  }

  async function handleCopyTrackLink() {
    if (!order || !store) return
    const storeOrigin = process.env.NEXT_PUBLIC_STORE_URL ?? window.location.origin
    const url = `${storeOrigin}/${store.slug}/pedido/${order.id}`
    await navigator.clipboard.writeText(url)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-lg">Pedido #{order.orderNumber}</h2>
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${status.color}`}>
              {status.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {whatsappLink(order.customer?.phone) && (
              <a href={whatsappLink(order.customer?.phone)!} target="_blank" rel="noopener noreferrer" title="Falar no WhatsApp"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-green-50 hover:text-green-600">
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
            <button onClick={() => store && printOrder(order, store.name)} title="Imprimir comanda"
              className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted">
              <Printer className="h-4 w-4" />
            </button>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Meta */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-muted/50 px-3 py-2.5">
              <p className="text-xs text-muted-foreground mb-0.5">Tipo</p>
              <p className="text-sm font-semibold flex items-center gap-1.5">
                {order.type === 'DELIVERY' ? <Bike className="h-3.5 w-3.5 text-primary" /> : <Home className="h-3.5 w-3.5 text-primary" />}
                {order.type === 'DELIVERY' ? 'Entrega' : order.type === 'TABLE' ? 'Mesa' : order.type === 'COUNTER' ? 'Balcão' : 'Retirada'}
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 px-3 py-2.5">
              <p className="text-xs text-muted-foreground mb-0.5">Recebido</p>
              <p className="text-sm font-semibold">{relativeTime(order.createdAt)} atrás</p>
            </div>
          </div>

          {/* Cliente */}
          <div className="rounded-xl border p-3 space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente</p>
            <p className="text-sm font-medium">{order.customer?.name ?? '—'}</p>
            {order.customer?.phone && (
              <a href={`tel:${order.customer.phone}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                <Phone className="h-3.5 w-3.5" />
                {order.customer.phone}
              </a>
            )}
          </div>

          {/* Avaliar cliente (privado) */}
          {order.customer && <CustomerReview orderId={order.id} />}

          {/* Endereço (só delivery) */}
          {order.type === 'DELIVERY' && order.address && (
            <div className="rounded-xl border p-3 space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" /> Endereço de entrega
              </p>
              <p className="text-sm">
                {order.address.street}, {order.address.number}
                {order.address.complement ? ` — ${order.address.complement}` : ''}
              </p>
              <p className="text-sm text-muted-foreground">
                {order.address.district}, {order.address.city}
              </p>
            </div>
          )}

          {/* Entregador (só delivery) */}
          {order.type === 'DELIVERY' && (
            <div className="rounded-xl border p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5" /> Entregador
              </p>
              <div className="flex items-center gap-2">
                <select
                  value={order.deliveryman?.id ?? ''}
                  onChange={(e) => assignDeliveryman.mutate({ orderId: order.id, deliverymanId: e.target.value || null })}
                  className="flex-1 h-9 rounded-lg border bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">— Não atribuído —</option>
                  {deliverymen.filter(d => d.isActive).map((d) => (
                    <option key={d.id} value={d.id}>{d.name}{d.vehicle ? ` (${d.vehicle})` : ''}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleCopyTrackLink}
                  title="Copiar link de rastreamento"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted transition shrink-0"
                >
                  {linkCopied ? <Check className="h-4 w-4 text-green-600" /> : <Link className="h-4 w-4" />}
                </button>
              </div>
              {assignDeliveryman.isPending && (
                <p className="text-xs text-muted-foreground">Salvando...</p>
              )}
            </div>
          )}

          {/* Itens */}
          <div className="rounded-xl border p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Itens do pedido</p>
            {order.items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm">
                <div>
                  <span className="font-medium">{item.quantity}x {item.name}</span>
                  {item.addons.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {item.addons.map((a) => a.optionName).join(', ')}
                    </p>
                  )}
                  {item.notes && <p className="text-xs text-muted-foreground italic">{item.notes}</p>}
                </div>
                <span className="shrink-0 font-medium">
                  {currency((item.price + item.addons.reduce((s, a) => s + a.price, 0)) * item.quantity)}
                </span>
              </div>
            ))}
            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Subtotal</span><span>{currency(order.subtotal)}</span>
              </div>
              {order.deliveryFee > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Entrega</span><span>{currency(order.deliveryFee)}</span>
                </div>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-xs text-green-600">
                  <span>Desconto</span><span>-{currency(order.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-0.5">
                <span>Total</span><span className="text-primary">{currency(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Pagamento */}
          {order.paymentMethod && (
            <div className="rounded-xl border p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm capitalize">{order.paymentMethod.replace(/_/g, ' ').toLowerCase()}</span>
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium
                  ${order.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {order.paymentStatus === 'PAID' ? 'Pago' : 'Pendente'}
                </span>
              </div>
              {order.paymentMethod === 'CASH' && (
                <p className="text-xs text-muted-foreground pl-6">
                  {order.changeFor && Number(order.changeFor) > 0 ? (
                    <>💵 Troco para <strong className="text-foreground">{currency(order.changeFor)}</strong> · levar <strong className="text-amber-600">{currency(Number(order.changeFor) - order.total)}</strong> de troco</>
                  ) : (
                    'Não precisa de troco'
                  )}
                </p>
              )}
              {!isCancelled && (
                <button
                  onClick={() => updatePayment.mutate({ id: order.id, paymentStatus: order.paymentStatus === 'PAID' ? 'PENDING' : 'PAID' })}
                  disabled={updatePayment.isPending}
                  className={`w-full mt-1 rounded-lg border py-2 text-xs font-semibold transition disabled:opacity-50
                    ${order.paymentStatus === 'PAID' ? 'text-muted-foreground hover:bg-muted' : 'border-green-300 text-green-700 hover:bg-green-50'}`}
                >
                  {updatePayment.isPending ? 'Salvando...' : order.paymentStatus === 'PAID' ? 'Marcar como pendente' : '✓ Marcar como pago'}
                </button>
              )}
            </div>
          )}

          {/* Observações */}
          {order.notes && (
            <div className="rounded-xl border p-3 flex gap-2">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground italic">{order.notes}</p>
            </div>
          )}

          {/* Motivo cancelamento */}
          {isCancelled && order.cancelReason && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3">
              <p className="text-xs font-semibold text-red-600 mb-0.5">Motivo do cancelamento</p>
              <p className="text-sm text-red-700">{order.cancelReason}</p>
            </div>
          )}

          {/* Formulário de cancelamento */}
          {cancelling && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-2">
              <p className="text-sm font-semibold text-red-700">Motivo do cancelamento</p>
              <div className="space-y-1.5">
                {CANCEL_REASONS.map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setCancelReason(reason)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition
                      ${cancelReason === reason ? 'border-red-400 bg-red-100 text-red-700' : 'bg-white text-muted-foreground hover:border-red-300'}`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleCancel}
                  disabled={!cancelReason || updateStatus.isPending}
                  className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition"
                >
                  {updateStatus.isPending ? 'Cancelando...' : 'Confirmar cancelamento'}
                </button>
                <button
                  onClick={() => { setCancelling(false); setCancelReason('') }}
                  className="rounded-xl border px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:bg-muted transition"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer com ações */}
        {!isCancelled && !isTerminal && !cancelling && (
          <div className="border-t px-5 py-4 flex gap-2">
            {nextStatus && (
              <button
                onClick={handleAdvance}
                disabled={updateStatus.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition"
              >
                {advanceLabel}
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setCancelling(true)}
              className="rounded-xl border px-4 py-3 text-sm font-semibold text-destructive border-destructive/30 hover:bg-destructive/10 transition"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
