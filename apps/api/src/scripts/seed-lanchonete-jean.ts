import { PrismaClient } from '@delivery/database'

const prisma = new PrismaClient()

const STORE_SLUG = 'lanchonete-jean'

// ─────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────

type Variation = { name: string; price: number }

type Item = {
  name: string
  description?: string
  price?: number // produtos sem variação
  variations?: Variation[] // produtos com variação de tamanho/sabor/qtd
  variationGroup?: string // nome do grupo de variação (padrão: "Tamanho")
  imageUrl?: string
  isActive?: boolean
}

const round2 = (n: number) => Math.round(n * 100) / 100

// ─────────────────────────────────────────────────────────────────────────
// Grupos de acréscimos reutilizáveis
// ─────────────────────────────────────────────────────────────────────────

const ACRESCIMOS_SANDUICHES: Variation[] = [
  { name: 'Bife Bovino 56g', price: 5.0 },
  { name: 'Bife Bovino 90g', price: 8.0 },
  { name: 'Bife de Frango 56g', price: 4.0 },
  { name: 'Bife de Frango 90g', price: 6.0 },
  { name: 'Bacon', price: 5.0 },
  { name: 'Presunto', price: 4.0 },
  { name: 'Ovo', price: 3.0 },
  { name: 'Mussarela', price: 4.0 },
  { name: 'Cheddar', price: 4.0 },
  { name: 'Catupiry', price: 3.0 },
  { name: 'Filé de Frango', price: 7.0 },
  { name: 'Frango Desfiado', price: 7.0 },
  { name: 'Cenoura ralada', price: 3.0 },
  { name: 'Batata palha', price: 3.0 },
  { name: 'Salada (tomate e alface)', price: 3.0 },
  { name: 'Queijo prato', price: 4.0 },
  { name: 'Molho especial', price: 2.0 },
  { name: 'Uva passa', price: 2.0 },
  { name: 'Milho verde', price: 2.0 },
  { name: 'Pão artesanal', price: 5.0 },
  { name: 'Cebola caramelizada', price: 3.0 },
  { name: 'Maionese', price: 2.0 },
]

const ACRESCIMOS_PIZZAS: Variation[] = [
  { name: 'Borda de Catupiry', price: 10.0 },
  { name: 'Borda de Cheddar', price: 10.0 },
  { name: 'Bacon', price: 8.0 },
  { name: 'Calabresa', price: 8.0 },
  { name: 'Frango desfiado', price: 8.0 },
  { name: 'Presunto', price: 8.0 },
  { name: 'Ovo', price: 5.0 },
  { name: 'Mussarela', price: 8.0 },
  { name: 'Catupiry', price: 8.0 },
  { name: 'Palmito', price: 8.0 },
  { name: 'Pimentão', price: 5.0 },
  { name: 'Tomate', price: 5.0 },
  { name: 'Milho', price: 5.0 },
]

const ACRESCIMOS_PORCOES: Variation[] = [
  { name: 'Bacon em cubos 50g', price: 5.0 },
  { name: 'Bacon em cubos 100g', price: 9.0 },
  { name: 'Mussarela 50g', price: 5.0 },
  { name: 'Mussarela 100g', price: 9.0 },
  { name: 'Cheddar 50g', price: 5.0 },
  { name: 'Cheddar 100g', price: 9.0 },
  { name: 'Fritas simples 300g', price: 20.0 },
  { name: 'Fritas simples 500g', price: 30.0 },
  { name: 'Fritas simples 700g', price: 40.0 },
  { name: 'Ovo', price: 3.0 },
  { name: 'Catupiry', price: 5.0 },
  { name: 'Cebola caramelizada', price: 5.0 },
  { name: 'Manteiga de alho', price: 3.0 },
]

// ─────────────────────────────────────────────────────────────────────────
// LANCHES
// ─────────────────────────────────────────────────────────────────────────

