import { PrismaClient } from '@delivery/database'

const prisma = new PrismaClient()

const STORE_SLUG = 'vide-gula'

// Adicionais que se aplicam a todos os lanches
const ADICIONAIS = [
  { name: 'Ovo', price: 2.0 },
  { name: 'Abacaxi', price: 4.0 },
  { name: 'Bacon', price: 5.0 },
  { name: 'Cheddar', price: 5.0 },
  { name: 'Catupiry', price: 5.0 },
  { name: 'Bife de frango', price: 5.0 },
  { name: 'Bife de boi', price: 5.0 },
  { name: 'Frango desfiado', price: 5.0 },
  { name: 'Bife de picanha', price: 9.0 },
]

const LANCHES: Array<{ name: string; price: number; description: string }> = [
  { name: 'Misto', price: 14.5, description: 'Pão de forma, queijo, presunto, milho e batata' },
  { name: 'Misto Especial', price: 16.5, description: 'Pão de forma, 2 queijos, 2 presuntos, milho e batata' },
  { name: 'Hambúrguer', price: 15.0, description: 'Pão, hambúrguer de boi, alface, tomate, milho e batata palha' },
  { name: 'X-burguer', price: 20.0, description: 'Pão, hambúrguer de boi, queijo, alface, tomate, milho e batata palha' },
  { name: 'Hambúrguer Catupiry', price: 20.0, description: 'Pão, hambúrguer de boi, catupiry, alface, tomate, milho e batata palha' },
  { name: 'Framburguer Catupiry', price: 20.0, description: 'Pão, hambúrguer de frango, catupiry, alface, tomate, milho e batata palha' },
  { name: 'Gulinha', price: 25.0, description: 'Pão, hambúrguer de boi, ovo, queijo, presunto, alface, tomate, milho' },
  { name: 'X-Egg-Burguer', price: 25.0, description: 'Pão, hambúrguer de boi, ovo, queijo, presunto, alface, tomate, milho e batata palha' },
  { name: 'X-bacon', price: 25.0, description: 'Pão, hambúrguer de boi, queijo, presunto, bacon, alface, tomate, milho e batata palha' },
  { name: 'Vegetariano', price: 25.0, description: 'Pão, abacaxi, queijo, ovo, alface, tomate, milho e batata palha' },
  { name: 'Framburguer', price: 25.0, description: 'Pão, hambúrguer de frango, ovo, queijo, alface, tomate, milho e batata palha' },
  { name: 'Frango Catupiry', price: 25.0, description: 'Pão, frango desfiado, catupiry, alface, tomate, milho e batata palha' },
  { name: 'Frango Chedar', price: 25.0, description: 'Pão, frango desfiado, cheddar, alface, tomate, milho e batata palha' },
  { name: 'Vide Gula Light', price: 25.0, description: 'Pão, frango desfiado, queijo, alface, tomate, milho e abacaxi' },
  { name: 'Tropical', price: 25.0, description: 'Pão, hambúrguer de boi, abacaxi, presunto, queijo, alface, tomate, milho e batata palha' },
  { name: 'X-Egg-Bacon', price: 27.5, description: 'Pão, hambúrguer de boi, ovo, queijo, presunto, bacon, alface, tomate, milho e batata palha' },
  { name: 'Americano Especial', price: 27.5, description: 'Pão, ovo, queijo, bacon, presunto, abacaxi, alface, tomate, milho e batata palha' },
  { name: 'Laçador', price: 27.5, description: 'Pão, hambúrguer de boi, bacon, queijo, ovo, alface, tomate, milho e batata palha' },
  { name: 'Frangão', price: 28.0, description: 'Pão, frango desfiado, queijo, bacon, abacaxi, alface, tomate, milho e batata palha' },
  { name: 'X-Tudo', price: 30.0, description: 'Pão, hambúrguer de boi, hambúrguer de frango, ovo, bacon, queijo, presunto, alface, tomate, milho e batata palha' },
  { name: 'X-picanha 1', price: 30.0, description: 'Pão, hambúrguer de picanha (120g), queijo, alface, tomate, milho e batata palha' },
  { name: 'Especial Catupiry', price: 30.0, description: 'Pão, hambúrguer de frango, catupiry, ovo, bacon, abacaxi, alface, tomate, milho e batata palha' },
  { name: 'X-Picanha 2', price: 33.0, description: 'Pão, hambúrguer de picanha (120g), ovo, presunto, queijo, alface, tomate, milho e batata palha' },
  { name: 'Sugestão', price: 33.0, description: 'Pão, hambúrguer de boi, ovo, bacon, frango desfiado, abacaxi, queijo, presunto, alface, tomate, milho e batata palha' },
  { name: 'Big Picanha', price: 40.0, description: 'Pão, 2 hambúrguers de picanha (120g), ovo, bacon, presunto, queijo, alface, tomate, milho e batata palha' },
  { name: 'Super Vide Gula', price: 45.0, description: 'Pão, 2 hambúrguers de boi, hambúrguer de frango, 2 ovos, bacon, 2 queijos, 2 presuntos, alface, tomate, milho e batata palha' },
  { name: 'Mega Víde Gula', price: 55.0, description: 'Pão, 4 hambúrguers de boi, 2 hambúrguers de frango, 3 ovos, bacon, 3 queijos, 3 presuntos, alface, tomate, milho e batata palha' },
]

