// Pedidos feitos neste aparelho (sem login). Guardamos só o id (UUID, não adivinhável)
// e um resumo; o status é sempre consultado na API pelo id.
// Substitui a antiga consulta "por telefone", que expunha o histórico de qualquer pessoa.
export interface LocalOrder {
  id: string
  slug: string
  orderNumber: number
  total: number
  createdAt: string
}

const KEY = 'my_orders'
const MAX = 30

export function saveLocalOrder(order: LocalOrder) {
  try {
    const list = getLocalOrders().filter((o) => o.id !== order.id)
    localStorage.setItem(KEY, JSON.stringify([order, ...list].slice(0, MAX)))
  } catch { /* storage indisponível: só não lista depois */ }
}

export function getLocalOrders(slug?: string): LocalOrder[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) ?? '[]') as LocalOrder[]
    return Array.isArray(list) ? list.filter((o) => !slug || o.slug === slug) : []
  } catch {
    return []
  }
}
