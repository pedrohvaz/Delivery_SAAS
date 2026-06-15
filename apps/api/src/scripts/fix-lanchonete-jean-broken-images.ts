import { PrismaClient } from '@delivery/database'

const prisma = new PrismaClient()

const STORE_SLUG = 'lanchonete-jean'

// Produtos cujas URLs aplicadas por update-lanchonete-jean-images.ts retornam
// HTTP 400 (link inválido/quebrado). Limpa o imageUrl para voltar ao
// placeholder padrão em vez do ícone de imagem quebrada.
const BROKEN_IMAGE_PRODUCTS = [
  'X Tudo Duplo',
  'X Meque',
  'Vegetariano',
  'X Chedar Bacon',
  'X Cheddar Tudo',
  'X Frango Burguer',
  'X Frango Salada',
  'X Frango Egg Burguer',
  'X Frango Bacon',
  'X Frango Tudo',
  'X Frango Tudo Duplo',
  'X Frango Meque',
  'X Frango Cheddar Bacon',
  'X Frango Cheddar Tudo',
  'X Filé',
  'Artesanal Clássico',
  'Artesanal Misto',
  'Artesanal Bacon',
  'Artesanal Tudo',
  'Artesanal Duplo',
  'Artesanal Duplo Bacon',
  'Artesanal Frango Clássico',
  'Artesanal Frango Bacon',
  'Artesanal Frango Tudo',
  'Artesanal Vegetariano',
  'Misto Simples',
  'Misto com Ovo',
  'Misto com Bacon',
  'Misto com Bacon e Ovo',
  'Pizza Á Moda',
  'Pizza Calabresa',
  'Pizza Frango com Catupiry',
  'Pizza Mussarela',
  'Pizza Presunto',
  'Pizza Portuguesa',
  'Pizza Toscana',
  'Pizza Palmito',
  'Fritas Simples',
  'Fritas com Mussarela',
  'Fritas com Cheddar',
  'Fritas com Bacon e Mussarela',
  'Fritas com Bacon e Cheddar',
  'Fritas com Ovo e Bacon',
  'Onion Rings',
  'Mandioca Frita',
  'Mandioca com Queijo',
  'Pão de Alho Simples',
  'Pão de Alho com Queijo',
  'Pão de Alho com Catupiry',
  'Filé Bovino com Fritas',
  'Filé Mignon com Fritas',
  'Porção Mista 1',
  'Filé de Frango com Fritas',
  'Tilápia com Pão de Alho',
]

async function main() {
  const store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } })
  if (!store) {
    console.error(`❌ Loja "${STORE_SLUG}" não encontrada.`)
    process.exit(1)
  }
  console.log(`✅ Loja encontrada: ${store.name}`)

  let updated = 0
  let notFound = 0

  for (const name of BROKEN_IMAGE_PRODUCTS) {
    const result = await prisma.product.updateMany({
      where: { storeId: store.id, name },
      data: { imageUrl: null },
    })
    if (result.count === 0) {
      console.warn(`⚠️  Produto não encontrado: "${name}"`)
      notFound++
    } else {
      updated += result.count
    }
  }

  console.log(`\n✅ ${updated} produto(s) com imagem quebrada revertido(s) para sem imagem.`)
  if (notFound > 0) console.log(`⚠️  ${notFound} nome(s) não encontrado(s) — verifique a grafia.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
