import { PrismaClient } from '@delivery/database'

const prisma = new PrismaClient()
const STORE_SLUG = 'vide-gula'

// ─── Banner ─────────────────────────────────────────────────────────────────
const BANNER_URL =
  'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=1400&h=500&fit=crop&q=90'

// ─── Fotos por categoria (rotacionam entre os produtos) ─────────────────────
const IMAGES: Record<string, string[]> = {
  Lanches: [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&h=400&fit=crop&q=85',
    'https://images.unsplash.com/photo-1550317138-10000687a72b?w=600&h=400&fit=crop&q=85',
    'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&h=400&fit=crop&q=85',
    'https://images.unsplash.com/photo-1571091718767-18b5b1457add?w=600&h=400&fit=crop&q=85',
    'https://images.unsplash.com/photo-1561758033-d89a9ad46330?w=600&h=400&fit=crop&q=85',
  ],
  Refrigerantes: [
    'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&h=400&fit=crop&q=85',
    'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=600&h=400&fit=crop&q=85',
    'https://images.unsplash.com/photo-1581636625402-29b2a704ef13?w=600&h=400&fit=crop&q=85',
  ],
  Sucos: [
    'https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=600&h=400&fit=crop&q=85',
    'https://images.unsplash.com/photo-1546173159-315724a31696?w=600&h=400&fit=crop&q=85',
    'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&h=400&fit=crop&q=85',
  ],
  Bebidas: [
    'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&h=400&fit=crop&q=85',
    'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=600&h=400&fit=crop&q=85',
    'https://images.unsplash.com/photo-1571767454098-246b94fbcf1f?w=600&h=400&fit=crop&q=85',
  ],
  Doces: [
    'https://images.unsplash.com/photo-1564355808539-22fda35bed7e?w=600&h=400&fit=crop&q=85',
    'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=600&h=400&fit=crop&q=85',
    'https://images.unsplash.com/photo-1623238913973-21e45cced554?w=600&h=400&fit=crop&q=85',
  ],
}

async function main() {
  const store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } })
  if (!store) {
    console.error(`❌ Loja "${STORE_SLUG}" não encontrada.`)
    process.exit(1)
  }
  console.log(`✅ Loja encontrada: ${store.name}`)

  // 1) Atualiza o banner da loja
  await prisma.store.update({
    where: { id: store.id },
    data: { bannerUrl: BANNER_URL },
  })
  console.log('🖼️  Banner atualizado')

  // 2) Para cada categoria, pega seus produtos e atribui imagens em rodízio
  const categories = await prisma.category.findMany({
    where: { storeId: store.id },
    include: { products: { orderBy: { position: 'asc' } } },
  })

  for (const cat of categories) {
    const pool = IMAGES[cat.name]
    if (!pool) {
      console.log(`⏭️  Categoria "${cat.name}" sem fotos definidas — pulando`)
      continue
    }
    for (let i = 0; i < cat.products.length; i++) {
      const p = cat.products[i]
      const url = pool[i % pool.length]
      await prisma.product.update({ where: { id: p.id }, data: { imageUrl: url } })
    }
    console.log(`✅ ${cat.name}: ${cat.products.length} produto(s) com foto`)
  }

  console.log('\n🎉 Banner e fotos aplicados! Abra a vitrine pra conferir.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
