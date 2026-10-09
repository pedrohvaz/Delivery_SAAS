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
