import type { FastifyInstance } from 'fastify'
import type { PromptMenuProduct } from '../ai-attendant.js'

export interface MenuAddonOption {
  groupId: string
  groupName: string
  optionId: string
  optionName: string
  price: number
}

export interface MenuProduct {
  id: string
  name: string
  price: number
  addonsById: Map<string, MenuAddonOption>
}

export interface MenuLookup {
  /** Categorias formatadas para o prompt do LLM (com IDs). */
  categories: { name: string; products: PromptMenuProduct[] }[]
  /** Lookup productId → produto, para revalidar o carrinho vindo do LLM. */
  productsById: Map<string, MenuProduct>
}

/**
 * Carrega o cardápio ativo da loja e monta tanto a representação para o prompt
 * quanto o índice de revalidação (preços/nomes vêm sempre daqui, nunca do LLM).
 */
export async function loadMenu(app: FastifyInstance, storeId: string): Promise<MenuLookup> {
  const cats = await app.prisma.category.findMany({
    where: { storeId, isActive: true },
    orderBy: { position: 'asc' },
    include: {
      products: {
        where: { isActive: true },
        orderBy: { position: 'asc' },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          tags: true,
          addonGroups: {
            orderBy: { position: 'asc' },
            include: { options: { where: { isActive: true }, orderBy: { position: 'asc' } } },
          },
        },
      },
    },
  })

  const productsById = new Map<string, MenuProduct>()

  const categories = cats.map((cat) => ({
    name: cat.name,
    products: cat.products.map((p): PromptMenuProduct => {
      const addonsById = new Map<string, MenuAddonOption>()
      for (const g of p.addonGroups) {
        for (const o of g.options) {
          addonsById.set(o.id, {
            groupId: g.id,
            groupName: g.name,
            optionId: o.id,
            optionName: o.name,
            price: Number(o.price),
          })
        }
      }
      productsById.set(p.id, { id: p.id, name: p.name, price: Number(p.price), addonsById })

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        price: Number(p.price),
        tags: p.tags,
        addonGroups: p.addonGroups.map((g) => ({
          name: g.name,
          required: g.required,
          options: g.options.map((o) => ({ id: o.id, name: o.name, price: Number(o.price) })),
        })),
      }
    }),
  }))

  return { categories, productsById }
}