const REFRIGERANTES: Array<{ name: string; price: number; description?: string }> = [
  { name: 'Coca 200 ml', price: 3.0 },
  { name: 'Fanta Laranja Lata', price: 6.0, description: '350 ml' },
  { name: 'Fanta Uva Lata', price: 6.0, description: '350 ml' },
  { name: 'Coca Cola Lata', price: 6.0, description: '350 ml' },
  { name: 'Coca Cola Lata Zero', price: 6.0, description: '350 ml' },
  { name: 'Guaraná Lata', price: 6.0, description: '350 ml' },
  { name: 'Sprite Lata', price: 6.0, description: '350 ml' },
  { name: 'Frutty 500ml', price: 6.0, description: 'Abacaxi' },
  { name: 'Gatorade 500ml', price: 7.0, description: 'Consultar sabores' },
  { name: 'Coca Cola 600 ml', price: 7.5 },
  { name: 'Coca Cola Zero 600 ml', price: 7.5 },
  { name: 'Fanta 600 ml', price: 7.5 },
  { name: 'Guaraná Antártica 1,5 L', price: 11.0 },
  { name: 'Coca Cola 2 Litros', price: 15.0 },
  { name: 'Fanta 2 Litros', price: 15.0 },
  { name: 'Sprite 2 Litros', price: 15.0 },
  { name: 'Guaraná 2 Litros', price: 15.0 },
]

const SUCOS: Array<{ name: string; price: number; description?: string }> = [
  { name: 'Suco lata 330 ml', price: 6.5 },
  { name: 'Suco 1 Litro', price: 9.0, description: 'Consultar sabores' },
  { name: 'Água de coco 1L', price: 12.0 },
]

const BEBIDAS: Array<{ name: string; price: number }> = [
  { name: 'Itaipava', price: 4.5 },
  { name: 'Petra', price: 5.0 },
  { name: 'Brahma', price: 6.0 },
  { name: 'Skol', price: 6.0 },
  { name: 'TNT', price: 10.0 },
  { name: 'Budweiser', price: 9.0 },
  { name: 'Heineken', price: 10.0 },
  { name: 'Corona', price: 10.0 },
  { name: 'Monster', price: 15.0 },
  { name: 'Red Bull', price: 15.0 },
]

const DOCES: Array<{ name: string; price: number; description?: string }> = [
  { name: 'Trento 32g', price: 3.5, description: 'Consultar sabores' },
  { name: 'Prestígio 33g', price: 4.5 },
  { name: 'Choquito 32g', price: 4.5 },
  { name: 'Caribe 28g', price: 4.5 },
  { name: '5stars 40g', price: 5.0 },
  { name: 'Talento', price: 13.0, description: 'Consultar sabores' },
]

async function main() {
  const store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } })
  if (!store) {
    console.error(`❌ Loja "${STORE_SLUG}" não encontrada. Crie a conta primeiro.`)
    process.exit(1)
  }
  console.log(`✅ Loja encontrada: ${store.name} (${store.id})`)

  // Aborta se já houver cardápio cadastrado (evita duplicação acidental)
  const existing = await prisma.category.count({ where: { storeId: store.id } })
  if (existing > 0) {
    console.error(`⚠️  A loja já tem ${existing} categoria(s). Apague pelo painel antes de rodar este script (ou defina FORCE=1).`)
    if (process.env.FORCE !== '1') process.exit(1)
    console.warn('🚨 FORCE=1 detectado — apagando categorias/produtos existentes...')
    await prisma.category.deleteMany({ where: { storeId: store.id } })
  }

  // ─── Categorias ─────────────────────────────────────────────────────────────
  const [catLanches, catRefri, catSucos, catBebidas, catDoces] = await Promise.all([
    prisma.category.create({ data: { storeId: store.id, name: 'Lanches',       position: 1 } }),
    prisma.category.create({ data: { storeId: store.id, name: 'Refrigerantes', position: 2 } }),
    prisma.category.create({ data: { storeId: store.id, name: 'Sucos',         position: 3 } }),
    prisma.category.create({ data: { storeId: store.id, name: 'Bebidas',       position: 4 } }),
    prisma.category.create({ data: { storeId: store.id, name: 'Doces',         position: 5 } }),
  ])
  console.log('📂 5 categorias criadas')

  // ─── Lanches (com grupo de Adicionais em cada um) ───────────────────────────
  for (let i = 0; i < LANCHES.length; i++) {
    const l = LANCHES[i]
    await prisma.product.create({
      data: {
        storeId: store.id,
        categoryId: catLanches.id,
        name: l.name,
        description: l.description,
        price: l.price,
        position: i + 1,
        tags: [],
        addonGroups: {
          create: [
            {
              name: 'Adicionais',
              min: 0,
              max: 5,
              required: false,
              position: 1,
              options: {
                create: ADICIONAIS.map((a, idx) => ({ name: a.name, price: a.price, position: idx + 1 })),
              },
            },
          ],
        },
      },
    })
  }
  console.log(`🍔 ${LANCHES.length} lanches criados (com Adicionais)`)

  // ─── Refrigerantes / Sucos / Bebidas / Doces (sem adicionais) ───────────────
  async function bulkProducts(
    items: Array<{ name: string; price: number; description?: string }>,
    categoryId: string,
    label: string,
  ) {
    for (let i = 0; i < items.length; i++) {
      const p = items[i]
      await prisma.product.create({
        data: {
          storeId: store!.id,
          categoryId,
          name: p.name,
          description: p.description ?? null,
          price: p.price,
          position: i + 1,
          tags: [],
        },
      })
    }
    console.log(`${label}: ${items.length} produtos criados`)
  }

  await bulkProducts(REFRIGERANTES, catRefri.id, '🥤 Refrigerantes')
  await bulkProducts(SUCOS,         catSucos.id, '🍹 Sucos')
  await bulkProducts(BEBIDAS,       catBebidas.id, '🍺 Bebidas')
  await bulkProducts(DOCES,         catDoces.id, '🍫 Doces')

  console.log('\n✅ Cardápio da Vide Gula populado com sucesso!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