const LANCHES: Item[] = [
  {
    name: 'X Burguer',
    description: 'Pão, salada, bife 56g ou 90g, mussarela, batata palha e milho verde',
    variations: [
      { name: '56g', price: 20.0 },
      { name: '90g', price: 23.0 },
    ],
    imageUrl: 'https://lh3.googleusercontent.com/9xeXpGRVuQED8T-rQdbiOU47DEmKtDJF5n_tvBHbi7gC4wdb0V6IUPO56TZm68QDiBZRZ5rr0BGNF3LPVOiKbF_bqFFiZkj_=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  },
  {
    name: 'X Salada',
    description: 'Pão, salada, bife 56g ou 90g, mussarela, cenoura ralada, uva passas, batata palha e milho verde',
    price: 24.0,
    imageUrl: 'https://lh3.googleusercontent.com/w8IbFImjxRq-vkYH_TRsFlRlNfv0PT44u89jVSHW20_5ZbkOEZw_AxQLh9B3euyuTioPD9q35wTHHwjiN0sTrUpgXWoKyIyTUg=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  },
  {
    name: 'X Egg Burguer',
    description: 'Pão, salada, bife 56g ou 90g, mussarela, ovo, batata palha e milho verde',
    variations: [
      { name: '56g', price: 22.0 },
      { name: '90g', price: 25.0 },
    ],
    imageUrl: 'https://lh3.googleusercontent.com/xupqatsBC6wTYm5lo4JT6SmoQ4gBGPdMN_h0uegbWcpK-vo2Ldgtn7yL0V5iI6kPE76k5aVYZEujc9_uxP6lV26YnU6TnXMz=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  },
  {
    name: 'X Bacon',
    description: 'Pão, salada, bife 56g ou 90g, mussarela, bacon, batata palha e milho verde',
    variations: [
      { name: '56g', price: 24.0 },
      { name: '90g', price: 27.0 },
    ],
    imageUrl: 'https://lh3.googleusercontent.com/2nSEjdB7Vn2PMCc6Bfq7TZ7w2xS0FT3XXMmIGUMv_V8Jg2t06yYWCkH5FzAXr6vc-nEdFt_z_7kqXSbCH1s8aHVGZ7Axq4=w612-h420-fcrop64=1,00000000ffffffff-nu-e365-rw',
  },
  {
    name: 'X Tudo',
    description: 'Pão, salada, bife 56g ou 90g, mussarela, bacon, ovo, presunto, batata palha e milho verde',
    variations: [
      { name: '56g', price: 28.0 },
      { name: '90g', price: 31.0 },
    ],
  },
  {
    name: 'X Tudo Duplo',
    description: 'Pão, salada, 2 bifes 56g ou 90g, mussarela, bacon, ovo, presunto, batata palha e milho verde',
    variations: [
      { name: '56g', price: 32.0 },
      { name: '90g', price: 36.0 },
    ],
  },
  {
    name: 'X Meque',
    description: 'Pão, salada, 2 bifes 56g ou 90g, 2 mussarelas, 2 presuntos, 2 ovos, 2 bacon, batata palha e milho verde',
    variations: [
      { name: '56g', price: 48.0 },
      { name: '90g', price: 55.0 },
    ],
  },
  {
    name: 'Vegetariano',
    description: 'Pão, salada, ovo, mussarela, catupiry, cenoura ralada, uva passas, batata palha e milho verde',
    price: 26.0,
  },
  {
    name: 'X Chedar Bacon',
    description: 'Pão, salada, bife 56g ou 90g, mussarela, bacon, cheddar, batata palha e milho verde',
    price: 29.0,
  },
  {
    name: 'X Cheddar Tudo',
    description: 'Pão, salada, bife 56g ou 90g, mussarela, cheddar, bacon, ovo, presunto, batata palha e milho verde',
    price: 32.0,
  },
  {
    name: 'X Frango Burguer',
    description: 'Pão, salada, bife de frango 90g, mussarela, batata palha e milho verde',
    price: 23.0,
  },
  {
    name: 'X Frango Salada',
    description: 'Pão, salada, bife de frango 90g, mussarela, cenoura ralada, uva passas, batata palha e milho verde',
    price: 27.0,
  },
  {
    name: 'X Frango Egg Burguer',
    description: 'Pão, salada, bife de frango 90g, ovo, mussarela, batata palha e milho verde',
    price: 25.0,
  },
  {
    name: 'X Frango Bacon',
    description: 'Pão, salada, bife de frango 90g, mussarela, bacon, batata palha e milho verde',
    price: 27.0,
  },
  {
    name: 'X Frango Tudo',
    description: 'Pão, salada, bife de frango 90g, mussarela, presunto, ovo, bacon, batata palha e milho verde',
    price: 31.0,
  },
  {
    name: 'X Frango Tudo Duplo',
    description: 'Pão, salada, 2 bifes de frango 90g, mussarela, presunto, ovo, bacon, batata palha e milho verde',
    price: 36.0,
  },
  {
    name: 'X Frango Meque',
    description: 'Pão, salada, 2 bifes de frango 90g, 2 mussarelas, 2 presuntos, 2 ovos, 2 bacon, batata palha e milho verde',
    price: 54.0,
  },
  {
    name: 'X Frango Cheddar Bacon',
    description: 'Pão, salada, bife de frango 90g, mussarela, bacon, cheddar, batata palha e milho verde',
    price: 32.0,
  },
  {
    name: 'X Frango Cheddar Tudo',
    description: 'Pão, salada, bife de frango 90g, mussarela, cheddar, bacon, ovo, presunto, batata palha e milho verde',
    price: 32.0,
  },
  {
    name: 'X Filé',
    description: 'Pão, salada, bife de frango 90g, mussarela, filé de frango, batata palha e milho verde',
    price: 28.0,
  },
  {
    name: 'X Filé Bacon',
    description: 'Pão, salada, bife de frango 90g, mussarela, bacon, filezinho de frango, batata palha e milho verde',
    price: 33.0,
  },
  {
    name: 'X Filé Egg',
    description: 'Pão, salada, bife de frango 90g, mussarela, ovo, filé de frango, batata palha e milho verde',
    price: 31.0,
  },
]

// ─────────────────────────────────────────────────────────────────────────
// SANDUÍCHES ARTESANAIS
// ─────────────────────────────────────────────────────────────────────────

const SANDUICHES_ARTESANAIS: Item[] = [
  { name: 'Artesanal Clássico', description: 'Pão artesanal, salada, bife bovino, queijo prato, molho especial, batata palha', price: 35.0 },
  { name: 'Artesanal Misto', description: 'Pão artesanal, salada, bife bovino, queijo prato, presunto, molho especial, batata palha', price: 38.0 },
  { name: 'Artesanal Bacon', description: 'Pão artesanal, salada, bife bovino, queijo prato, bacon, molho especial, batata palha', price: 40.0 },
  { name: 'Artesanal Tudo', description: 'Pão artesanal, salada, bife bovino, queijo prato, presunto, bacon, molho especial, batata palha', price: 43.0 },
  { name: 'Artesanal Duplo', description: 'Pão artesanal, salada, 2 bifes bovinos, queijo prato, molho especial, batata palha', price: 48.0 },
  { name: 'Artesanal Duplo Bacon', description: 'Pão artesanal, salada, 2 bifes bovinos, queijo prato, bacon, molho especial, batata palha', price: 53.0 },
  { name: 'Artesanal Frango Clássico', description: 'Pão artesanal, salada, bife de frango, queijo prato, molho especial, batata palha', price: 37.0 },
  { name: 'Artesanal Frango Bacon', description: 'Pão artesanal, salada, bife de frango, queijo prato, bacon, molho especial, batata palha', price: 42.0 },
  { name: 'Artesanal Frango Tudo', description: 'Pão artesanal, salada, bife de frango, queijo prato, presunto, bacon, molho especial, batata palha', price: 45.0 },
  { name: 'Artesanal Vegetariano', description: 'Pão artesanal, salada, ovo, queijo prato, catupiry, cenoura ralada, uva passas, molho especial, batata palha', price: 33.0 },
]

// ─────────────────────────────────────────────────────────────────────────
// MISTOS
// ─────────────────────────────────────────────────────────────────────────

const MISTOS: Item[] = [
  { name: 'Misto Simples', description: 'Pão de forma, queijo e presunto', price: 7.0 },
  { name: 'Misto com Ovo', description: 'Pão de forma, queijo, presunto e ovo', price: 9.0 },
  { name: 'Misto com Bacon', description: 'Pão de forma, queijo e bacon', price: 9.0 },
  { name: 'Misto com Bacon e Ovo', description: 'Pão de forma, queijo, bacon e ovo', price: 11.0 },
]

// ─────────────────────────────────────────────────────────────────────────
// PIZZAS
// ─────────────────────────────────────────────────────────────────────────

const PIZZAS: Item[] = [
  {
    name: 'Pizza Á Moda',
    description: 'Molho de tomate, presunto, mussarela, tomate, cebola, pimentão, calabresa, palmito, milho, azeitona e orégano',
    variations: [
      { name: 'P (4 fatias)', price: 80.0 },
      { name: 'M (6 fatias)', price: 100.0 },
      { name: 'G (8 fatias)', price: 120.0 },
    ],
  },
  {
    name: 'Pizza Calabresa',
    description: 'Molho de tomate, calabresa, cebola, mussarela, azeitona e orégano',
    variations: [
      { name: 'P (4 fatias)', price: 45.0 },
      { name: 'M (6 fatias)', price: 55.0 },
      { name: 'G (8 fatias)', price: 65.0 },
    ],
  },
  {
    name: 'Pizza Frango com Catupiry',
    description: 'Molho de tomate, frango desfiado, catupiry, mussarela, azeitona e orégano',
    variations: [
      { name: 'P (4 fatias)', price: 48.0 },
      { name: 'M (6 fatias)', price: 60.0 },
      { name: 'G (8 fatias)', price: 72.0 },
    ],
  },
  {
    name: 'Pizza Mussarela',
    description: 'Molho de tomate, mussarela, tomate e orégano',
    variations: [
      { name: 'P (4 fatias)', price: 40.0 },
      { name: 'M (6 fatias)', price: 50.0 },
      { name: 'G (8 fatias)', price: 60.0 },
    ],
  },
  {
    name: 'Pizza Presunto',
    description: 'Molho de tomate, presunto, mussarela, azeitona e orégano',
    variations: [
      { name: 'P (4 fatias)', price: 42.0 },
      { name: 'M (6 fatias)', price: 52.0 },
      { name: 'G (8 fatias)', price: 62.0 },
    ],
  },
  {
    name: 'Pizza Portuguesa',
    description: 'Molho de tomate, presunto, mussarela, ovo, cebola, pimentão, milho, azeitona e orégano',
    variations: [
      { name: 'P (4 fatias)', price: 50.0 },
      { name: 'M (6 fatias)', price: 62.0 },
      { name: 'G (8 fatias)', price: 75.0 },
    ],
  },
  {
    name: 'Pizza Toscana',
    description: 'Molho de tomate, calabresa, bacon, cebola, mussarela, azeitona e orégano',
    variations: [
      { name: 'P (4 fatias)', price: 50.0 },
      { name: 'M (6 fatias)', price: 62.0 },
      { name: 'G (8 fatias)', price: 75.0 },
    ],
  },
  {
    name: 'Pizza Palmito',
    description: 'Molho de tomate, palmito, mussarela, azeitona e orégano',
    variations: [
      { name: 'P (4 fatias)', price: 45.0 },
      { name: 'M (6 fatias)', price: 55.0 },
      { name: 'G (8 fatias)', price: 65.0 },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────
// PORÇÕES
// ─────────────────────────────────────────────────────────────────────────

const PORCOES: Item[] = [
  {
    name: 'Fritas Simples',
    description: 'Batata frita simples temperada',
    variations: [
      { name: '300g', price: 20.0 },
      { name: '500g', price: 30.0 },
      { name: '700g', price: 40.0 },
    ],
  },
  {
    name: 'Fritas com Mussarela',
    description: 'Batata frita com mussarela derretida',
    variations: [
      { name: '300g', price: 25.0 },
      { name: '500g', price: 35.0 },
      { name: '700g', price: 45.0 },
    ],
  },
  {
    name: 'Fritas com Cheddar',
    description: 'Batata frita com molho cheddar',
    variations: [
      { name: '300g', price: 25.0 },
      { name: '500g', price: 35.0 },
      { name: '700g', price: 45.0 },
    ],
  },
  {
    name: 'Fritas com Bacon e Mussarela',
    description: 'Batata frita com bacon e mussarela derretida',
    variations: [
      { name: '300g', price: 30.0 },
      { name: '500g', price: 40.0 },
      { name: '700g', price: 50.0 },
    ],
  },
  {
    name: 'Fritas com Bacon e Cheddar',
    description: 'Batata frita com bacon e molho cheddar',
    variations: [
      { name: '300g', price: 30.0 },
      { name: '500g', price: 40.0 },
      { name: '700g', price: 50.0 },
    ],
  },
  {
    name: 'Fritas com Ovo e Bacon',
    description: 'Batata frita com ovo e bacon',
    variations: [
      { name: '300g', price: 30.0 },
      { name: '500g', price: 40.0 },
      { name: '700g', price: 50.0 },
    ],
  },
  {
    name: 'Onion Rings',
    variations: [
      { name: '300g', price: 25.0 },
      { name: '500g', price: 35.0 },
    ],
  },
  {
    name: 'Mandioca Frita',
    variations: [
      { name: '300g', price: 20.0 },
      { name: '500g', price: 28.0 },
    ],
  },
  {
    name: 'Mandioca com Queijo',
    description: 'Mandioca frita com queijo derretido',
    variations: [
      { name: '300g', price: 25.0 },
      { name: '500g', price: 33.0 },
    ],
  },
  {
    name: 'Pão de Alho Simples',
    variationGroup: 'Quantidade',
    variations: [
      { name: '4 unid', price: 12.0 },
      { name: '8 unid', price: 20.0 },
    ],
  },
  {
    name: 'Pão de Alho com Queijo',
    variationGroup: 'Quantidade',
    variations: [
      { name: '4 unid', price: 15.0 },
      { name: '8 unid', price: 25.0 },
    ],
  },
  {
    name: 'Pão de Alho com Catupiry',
    variationGroup: 'Quantidade',
    variations: [
      { name: '4 unid', price: 15.0 },
      { name: '8 unid', price: 25.0 },
    ],
  },
  {
    name: 'Filé Bovino com Fritas',
    description: 'Filé bovino grelhado acompanhado de batata frita',
    variations: [
      { name: '400g', price: 55.0 },
      { name: '600g', price: 70.0 },
      { name: '800g', price: 90.0 },
    ],
  },
  {
    name: 'Filé Mignon com Fritas',
    description: 'Filé mignon grelhado ou empanado, acompanhado de batata frita',
    variations: [
      { name: '400g', price: 65.0 },
      { name: '600g', price: 80.0 },
      { name: '800g', price: 100.0 },
    ],
  },
  {
    name: 'Contra Filé com Fritas',
    variations: [
      { name: '400g', price: 55.0 },
      { name: '600g', price: 70.0 },
      { name: '800g', price: 90.0 },
    ],
  },
  {
    name: 'Tilápia com Pão de Alho',
    description: 'Peixe tilápia grelhado ou empanado, acompanhado de pão de alho',
    price: 75.0,
  },
  {
    name: 'Porção Mista 1',
    description: '1/2 Fritas simples e 1/2 Onion rings',
    price: 30.0,
  },
  {
    name: 'Porção Mista 2',
    description: '1/2 Filé com Fritas, e 1/2 Calabresa com Mandioca',
    price: 100.0,
  },
  {
    name: 'Porção Mista 3',
    description: '1/2 Contra filé com fritas, mussarela na batata, e 1/2 Onion Rings e pão de alho',
    price: 100.0,
  },
  {
    name: 'Porção Mista 4',
    description: '1/2 filé com fritas e 1/2 tilápia com pão de alho',
    price: 120.0,
  },
  {
    name: 'Filé de Frango com Fritas',
    description: 'Filé de frango grelhado ou empanado, acompanhado de batata frita',
    variations: [
      { name: '400g', price: 45.0 },
      { name: '600g', price: 55.0 },
      { name: '800g', price: 70.0 },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────
// SALGADOS
// ─────────────────────────────────────────────────────────────────────────

const SALGADOS: Item[] = [
  { name: 'Coxinha', price: 5.0 },
  { name: 'Risole', price: 5.0 },
  { name: 'Enrolado de Presunto e Queijo', price: 5.0 },
  { name: 'Enrolado de Calabresa', price: 5.0 },
  { name: 'Enrolado de Frango', price: 5.0 },
  { name: 'Pão de Queijo', price: 4.0 },
  { name: 'Pão de Queijo Recheado', description: 'Frango com requeijão ou calabresa', price: 5.0 },
  { name: 'Mini-pizza', price: 5.0 },
  { name: 'Empadas', description: 'Só frango, frango com bacon e frango com cheddar', price: 0, isActive: false },
  { name: 'Espetinho de Frango Empanado', price: 8.0 },
  { name: 'Fatia de Pizza', description: 'Somente aos finais de semana (sexta, sábado e domingo)', price: 0, isActive: false },
]

// ─────────────────────────────────────────────────────────────────────────
// FRIOS
// ─────────────────────────────────────────────────────────────────────────

const FRIOS: Item[] = [
  { name: 'Tábua 1', description: '150g de queijo coalho grelhado, 150g de presunto, e 4 unid de pão de alho', price: 45.0 },
  { name: 'Tábua 2', description: '200g de calabresa acebolada, 200g de frango desfiado, e 4 unid de pão de alho', price: 55.0 },
  { name: 'Tábua 3', description: '100g de queijo coalho grelhado, 100g de presunto, 100g de calabresa acebolada, 100g de frango desfiado, e 4 unid de pão de alho', price: 55.0 },
]

// ─────────────────────────────────────────────────────────────────────────
// CALDOS
// ─────────────────────────────────────────────────────────────────────────

const CALDOS: Item[] = [
  { name: 'Caldo de Frango', price: 20.0 },
  { name: 'Caldo de Feijão', price: 20.0 },
]

// ─────────────────────────────────────────────────────────────────────────
// CERVEJAS
// ─────────────────────────────────────────────────────────────────────────

const CERVEJAS: Item[] = [
  { name: 'Bohemia', variations: [{ name: 'Lata', price: 7.0 }, { name: 'Long Neck', price: 9.0 }] },
  { name: 'Budweiser', variations: [{ name: 'Lata', price: 7.0 }, { name: 'Long Neck', price: 9.0 }] },
  { name: 'Colorado', variations: [{ name: 'Lata', price: 10.0 }, { name: 'Long Neck', price: 12.0 }] },
  { name: 'Itaipava', variations: [{ name: 'Lata', price: 6.0 }, { name: 'Long Neck', price: 8.0 }] },
  { name: 'Original', variations: [{ name: 'Lata', price: 8.0 }, { name: 'Long Neck', price: 10.0 }] },
  { name: 'Petra', variations: [{ name: 'Lata', price: 7.0 }, { name: 'Long Neck', price: 9.0 }, { name: 'Garrafa', price: 18.0 }] },
  { name: 'Spaten', variations: [{ name: 'Lata', price: 8.0 }, { name: 'Long Neck', price: 10.0 }] },
  { name: 'Stella Artois', variations: [{ name: 'Lata', price: 8.0 }, { name: 'Long Neck', price: 10.0 }, { name: 'Garrafa', price: 22.0 }] },
  { name: 'Brahma', variations: [{ name: 'Lata', price: 6.0 }, { name: 'Long Neck', price: 8.0 }] },
  { name: 'Skol', variations: [{ name: 'Lata', price: 6.0 }, { name: 'Long Neck', price: 8.0 }] },
  { name: 'Heineken', variations: [{ name: 'Long Neck', price: 12.0 }, { name: 'Garrafa', price: 25.0 }] },
  { name: 'Puro Malte', price: 6.0 },
]

// ─────────────────────────────────────────────────────────────────────────
// BEBIDAS
// ─────────────────────────────────────────────────────────────────────────

const BEBIDAS: Item[] = [
  { name: 'Red Bull', price: 14.0 },
  { name: 'Bigg', price: 6.0 },
  { name: 'Monster', variationGroup: 'Sabor', variations: [{ name: 'Mango Loco', price: 14.0 }, { name: 'Ultra', price: 14.0 }] },
  { name: 'Suco de Caixinha', price: 5.0 },
  { name: 'Suco de Caixinha 1L', price: 14.0 },
  { name: 'Gatorade', price: 8.0 },
  { name: 'Isotônico', price: 7.0 },
  { name: 'Leite', price: 5.0 },
  { name: 'Água', variations: [{ name: '500ml', price: 3.0 }, { name: 'Com Gás 500ml', price: 5.0 }, { name: '1,5L', price: 6.0 }] },
  { name: 'Meiota (Pinga da Roça Pedra Negra)', variations: [{ name: 'Dose', price: 5.0 }, { name: 'Meiota', price: 7.0 }] },
]

// ─────────────────────────────────────────────────────────────────────────
// VINHOS
// ─────────────────────────────────────────────────────────────────────────

const VINHOS: Item[] = [
  { name: 'Almaden', price: 50.0 },
  { name: 'Aruba', price: 50.0 },
  { name: 'Pérgola', price: 50.0 },
  { name: 'Sangue de Boi', price: 45.0 },
  { name: 'Gato Negro', price: 65.0 },
  { name: 'Santa Helena', price: 55.0 },
]

// ─────────────────────────────────────────────────────────────────────────
// REFRIGERANTES
// ─────────────────────────────────────────────────────────────────────────

const REFRIGERANTES: Item[] = [
  {
    name: 'Refrigerante Pet 200ml',
    variationGroup: 'Sabor',
    variations: [{ name: 'Coca', price: 4.0 }, { name: 'Guaraná', price: 4.0 }],
  },
  {
    name: 'Refrigerante Lata 350ml',
    variationGroup: 'Sabor',
    variations: [
      { name: 'Sprite', price: 7.0 },
      { name: 'Fanta', price: 7.0 },
      { name: 'Coca', price: 7.0 },
      { name: 'Guaraná', price: 7.0 },
    ],
  },
  {
    name: 'Refrigerante 600ml',
    variationGroup: 'Sabor',
    variations: [
      { name: 'Coca', price: 8.5 },
      { name: 'Fanta', price: 8.5 },
      { name: 'Sprite', price: 8.5 },
      { name: 'Guaraná', price: 8.5 },
    ],
  },
  {
    name: 'Refrigerante 1L Pet',
    variationGroup: 'Sabor',
    variations: [{ name: 'Coca', price: 12.0 }, { name: 'Guaraná', price: 12.0 }],
  },
  {
    name: 'Refrigerante 2L',
    variationGroup: 'Sabor',
    variations: [
      { name: 'Coca', price: 14.0 },
      { name: 'Guaraná', price: 14.0 },
      { name: 'Fanta', price: 14.0 },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────
// SUCOS
// ─────────────────────────────────────────────────────────────────────────

const SUCOS: Item[] = [
  { name: 'Pêssego Lata', price: 7.0 },
  { name: 'Néctar de Uva', price: 7.0 },
  { name: 'Del Fruta Laranja', variations: [{ name: '290ml', price: 5.0 }, { name: '1L', price: 12.0 }] },
  { name: 'Néctar de Pêssego', variations: [{ name: '290ml', price: 5.0 }, { name: '1L', price: 12.0 }] },
  { name: 'Del Fruta Uva', variations: [{ name: '290ml', price: 5.0 }, { name: '1L', price: 12.0 }] },
  { name: 'Sufresh Maracujá', variations: [{ name: '290ml', price: 5.0 }, { name: '1L', price: 12.0 }] },
  { name: 'Maguary', price: 12.0 },
]

// ─────────────────────────────────────────────────────────────────────────
// SUCOS NATURAL
// ─────────────────────────────────────────────────────────────────────────

const SUCOS_NATURAL: Item[] = [
  { name: 'Suco Natural de Laranja', description: '300ml ou 500ml', price: 12.0 },
  { name: 'Suco Natural de Limão', description: '300ml ou 500ml', price: 12.0 },
  { name: 'Suco Natural de Maracujá', description: '300ml ou 500ml', price: 12.0 },
  { name: 'Suco Natural de Abacaxi', description: '300ml ou 500ml', price: 12.0 },
]

// ─────────────────────────────────────────────────────────────────────────
// BOMBONIERE
// ─────────────────────────────────────────────────────────────────────────

const BOMBONIERE: Item[] = [
  { name: 'Chocolate Talento', variations: [{ name: 'Pequeno', price: 4.5 }, { name: 'Médio', price: 9.0 }] },
  { name: 'Diamante Negro', variations: [{ name: 'Pequeno', price: 4.5 }, { name: 'Médio', price: 9.0 }, { name: 'Grande', price: 14.0 }, { name: 'Tamanho Família', price: 17.0 }] },
  { name: 'Suflair', variations: [{ name: 'Pequeno', price: 9.0 }, { name: 'Grande', price: 13.0 }] },
  { name: 'Kinder Joy', price: 13.0 },
  { name: 'Caixa de Bombom', price: 20.0 },
  { name: 'Caixa de Bis', price: 9.0 },
  { name: 'Fruit-tella', price: 0, isActive: false },
  { name: 'Mentos', price: 3.5 },
  { name: 'Caribe', price: 4.5 },
  { name: '5-Star', price: 5.0 },
  { name: 'Lollo', price: 4.5 },
  { name: 'Paçoquita', price: 1.0 },
  { name: 'Kinder Bueno', price: 11.0 },
  { name: 'Bis Extra', description: 'Ao leite ou oreo', price: 6.5 },
  { name: 'Kit Kat', description: 'Limão, ao leite, branco e mystery', price: 6.5 },
  { name: 'Baton Unid', price: 2.2 },
  { name: 'Nutella B-ready', price: 6.0 },
  { name: 'Barra Ouro Branco ou Oreo (Recheadas)', variationGroup: 'Sabor', variations: [{ name: 'Oreo', price: 15.0 }, { name: 'Ouro Branco', price: 15.0 }] },
  { name: 'Trufa', description: 'Brigadeiro, beijinho, ninho com brigadeiro e ninho com frutas vermelhas', price: 0, isActive: false },
  { name: 'Geladinho Gourmet', description: 'Consultar sabores disponíveis', price: 0, isActive: false },
  { name: 'Pão de Mel', description: 'Brigadeiro ou doce de leite', price: 0, isActive: false },
  { name: 'Snickers', description: 'Pé de moleque, ao leite e dark', price: 6.0 },
  { name: 'Charge', price: 4.5 },
  { name: 'Choquito', price: 4.5 },
  { name: 'Bala de Goma', price: 2.0 },
  { name: 'Pirulito Yourgute', price: 0.75 },
  { name: 'Bombom Unid', price: 2.2 },
  { name: 'Barra Galak', price: 0, isActive: false },
  { name: 'Barra Diamante com Laka', price: 14.0 },
  { name: 'Barra Laka (G)', price: 14.0 },
  { name: 'Paçoca com Chocolate', price: 2.0 },
  { name: 'Trento', description: 'Chocolate, avelã, maracujá ou limão', price: 4.0 },
  { name: 'Black', variationGroup: 'Quantidade', variations: [{ name: 'Unidade', price: 3.0 }, { name: 'Maço', price: 40.0 }] },
  { name: 'San Marino', variationGroup: 'Quantidade', variations: [{ name: 'Unidade', price: 1.0 }, { name: 'Maço', price: 7.5 }] },
  { name: 'Palha', variationGroup: 'Quantidade', variations: [{ name: 'Unidade', price: 1.0 }, { name: 'Maço', price: 15.0 }] },
  { name: 'Da Eva', variationGroup: 'Quantidade', variations: [{ name: 'Unidade', price: 1.0 }, { name: 'Maço', price: 15.0 }] },
  { name: 'De Luca', variationGroup: 'Quantidade', variations: [{ name: 'Unidade', price: 1.0 }, { name: 'Maço', price: 13.0 }] },
  { name: 'Seda Zomo', price: 5.0 },
  { name: 'Isqueiro', variations: [{ name: 'Pequeno', price: 5.5 }, { name: 'Grande', price: 6.5 }] },
]

// ─────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────

async function createProducts(
  storeId: string,
  items: Item[],
  categoryId: string,
  acrescimos?: Variation[],
) {
  for (let i = 0; i < items.length; i++) {
    const it = items[i]

    let price: number
    const addonGroups: Array<{
      name: string
      min: number
      max: number
      required: boolean
      position: number
      options: { create: Array<{ name: string; price: number; position: number }> }
    }> = []

    if (it.variations) {
      const min = Math.min(...it.variations.map((v) => v.price))
      price = min
      addonGroups.push({
        name: it.variationGroup ?? 'Tamanho',
        min: 1,
        max: 1,
        required: true,
        position: 1,
        options: {
          create: it.variations.map((v, idx) => ({
            name: v.name,
            price: round2(v.price - min),
            position: idx + 1,
          })),
        },
      })
    } else {
      price = it.price ?? 0
    }

    if (acrescimos) {
      addonGroups.push({
        name: 'Acréscimos',
        min: 0,
        max: acrescimos.length,
        required: false,
        position: addonGroups.length + 1,
        options: {
          create: acrescimos.map((a, idx) => ({ name: a.name, price: a.price, position: idx + 1 })),
        },
      })
    }

    await prisma.product.create({
      data: {
        storeId,
        categoryId,
        name: it.name,
        description: it.description ?? null,
        price,
        imageUrl: it.imageUrl ?? null,
        isActive: it.isActive ?? true,
        position: i + 1,
        tags: [],
        addonGroups: addonGroups.length ? { create: addonGroups } : undefined,
      },
    })
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────

async function main() {
  const store = await prisma.store.findUnique({ where: { slug: STORE_SLUG } })
  if (!store) {
    console.error(`❌ Loja "${STORE_SLUG}" não encontrada. Crie a conta primeiro.`)
    process.exit(1)
  }
  console.log(`✅ Loja encontrada: ${store.name} (${store.id})`)

  const existing = await prisma.category.count({ where: { storeId: store.id } })
  if (existing > 0) {
    console.error(`⚠️  A loja já tem ${existing} categoria(s). Apague pelo painel antes de rodar este script (ou defina FORCE=1).`)
    if (process.env.FORCE !== '1') process.exit(1)
    console.warn('🚨 FORCE=1 detectado — apagando categorias/produtos existentes...')
    await prisma.category.deleteMany({ where: { storeId: store.id } })
  }

  const categoriesDef: Array<{ name: string; items: Item[]; acrescimos?: Variation[] }> = [
    { name: 'Lanches', items: LANCHES, acrescimos: ACRESCIMOS_SANDUICHES },
    { name: 'Sanduíches Artesanais', items: SANDUICHES_ARTESANAIS, acrescimos: ACRESCIMOS_SANDUICHES },
    { name: 'Mistos', items: MISTOS, acrescimos: ACRESCIMOS_SANDUICHES },
    { name: 'Pizzas', items: PIZZAS, acrescimos: ACRESCIMOS_PIZZAS },
    { name: 'Porções', items: PORCOES, acrescimos: ACRESCIMOS_PORCOES },
    { name: 'Salgados', items: SALGADOS },
    { name: 'Frios', items: FRIOS },
    { name: 'Caldos', items: CALDOS },
    { name: 'Cervejas', items: CERVEJAS },
    { name: 'Bebidas', items: BEBIDAS },
    { name: 'Vinhos', items: VINHOS },
    { name: 'Refrigerantes', items: REFRIGERANTES },
    { name: 'Sucos', items: SUCOS },
    { name: 'Sucos Natural', items: SUCOS_NATURAL },
    { name: 'Bomboniere', items: BOMBONIERE },
  ]

  for (let i = 0; i < categoriesDef.length; i++) {
    const { name, items, acrescimos } = categoriesDef[i]
    const category = await prisma.category.create({
      data: { storeId: store.id, name, position: i + 1 },
    })
    await createProducts(store.id, items, category.id, acrescimos)
    console.log(`📂 ${name}: ${items.length} produto(s) criado(s)`)
  }

  console.log('\n✅ Cardápio da Lanchonete Jean populado com sucesso!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
