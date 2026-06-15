'use client'

import { useState, useMemo } from 'react'
import { useAuthStore } from '@/store/auth'
import { useCategories, useProducts, useAddonGroups, type Product, type AddonGroup, type AddonOption } from '@/hooks/use-cardapio'
import { useSettings } from '@/hooks/use-settings'
import { useTables } from '@/hooks/use-tables'
import { useCurrentCashRegister, useOpenCashRegister, useCloseCashRegister, useAddCashTransaction } from '@/hooks/use-cash-register'
import { api } from '@/lib/api'
import { Header } from '@/components/layout/header'
import {
  Search, Plus, Minus, Trash2, ShoppingCart, X, Check,
  ChefHat, Package, Grid3X3, Receipt, Lock, Unlock,
  ArrowDownCircle, ArrowUpCircle, DollarSign,
} from 'lucide-react'
import { cn } from '@delivery/ui'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ─── Types ─────────────────────────────────────────────────────────────────

interface CartAddon {
  groupId: string
  groupName: string
  optionId: string
  optionName: string
  price: number
}

interface CartItem {
  cartId: string
  productId: string
  name: string
  price: number
  qty: number
  notes: string
  addons: CartAddon[]
}

interface AddonSelection {
  [groupId: string]: CartAddon[]
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function itemTotal(item: CartItem) {
  const addonsTotal = item.addons.reduce((s, a) => s + Number(a.price), 0)
  return (Number(item.price) + addonsTotal) * item.qty
}

function cartId() {
  return `ci_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
}

const ORDER_TYPES = [
  { value: 'COUNTER', label: 'Balcão',   icon: Receipt },
  { value: 'PICKUP',  label: 'Retirada', icon: Package },
  { value: 'TABLE',   label: 'Mesa',     icon: Grid3X3 },
]

// ─── Addon Modal ────────────────────────────────────────────────────────────

function AddonModal({
  product,
  onConfirm,
  onClose,
}: {
  product: Product
  onConfirm: (item: Omit<CartItem, 'cartId'>) => void
  onClose: () => void
}) {
  const { data: groups = [] } = useAddonGroups(product.id)
  const [selections, setSelections] = useState<AddonSelection>({})
  const [qty, setQty] = useState(1)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  function toggleOption(group: AddonGroup, option: AddonOption) {
    setSelections((prev) => {
      const current = prev[group.id] ?? []
      const exists = current.find((a) => a.optionId === option.id)

      if (group.max === 1) {
        return { ...prev, [group.id]: exists ? [] : [{ groupId: group.id, groupName: group.name, optionId: option.id, optionName: option.name, price: Number(option.price) }] }
      }

      if (exists) {
        return { ...prev, [group.id]: current.filter((a) => a.optionId !== option.id) }
      }
      if (current.length >= group.max) return prev
      return { ...prev, [group.id]: [...current, { groupId: group.id, groupName: group.name, optionId: option.id, optionName: option.name, price: Number(option.price) }] }
    })
  }

  function handleConfirm() {
    for (const group of groups) {
      const sel = selections[group.id] ?? []
      if (group.required && sel.length < group.min) {
        setError(`Selecione pelo menos ${group.min} opção em "${group.name}"`)
        return
      }
    }
    const allAddons = Object.values(selections).flat()
    onConfirm({ productId: product.id, name: product.name, price: Number(product.price), qty, notes, addons: allAddons })
    onClose()
  }

  const extraTotal = Object.values(selections).flat().reduce((s, a) => s + Number(a.price), 0)
  const unitPrice = Number(product.price) + extraTotal

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-semibold text-foreground">{product.name}</h2>
            <p className="text-sm text-muted-foreground">
              R$ {Number(product.price).toFixed(2).replace('.', ',')}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Addons */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {groups.map((group) => {
            const sel = selections[group.id] ?? []
            return (
              <div key={group.id}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground">{group.name}</p>
                  <span className="text-xs text-muted-foreground">
                    {group.required ? `Obrigatório · ` : ''}
                    {group.max === 1 ? 'Escolha 1' : `Até ${group.max}`}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {group.options.filter((o) => o.isActive).map((option) => {
                    const checked = sel.some((a) => a.optionId === option.id)
                    return (
                      <button
                        key={option.id}
                        onClick={() => toggleOption(group, option)}
                        className={cn(
                          'w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm transition-colors',
                          checked ? 'border-primary bg-primary/5 text-foreground' : 'border-border hover:bg-accent',
                        )}
                      >
                        <span>{option.name}</span>
                        <div className="flex items-center gap-2">
                          {Number(option.price) > 0 && (
                            <span className="text-muted-foreground">+R$ {Number(option.price).toFixed(2).replace('.', ',')}</span>
                          )}
                          <div className={cn('h-4 w-4 rounded-full border-2 flex items-center justify-center', checked ? 'border-primary bg-primary' : 'border-muted-foreground')}>
                            {checked && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Notas */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-1.5">Observação</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: sem cebola, bem passado..."
              rows={2}
              className="w-full rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t space-y-3">
          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex items-center justify-between">
            {/* Qty */}
            <div className="flex items-center gap-2">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-accent">
                <Minus className="h-3 w-3" />
              </button>
              <span className="w-6 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty((q) => q + 1)}
                className="h-8 w-8 rounded-full border flex items-center justify-center hover:bg-accent">
                <Plus className="h-3 w-3" />
              </button>
            </div>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              Adicionar · R$ {(unitPrice * qty).toFixed(2).replace('.', ',')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tela de Caixa Fechado ──────────────────────────────────────────────────

function CaixaFechado() {
  const [balance, setBalance] = useState('')
  const [loading, setLoading] = useState(false)
  const open = useOpenCashRegister()

  async function handleOpen() {
    const val = parseFloat(balance.replace(',', '.'))
    if (isNaN(val) || val < 0) return
    setLoading(true)
    try {
      await open.mutateAsync(val)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Caixa / PDV" />
      <div className="flex flex-1 items-center justify-center bg-muted/30">
        <div className="bg-card border rounded-2xl shadow-sm p-8 w-full max-w-sm space-y-6 text-center">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-7 w-7 text-muted-foreground" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Caixa Fechado</h2>
            <p className="text-sm text-muted-foreground mt-1">Informe o valor em caixa para iniciar o turno</p>
          </div>
          <div className="space-y-1.5 text-left">
            <label className="text-sm font-medium text-foreground">Fundo de Caixa (R$)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="w-full h-11 rounded-xl border px-4 text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <button
            onClick={handleOpen}
            disabled={loading}
            className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Unlock className="h-4 w-4" />
            {loading ? 'Abrindo...' : 'Abrir Caixa'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Barra do Caixa ──────────────────────────────────────────────────────────

function CaixaBar({
  register,
  onClose,
  onTransaction,
}: {
  register: any
  onClose: () => void
  onTransaction: () => void
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-green-50 border-b border-green-200 text-sm">
      <div className="flex items-center gap-1.5 text-green-700 font-medium">
        <Unlock className="h-3.5 w-3.5" />
        Caixa aberto às {format(new Date(register.openedAt), "HH:mm", { locale: ptBR })}
      </div>
      <div className="h-4 w-px bg-green-200" />
      <span className="text-green-700">
        Pedidos: <b>{register.ordersCount ?? 0}</b>
      </span>
      <div className="h-4 w-px bg-green-200" />
      <span className="text-green-700">
        Receita: <b>R$ {Number(register.totalRevenue ?? 0).toFixed(2).replace('.', ',')}</b>
      </span>
      <div className="h-4 w-px bg-green-200" />
      <span className="text-green-700">
        Saldo esperado: <b>R$ {Number(register.expectedBalance ?? 0).toFixed(2).replace('.', ',')}</b>
      </span>
      <div className="flex-1" />
      <button
        onClick={onTransaction}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-green-300 text-green-700 text-xs font-medium hover:bg-green-50 transition"
      >
        <DollarSign className="h-3.5 w-3.5" /> Sangria / Suprimento
      </button>
      <button
        onClick={onClose}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium hover:bg-red-100 transition"
      >
        <Lock className="h-3.5 w-3.5" /> Fechar Caixa
      </button>
    </div>
  )
}

// ─── Modal Fechar Caixa ───────────────────────────────────────────────────────

function FecharCaixaModal({ register, onClose }: { register: any; onClose: () => void }) {
  const [closingBalance, setClosingBalance] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const closeRegister = useCloseCashRegister()

  const diff = closingBalance
    ? parseFloat(closingBalance.replace(',', '.')) - Number(register.expectedBalance ?? 0)
    : null

  async function handleClose() {
    const val = parseFloat(closingBalance.replace(',', '.'))
    if (isNaN(val) || val < 0) return
    setLoading(true)
    try {
      await closeRegister.mutateAsync({ id: register.id, closingBalance: val, notes })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Fechar Caixa</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        {/* Resumo */}
        <div className="bg-muted rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Fundo inicial</span><span className="font-medium">R$ {Number(register.openingBalance).toFixed(2).replace('.', ',')}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Vendas (dinheiro)</span><span className="font-medium text-green-600">+ R$ {Number(register.cashRevenue ?? 0).toFixed(2).replace('.', ',')}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Suprimentos</span><span className="font-medium text-green-600">+ R$ {Number(register.deposits ?? 0).toFixed(2).replace('.', ',')}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Sangrias</span><span className="font-medium text-red-600">- R$ {Number(register.withdrawals ?? 0).toFixed(2).replace('.', ',')}</span></div>
          <div className="border-t pt-2 flex justify-between font-semibold"><span>Saldo esperado</span><span>R$ {Number(register.expectedBalance ?? 0).toFixed(2).replace('.', ',')}</span></div>
          <div className="flex justify-between text-muted-foreground"><span>Total de pedidos</span><span>{register.ordersCount ?? 0} pedidos · R$ {Number(register.totalRevenue ?? 0).toFixed(2).replace('.', ',')}</span></div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Valor contado no caixa (R$)</label>
          <input
            type="number" min="0" step="0.01" placeholder="0,00"
            value={closingBalance} onChange={(e) => setClosingBalance(e.target.value)}
            className="w-full h-11 rounded-xl border px-4 text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {diff !== null && (
            <p className={cn('text-sm text-center font-medium', diff === 0 ? 'text-green-600' : diff > 0 ? 'text-blue-600' : 'text-red-600')}>
              {diff === 0 ? '✓ Caixa conferido' : diff > 0 ? `Sobra de R$ ${diff.toFixed(2).replace('.', ',')}` : `Falta de R$ ${Math.abs(diff).toFixed(2).replace('.', ',')}`}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Observações (opcional)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="w-full rounded-xl border px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>

        <button onClick={handleClose} disabled={loading || !closingBalance}
          className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50">
          {loading ? 'Fechando...' : 'Confirmar Fechamento'}
        </button>
      </div>
    </div>
  )
}

// ─── Modal Sangria / Suprimento ───────────────────────────────────────────────

function TransactionModal({ registerId, onClose }: { registerId: string; onClose: () => void }) {
  const [type, setType] = useState<'WITHDRAWAL' | 'DEPOSIT'>('WITHDRAWAL')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const add = useAddCashTransaction()

  async function handleSubmit() {
    const val = parseFloat(amount.replace(',', '.'))
    if (isNaN(val) || val <= 0 || !description.trim()) return
    setLoading(true)
    try {
      await add.mutateAsync({ registerId, type, amount: val, description })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card w-full max-w-sm rounded-2xl shadow-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Movimentação</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setType('WITHDRAWAL')}
            className={cn('flex items-center justify-center gap-2 h-10 rounded-xl border text-sm font-medium transition', type === 'WITHDRAWAL' ? 'bg-red-50 border-red-300 text-red-700' : 'hover:bg-muted')}>
            <ArrowDownCircle className="h-4 w-4" /> Sangria
          </button>
          <button onClick={() => setType('DEPOSIT')}
            className={cn('flex items-center justify-center gap-2 h-10 rounded-xl border text-sm font-medium transition', type === 'DEPOSIT' ? 'bg-green-50 border-green-300 text-green-700' : 'hover:bg-muted')}>
            <ArrowUpCircle className="h-4 w-4" /> Suprimento
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Valor (R$)</label>
          <input type="number" min="0.01" step="0.01" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full h-11 rounded-xl border px-4 text-lg font-semibold text-center focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">Descrição</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: pagamento fornecedor..."
            className="w-full h-10 rounded-xl border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>

        <button onClick={handleSubmit} disabled={loading || !amount || !description}
          className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition">
          {loading ? 'Registrando...' : 'Registrar'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function CaixaPage() {
  const { store } = useAuthStore()
  const { data: categories = [] } = useCategories()
  const { data: settings } = useSettings()
  const { data: tables = [] } = useTables()
  const { data: currentRegister, isLoading: registerLoading } = useCurrentCashRegister()
  const [showClose, setShowClose] = useState(false)
  const [showTransaction, setShowTransaction] = useState(false)

  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderType, setOrderType] = useState<'COUNTER' | 'PICKUP' | 'TABLE'>('COUNTER')
  const [tableId, setTableId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [extraPayments, setExtraPayments] = useState<{ method: string; amount: string }[]>([])
  const [notes, setNotes] = useState('')
  const [addonProduct, setAddonProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(false)
  const [successOrder, setSuccessOrder] = useState<{ number: number } | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const activeCatId = selectedCat ?? categories.find((c) => c.isActive)?.id ?? ''
  const { data: products = [] } = useProducts(activeCatId || undefined)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return products.filter(
      (p) => p.isActive && (!q || p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q)),
    )
  }, [products, search])

  const subtotal = cart.reduce((s, i) => s + itemTotal(i), 0)
  const paymentMethods = settings?.paymentMethods.filter((m) => m.isActive) ?? []

  function addToCart(product: Product, withAddons = false) {
    if ((product._count?.addonGroups ?? 0) > 0 || withAddons) {
      setAddonProduct(product)
      return
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id && i.addons.length === 0 && !i.notes)
      if (existing) {
        return prev.map((i) => i.cartId === existing.cartId ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { cartId: cartId(), productId: product.id, name: product.name, price: Number(product.price), qty: 1, notes: '', addons: [] }]
    })
  }

  function addFromModal(item: Omit<CartItem, 'cartId'>) {
    setCart((prev) => [...prev, { ...item, cartId: cartId() }])
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev.map((i) => i.cartId === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)
    )
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((i) => i.cartId !== id))
  }

  async function handleFinalize() {
    if (cart.length === 0) { setErrorMsg('Adicione pelo menos um item.'); return }
    if (!paymentMethod) { setErrorMsg('Selecione um método de pagamento.'); return }
    if (orderType === 'TABLE' && !tableId) { setErrorMsg('Selecione uma mesa.'); return }
    setErrorMsg('')
    setSuccessOrder(null)
    setLoading(true)
    try {
      const body: any = {
        storeSlug: store!.slug,
        type: orderType,
        items: cart.map((i) => ({
          productId: i.productId,
          name: i.name,
          price: i.price,
          quantity: i.qty,
          notes: i.notes || undefined,
          addons: i.addons,
        })),
        paymentMethod,
        notes: notes || undefined,
      }
      if (customerName) body.customerName = customerName
      if (customerPhone) body.customerPhone = customerPhone
      if (orderType === 'TABLE') body.tableId = tableId

      const { data } = await api.post('/orders', body)
      // Venda de balcão em dinheiro já é paga na hora → marca como paga (entra no Caixa).
      if (paymentMethod === 'CASH' && data.data?.id) {
        await api.patch(`/orders/${data.data.id}/payment-status`, { paymentStatus: 'PAID' }).catch(() => {})
      }
      setSuccessOrder({ number: data.data.orderNumber })
      setTimeout(() => setSuccessOrder(null), 4000)
      setCart([])
      setCustomerName('')
      setCustomerPhone('')
      setNotes('')
      setTableId('')
      setPaymentMethod('')
      setExtraPayments([])
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message ?? 'Erro ao criar pedido.')
    } finally {
      setLoading(false)
    }
  }

  if (registerLoading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header title="Caixa / PDV" />
        <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">Verificando caixa...</div>
      </div>
    )
  }

  if (!currentRegister) return <CaixaFechado />

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Caixa / PDV" />
      <CaixaBar register={currentRegister} onClose={() => setShowClose(true)} onTransaction={() => setShowTransaction(true)} />

      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT: Produtos ── */}
        <div className="flex flex-col flex-1 overflow-hidden border-r">
          {/* Search */}
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar produto..."
                className="w-full h-9 pl-9 pr-3 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 px-3 py-2 overflow-x-auto border-b scrollbar-hide">
            {categories.filter((c) => c.isActive).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap',
                  activeCatId === cat.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Products grid */}
          <div className="flex-1 overflow-y-auto p-3">
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
                <Package className="h-8 w-8 opacity-30" />
                <p className="text-sm">Nenhum produto encontrado</p>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {filtered.map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="group flex flex-col rounded-xl border bg-card hover:border-primary/50 hover:shadow-sm transition-all text-left overflow-hidden"
                >
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square bg-muted flex items-center justify-center">
                      <ChefHat className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <div className="p-2 space-y-0.5">
                    <p className="text-xs font-medium text-foreground leading-tight line-clamp-2">{product.name}</p>
                    <p className="text-xs font-semibold text-primary">
                      R$ {Number(product.price).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Carrinho ── */}
        <div className="w-80 xl:w-96 flex flex-col bg-card overflow-hidden">

          {/* Order type */}
          <div className="p-3 border-b">
            <div className="grid grid-cols-3 gap-1 bg-muted rounded-xl p-1">
              {ORDER_TYPES.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setOrderType(value as any)}
                  className={cn(
                    'flex flex-col items-center gap-0.5 py-2 rounded-lg text-xs font-medium transition-colors',
                    orderType === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-muted-foreground gap-2">
                <ShoppingCart className="h-8 w-8 opacity-30" />
                <p className="text-sm">Carrinho vazio</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.cartId} className="flex gap-2 rounded-xl border p-2.5 bg-background">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                    {item.addons.length > 0 && (
                      <p className="text-[10px] text-muted-foreground truncate">
                        {item.addons.map((a) => a.optionName).join(', ')}
                      </p>
                    )}
                    {item.notes && <p className="text-[10px] text-muted-foreground italic truncate">{item.notes}</p>}
                    <p className="text-xs font-semibold text-primary mt-0.5">
                      R$ {itemTotal(item).toFixed(2).replace('.', ',')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button onClick={() => removeItem(item.cartId)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-3 w-3" />
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.cartId, -1)} className="h-5 w-5 rounded border flex items-center justify-center hover:bg-muted">
                        <Minus className="h-2.5 w-2.5" />
                      </button>
                      <span className="text-xs w-4 text-center font-medium">{item.qty}</span>
                      <button onClick={() => updateQty(item.cartId, 1)} className="h-5 w-5 rounded border flex items-center justify-center hover:bg-muted">
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer form */}
          <div className="border-t p-3 space-y-2.5">
            {/* Mesa (se TABLE) */}
            {orderType === 'TABLE' && (
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="w-full h-9 rounded-xl border px-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">Selecionar mesa...</option>
                {tables.filter((t) => t.isActive).map((t) => (
                  <option key={t.id} value={t.id}>
                    Mesa {t.number}{t.label ? ` · ${t.label}` : ''}
                  </option>
                ))}
              </select>
            )}

            {/* Cliente */}
            <div className="grid grid-cols-2 gap-1.5">
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nome (opcional)"
                className="h-9 rounded-xl border px-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Telefone (opcional)"
                className="h-9 rounded-xl border px-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Pagamento principal */}
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full h-9 rounded-xl border px-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40">
              <option value="">Forma de pagamento principal...</option>
              {paymentMethods.map((m) => <option key={m.id} value={m.type}>{m.label}</option>)}
            </select>

            {/* Pagamentos adicionais (split) */}
            {extraPayments.map((ep, i) => (
              <div key={i} className="flex gap-1.5">
                <select value={ep.method} onChange={(e) => setExtraPayments(prev => prev.map((p, j) => j === i ? { ...p, method: e.target.value } : p))}
                  className="flex-1 h-9 rounded-xl border px-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">Forma...</option>
                  {paymentMethods.map((m) => <option key={m.id} value={m.type}>{m.label}</option>)}
                </select>
                <input type="number" placeholder="R$" value={ep.amount} onChange={(e) => setExtraPayments(prev => prev.map((p, j) => j === i ? { ...p, amount: e.target.value } : p))}
                  className="w-20 h-9 rounded-xl border px-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <button onClick={() => setExtraPayments(prev => prev.filter((_, j) => j !== i))}
                  className="h-9 w-9 flex items-center justify-center rounded-xl border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <button onClick={() => setExtraPayments(prev => [...prev, { method: '', amount: '' }])}
              className="w-full h-8 rounded-xl border border-dashed text-xs text-muted-foreground hover:text-foreground hover:border-primary/40 transition flex items-center justify-center gap-1">
              <Plus className="h-3.5 w-3.5" /> Dividir pagamento
            </button>

            {/* Obs do pedido */}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observação do pedido (opcional)"
              rows={2}
              className="w-full rounded-xl border px-2.5 py-2 text-sm resize-none bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
            />

            {/* Total */}
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="text-lg font-bold text-foreground">
                R$ {subtotal.toFixed(2).replace('.', ',')}
              </span>
            </div>

            {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}

            {successOrder && (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
                <Check className="h-4 w-4 shrink-0" />
                Pedido #{successOrder.number} criado!
              </div>
            )}

            <button
              onClick={handleFinalize}
              disabled={loading || cart.length === 0}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Criando pedido...' : `Finalizar Pedido · R$ ${subtotal.toFixed(2).replace('.', ',')}`}
            </button>
          </div>
        </div>
      </div>

      {/* Addon Modal */}
      {addonProduct && (
        <AddonModal product={addonProduct} onConfirm={addFromModal} onClose={() => setAddonProduct(null)} />
      )}

      {/* Fechar Caixa Modal */}
      {showClose && (
        <FecharCaixaModal register={currentRegister} onClose={() => setShowClose(false)} />
      )}

      {/* Sangria / Suprimento Modal */}
      {showTransaction && (
        <TransactionModal registerId={currentRegister.id} onClose={() => setShowTransaction(false)} />
      )}
    </div>
  )
}
