export interface Modifier {
  name: string;
  price: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  description: string;
  addons?: Modifier[];
  removals?: string[];
}

export interface Plan {
  name: string;
  price: string;
  billing: string;
  description: string;
  features: string[];
  featured?: boolean;
}

export interface Segment {
  name: string;
  image: string;
}

export const PRODUCTS: Product[] = [
  {
    id: "1",
    name: "X-Burguer Especial",
    price: 24.90,
    category: "Lanches",
    image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=150&q=80",
    description: "Hambúrguer artesanal de 150g, queijo cheddar derretido, alface, tomate e molho da casa no pão brioche.",
    addons: [
      { name: "Queijo Cheddar Extra", price: 3.50 },
      { name: "Bacon Crocante", price: 4.50 },
      { name: "Ovo Frito", price: 2.00 },
      { name: "Hambúrguer Extra (150g)", price: 8.00 }
    ],
    removals: ["Sem Alface", "Sem Tomate", "Sem Molho da Casa"]
  },
  {
    id: "2",
    name: "Pizza Brotinho",
    price: 29.90,
    category: "Pizzas",
    image: "https://images.unsplash.com/photo-1512152272829-e3139592d56f?auto=format&fit=crop&w=150&q=80",
    description: "Deliciosa massa artesanal com molho de tomate fresco, mussarela italiana de qualidade e orégano.",
    addons: [
      { name: "Borda de Catupiry", price: 5.00 },
      { name: "Dobro de Mussarela", price: 4.00 },
      { name: "Azeitonas Extras", price: 1.50 }
    ],
    removals: ["Sem Orégano", "Sem Cebola"]
  },
  {
    id: "3",
    name: "Açaí Turbinado 500ml",
    price: 18.90,
    category: "Sobremesas",
    image: "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=150&q=80",
    description: "Açaí puro acompanhado de leite em pó, leite condensado, granola crocante e fatias de banana fresca.",
    addons: [
      { name: "Leite Condensado Extra", price: 2.00 },
      { name: "Creme de Ninho", price: 3.50 },
      { name: "Nutella Genuína", price: 5.00 },
      { name: "Fatias de Morango", price: 3.00 }
    ],
    removals: ["Sem Bananas", "Sem Granola"]
  },
  {
    id: "4",
    name: "Batata Frita Suprema",
    price: 15.00,
    category: "Porções",
    image: "https://images.unsplash.com/photo-1518013041207-6f586937e191?auto=format&fit=crop&w=150&q=80",
    description: "Batatas fritas super crocantes cobertas com queijo cremoso derretido e pedaços defumados de bacon.",
    addons: [
      { name: "Cheddar Cremoso Extra", price: 3.00 },
      { name: "Bacon Picadinho Extra", price: 4.00 },
      { name: "Molho Maionese Verde", price: 1.50 }
    ],
    removals: ["Sem Bacon", "Sem Queijo Creme"]
  },
  {
    id: "5",
    name: "Refrigerante Lata",
    price: 6.00,
    category: "Bebidas",
    image: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=150&q=80",
    description: "Lata geladinha 350ml para acompanhar o seu pedido perfeito.",
    addons: [
      { name: "Copo com Gelo e Limão", price: 1.00 }
    ],
    removals: ["Sem Gelo"]
  }
];

export const PLANS: Plan[] = [
  {
    name: "Plano Starter",
    price: "R$ 0",
    billing: "Grátis para sempre",
    description: "Ideal para quem está começando a receber os seus primeiros pedidos online.",
    features: [
      "Até 50 pedidos/mês",
      "Cardápio Digital Web personalizado",
      "1 Usuário administrativo",
      "Suporte via e-mail e tutoriais",
      "Visualização Simples de Relatório"
    ]
  },
  {
    name: "Plano PRO",
    price: "R$ 79",
    billing: "/mês",
    description: "O favorito dos restaurantes. Perfeito para escalar e automatizar o seu delivery.",
    features: [
      "Pedidos ILIMITADOS",
      "WhatsApp Automático de Pedidos",
      "Pix Automático com Validação",
      "Interface de PDV para Balcão",
      "Relatórios Financeiros em Tempo Real",
      "Suporte VIP via WhatsApp"
    ],
    featured: true
  },
  {
    name: "Plano Elite",
    price: "R$ 199",
    billing: "/mês",
    description: "Para redes e comércios exigentes que querem IA e atendimento sem gargalos.",
    features: [
      "Tudo do Plano PRO",
      "IA Atendente (Chatbot inteligente)",
      "Multi-lojas & Gestão Centralizada",
      "Programa de Fidelidade Integrado",
      "Integrações diretas com sistemas ERP",
      "Gerente de de conta dedicado"
    ]
  }
];

export const SEGMENTS: Segment[] = [
  {
    name: "Lanchonetes",
    image: "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=400&q=80"
  },
  {
    name: "Pizzarias",
    image: "https://images.unsplash.com/photo-1512152272829-e3139592d56f?auto=format&fit=crop&w=400&q=80"
  },
  {
    name: "Açaí",
    image: "https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=400&q=80"
  },
  {
    name: "Adegas",
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=400&q=80"
  },
  {
    name: "Restaurantes",
    image: "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=400&q=80"
  }
];

export const FAQS = [
  {
    question: "Como funciona o período de teste?",
    answer: "Você pode começar no Plano Starter totalmente grátis. Não precisa de cartão de crédito e você pode evoluir para o Pro ou Elite quando o seu restaurante estiver pronto para decolar!"
  },
  {
    question: "Tem fidelidade ou taxa de cancelamento?",
    answer: "De jeito nenhum! A nossa parceria é baseada no valor que entregamos. Você pode cancelar sua assinatura mensal quando desejar, de forma simples e direta pelo painel, sem taxas escondidas."
  },
  {
    question: "Eu preciso instalar algum aplicativo de computador?",
    answer: "Não! O ByLink é totalmente baseado na nuvem. Você acessa o seu painel de controle direto pelo navegador do computador ou celular, de qualquer lugar do mundo."
  },
  {
    question: "Como o cliente faz o pagamento por Pix ou Cartão?",
    answer: "No Plano PRO você valida o PIX automaticamente no ato da compra. O dinheiro cai direto na sua conta bancária sem intermediários e sem cobrança de taxas ocultas."
  }
];
