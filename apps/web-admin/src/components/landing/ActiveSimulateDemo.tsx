'use client'

import { useState } from "react";
import { ShoppingCart, Check, Send, RotateCcw, Flame, Truck, Store, CreditCard, Coins, Clock, ArrowRight, Palette, Search, X } from "lucide-react";
import { PRODUCTS, Product } from "./data";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "motion/react";
import AdminPanel from "./AdminPanel";

// Presets de Cores e Temas de Marca para Personalização de Layout
const THEMES = [
  { id: "orange", name: "Laranja Original", hex: "#FF6B00", text: "text-[#FF6B00]", bg: "bg-[#FF6B00]", bgHover: "hover:bg-[#E05E00]", border: "border-[#FF6B00]/20", bgLight: "bg-[#FFF5F0]" },
  { id: "red", name: "Vermelho Gourmet", hex: "#DC2626", text: "text-[#DC2626]", bg: "bg-[#DC2626]", bgHover: "hover:bg-[#B91C1C]", border: "border-[#DC2626]/20", bgLight: "bg-[#FEF2F2]" },
  { id: "green", name: "Verde Orgânico", hex: "#16A34A", text: "text-[#16A34A]", bg: "bg-[#16A34A]", bgHover: "hover:bg-[#15803D]", border: "border-[#16A34A]/20", bgLight: "bg-[#F0FDF4]" },
  { id: "purple", name: "Açaí & Doces (Roxo)", hex: "#9333EA", text: "text-[#9333EA]", bg: "bg-[#9333EA]", bgHover: "hover:bg-[#7E22CE]", border: "border-[#9333EA]/20", bgLight: "bg-[#FAF5FF]" },
  { id: "dark", name: "Estilo Midnight", hex: "#111111", text: "text-[#111111]", bg: "bg-[#111111]", bgHover: "hover:bg-[#000000]", border: "border-neutral-200", bgLight: "bg-[#F3F4F6]" }
];

// Presets de Nicho/Banners para Personalização de Layout
const BANNERS = [
  { id: "burger", name: "Hamburgueria", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=650&q=80", logo: "🍔", title: "Burger & Co. Concept Studio", desc: "Os melhores smash burgers artesanais da cidade com ingredientes frescos e molhos secretos" },
  { id: "pizza", name: "Pizzaria", url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=650&q=80", logo: "🍕", title: "Bella Itália Pizzeria Art", desc: "Verdadeiras pizzas italianas artesanais de fermentação natural assadas na pedra" },
  { id: "healthy", name: "Saladas & Sucos", url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=650&q=80", logo: "🥗", title: "Green Fresh Salad & Juice", desc: "Saladas orgânicas, wraps, bowls e sucos naturais prensados a frio ricos em sabor" },
  { id: "sweet", name: "Açaí & Sobremesas", url: "https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=650&q=80", logo: "🍧", title: "Sunset Açaí & Sweet House", desc: "Açaí cremoso puro, taças de sorvete gourmet, crepes e waffles magníficos" },
  { id: "sushi", name: "Sushi Lounge", url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=650&q=80", logo: "🍣", title: "Sensei Sushi & Asian Lounge", desc: "Experiência de culinária japonesa contemporânea com os cortes de peixe mais nobres e frescos" }
];

interface CartItem {
  cartId: string;
  product: Product;
  quantity: number;
  addons: { name: string; price: number }[];
  removals: string[];
}

export interface HistoryOrder {
  id: string;
  customerName: string;
  phone: string;
  address?: string;
  deliveryType: "delivery" | "takeaway";
  paymentMethod: "pix" | "card" | "cash";
  totalAmount: number;
  items: {
    name: string;
    quantity: number;
    price: number;
    addons: string[];
    removals: string[];
  }[];
  date: string;
  status: " cozinha" | "preparando" | "rota" | "entregue";
}

export default function ActiveSimulateDemo() {
  const [cart, setCart] = useState<CartItem[]>([
    {
      cartId: "initial-1",
      product: PRODUCTS[0], // "X-Burguer Especial"
      quantity: 2,
      addons: [],
      removals: []
    },
    {
      cartId: "initial-2",
      product: PRODUCTS[3], // "Batata Frita Suprema"
      quantity: 1,
      addons: [],
      removals: []
    }
  ]);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Custom Dynamic Theme States
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [selectedBanner, setSelectedBanner] = useState(BANNERS[0]);

  // View Switcher (Cardapio vs Order History)
  const [cardapioView, setCardapioView] = useState<"menu" | "history">("menu");
  const [activeOrderID, setActiveOrderID] = useState<string | null>(null);
  const [selectedHistoryOrder, setSelectedHistoryOrder] = useState<HistoryOrder | null>(null);
  const [toastMessage, setToastMessage] = useState("Checkout Direto Concluído!");

  // Orders History State
  const [ordersHistory, setOrdersHistory] = useState<HistoryOrder[]>([
    {
      id: "BY-7412",
      customerName: "Camila Rodrigues",
      phone: "(11) 97777-6666",
      address: "Rua das Flores, 45 - Apto 101",
      deliveryType: "delivery",
      paymentMethod: "pix",
      totalAmount: 64.90,
      items: [
        { name: "X-Burger Especial", quantity: 1, price: 28.90, addons: ["Bacon Extra"], removals: [] },
        { name: "Batata Frita Suprema", quantity: 1, price: 22.00, addons: [], removals: [] },
        { name: "Refrigerante Gelado", quantity: 1, price: 6.00, addons: [], removals: [] }
      ],
      date: "Ontem às 20:15",
      status: "entregue"
    },
    {
      id: "BY-7394",
      customerName: "Marcos Oliveira",
      phone: "(11) 91111-2222",
      address: "",
      deliveryType: "takeaway",
      paymentMethod: "card",
      totalAmount: 43.50,
      items: [
        { name: "Pizza Brotinho Margherita", quantity: 1, price: 34.00, addons: [], removals: ["Manjericão"] },
        { name: "Suco Natural de Laranja", quantity: 1, price: 9.50, addons: [], removals: [] }
      ],
      date: "Ontem às 19:30",
      status: "entregue"
    }
  ]);

  // Customization Modal and state options
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<{ [name: string]: boolean }>({});
  const [selectedRemovals, setSelectedRemovals] = useState<{ [name: string]: boolean }>({});

  // Direct Checkout States
  const [checkoutStep, setCheckoutStep] = useState<"details" | "checkout" | "receipt">("details");
  const [deliveryType, setDeliveryType] = useState<"delivery" | "takeaway">("delivery");
  const [userName, setUserName] = useState("Pedro Silva");
  const [userPhone, setUserPhone] = useState("(11) 98888-7777");
  const [userAddress, setUserAddress] = useState("Av. Brasil, 1500 - Ap 42");
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | "cash">("pix");
  const [cashChange, setCashChange] = useState("");
  const [copiedPix, setCopiedPix] = useState(false);
  const [isPixPaid, setIsPixPaid] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [simulatedStatus, setSimulatedStatus] = useState<" cozinha" | "preparando" | "rota">(" cozinha");
  const [simulationMode, setSimulationMode] = useState<"client" | "staff">("client");
  const [historyFilter, setHistoryFilter] = useState<"all" | "in_progress" | "completed">("all");

  const handleUpdateOrderStatus = (orderId: string, newStatus: " cozinha" | "preparando" | "rota" | "entregue") => {
    if (orderId === activeOrderID) {
      if (newStatus !== "entregue") {
        setSimulatedStatus(newStatus);
      }
    }
    setOrdersHistory(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
    setToastMessage(`Status do pedido #${orderId} alterado!`);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2000);
  };

  const handleClearOrders = () => {
    setOrdersHistory([]);
    setToastMessage("Histórico de pedidos limpo!");
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 2000);
  };

  const addCartItem = (product: Product, addons: { name: string; price: number }[], removals: string[]) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => {
        if (item.product.name !== product.name) return false;
        if (item.addons.length !== addons.length) return false;
        if (item.removals.length !== removals.length) return false;
        
        const sameAddons = addons.every(a => item.addons.some(ia => ia.name === a.name));
        const sameRemovals = removals.every(r => item.removals.includes(r));
        
        return sameAddons && sameRemovals;
      });

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      }

      return [
        ...prev,
        {
          cartId: `${product.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          product,
          quantity: 1,
          addons,
          removals,
        }
      ];
    });
  };

  const handleAddToCart = (product: Product) => {
    // Open customization modal if product has modifier options
    if ((product.addons && product.addons.length > 0) || (product.removals && product.removals.length > 0)) {
      setCustomizingProduct(product);
      // Reset selected preferences
      setSelectedAddons({});
      setSelectedRemovals({});
    } else {
      addCartItem(product, [], []);
    }
  };

  const handleToggleAddon = (addonName: string) => {
    setSelectedAddons((prev) => ({
      ...prev,
      [addonName]: !prev[addonName],
    }));
  };

  const handleToggleRemoval = (removalName: string) => {
    setSelectedRemovals((prev) => ({
      ...prev,
      [removalName]: !prev[removalName],
    }));
  };

  const handleConfirmCustomization = () => {
    if (!customizingProduct) return;
    const addonsList = (customizingProduct.addons || []).filter(a => selectedAddons[a.name]);
    const removalsList = (customizingProduct.removals || []).filter(r => selectedRemovals[r]);
    addCartItem(customizingProduct, addonsList, removalsList);
    setCustomizingProduct(null);
  };

  const handleRemoveOneMenu = (productName: string) => {
    setCart((prev) => {
      const index = [...prev].reverse().findIndex(item => item.product.name === productName);
      if (index === -1) return prev;
      
      const actualIndex = prev.length - 1 - index;
      const item = prev[actualIndex];
      if (item.quantity <= 1) {
        return prev.filter((_, idx) => idx !== actualIndex);
      }
      
      const updated = [...prev];
      updated[actualIndex] = { ...item, quantity: item.quantity - 1 };
      return updated;
    });
  };

  const handleIncrementCartItem = (cartId: string) => {
    setCart((prev) => prev.map(item => item.cartId === cartId ? { ...item, quantity: item.quantity + 1 } : item));
  };

  const handleDecrementCartItem = (cartId: string) => {
    setCart((prev) => {
      const found = prev.find(item => item.cartId === cartId);
      if (!found) return prev;
      if (found.quantity <= 1) {
        return prev.filter(item => item.cartId !== cartId);
      }
      return prev.map(item => item.cartId === cartId ? { ...item, quantity: item.quantity - 1 } : item);
    });
  };

  const categories = ["all", ...Array.from(new Set(PRODUCTS.map((p) => p.category)))];

  const cartTotal = cart.reduce((acc, item) => {
    const addonsPrice = item.addons.reduce((sum, a) => sum + a.price, 0);
    return acc + (item.product.price + addonsPrice) * item.quantity;
  }, 0);

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const resetDemo = () => {
    setCart([
      {
        cartId: "initial-1",
        product: PRODUCTS[0],
        quantity: 2,
        addons: [],
        removals: []
      },
      {
        cartId: "initial-2",
        product: PRODUCTS[3],
        quantity: 1,
        addons: [],
        removals: []
      }
    ]);
    setCheckoutStep("details");
    setDeliveryType("delivery");
    setPaymentMethod("pix");
    setIsPixPaid(false);
    setCopiedPix(false);
    setShowSuccessToast(false);
    setSimulatedStatus(" cozinha");
    setSelectedTheme(THEMES[0]);
    setSelectedBanner(BANNERS[0]);
    setCustomizingProduct(null);
    setSearchQuery("");
    setCardapioView("menu");
    setActiveOrderID(null);
  };

  const handleCopyPix = () => {
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2000);
  };

  const simulatePixPayment = () => {
    setIsPixPaid(true);
    confetti({
      particleCount: 120,
      spread: 60,
      origin: { y: 0.65 },
      colors: ["#FF6B00", "#111111", "#00C851", "#25D366"],
    });

    const generatedId = `BY-${Math.floor(1000 + Math.random() * 9000)}`;
    setActiveOrderID(generatedId);
    
    const newOrder: HistoryOrder = {
      id: generatedId,
      customerName: userName,
      phone: userPhone,
      address: deliveryType === "delivery" ? userAddress : undefined,
      deliveryType,
      paymentMethod,
      totalAmount: cartTotal,
      items: cart.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        addons: item.addons.map(a => a.name),
        removals: item.removals
      })),
      date: `Hoje às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
      status: " cozinha"
    };

    setOrdersHistory(prev => [newOrder, ...prev]);
    
    // Auto advance to receipt
    setTimeout(() => {
      setCheckoutStep("receipt");
      setToastMessage("Checkout Direto Concluído!");
      triggerSuccessFlow();
    }, 1500);
  };

  const triggerSuccessFlow = () => {
    confetti({
      particleCount: 180,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#FF6B00", "#25D366", "#ffffff"]
    });
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 4500);

    // Simulate status step timer
    setTimeout(() => {
      setSimulatedStatus("preparando");
    }, 5500);
    setTimeout(() => {
      setSimulatedStatus("rota");
    }, 10500);
  };

  const submitDirectCheckout = () => {
    if (totalItems === 0) return;
    if (paymentMethod === "pix") {
      setCheckoutStep("checkout");
    } else {
      const generatedId = `BY-${Math.floor(1000 + Math.random() * 9000)}`;
      setActiveOrderID(generatedId);
      
      const newOrder: HistoryOrder = {
        id: generatedId,
        customerName: userName,
        phone: userPhone,
        address: deliveryType === "delivery" ? userAddress : undefined,
        deliveryType,
        paymentMethod,
        totalAmount: cartTotal,
        items: cart.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          addons: item.addons.map(a => a.name),
          removals: item.removals
        })),
        date: `Hoje às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
        status: " cozinha"
      };

      setOrdersHistory(prev => [newOrder, ...prev]);

      setCheckoutStep("receipt");
      setToastMessage("Checkout Direto Concluído!");
      triggerSuccessFlow();
    }
  };

  const handleReorder = (order: HistoryOrder) => {
    const newCartItems: CartItem[] = order.items.map(item => {
      const productObj = PRODUCTS.find(p => p.name === item.name) || PRODUCTS[0];
      const addonsObj = (productObj.addons || []).filter(addon => item.addons.includes(addon.name));
      return {
        cartId: `${productObj.id}-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        product: productObj,
        quantity: item.quantity,
        addons: addonsObj,
        removals: item.removals
      };
    });
    setCart(newCartItems);
    
    confetti({
      particleCount: 80,
      spread: 50,
      origin: { y: 0.8 },
      colors: [selectedTheme.hex, "#ffffff"]
    });
    
    setToastMessage(`Itens do pedido #${order.id} re-adicionados!`);
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
    setCardapioView("menu");
  };

  const getOrderStatus = (order: HistoryOrder) => {
    if (order.id === activeOrderID) {
      return simulatedStatus;
    }
    return order.status;
  };

  // Generate WhatsApp message template matching the checkpoint string format
  const getWhatsAppMessage = () => {
    let msg = `*🛒 NOVO PEDIDO - BYLINK DELIVERY (Checkout Direto)*\n`;
    msg += `-------------------------\n`;
    msg += `*Cliente:* ${userName}\n`;
    msg += `*Telefone:* ${userPhone}\n`;
    msg += `*Entrega:* ${deliveryType === "delivery" ? `Entregar em ${userAddress}` : "Retirada no Balcão"}\n`;
    msg += `*Canal:* Direct Checkout Web\n`;
    msg += `*Pagamento:* ${
      paymentMethod === "pix" 
        ? "Pix (Aprovado Instantaneamente)" 
        : paymentMethod === "card" 
          ? "Cartão na entrega" 
          : `Dinheiro ${cashChange ? `(Troco para R$ ${cashChange})` : "(Sem troco)"}`
    }\n`;
    msg += `-------------\n`;
    
    cart.forEach((item) => {
      const addonsPrice = item.addons.reduce((sum, a) => sum + a.price, 0);
      const itemTotal = (item.product.price + addonsPrice) * item.quantity;
      msg += `*${item.quantity}x* ${item.product.name}`;
      
      const details: string[] = [];
      if (item.addons.length > 0) {
        details.push(`Adicionais: ${item.addons.map(a => `${a.name} (+R$ ${a.price.toFixed(2)})`).join(', ')}`);
      }
      if (item.removals.length > 0) {
        details.push(`Remover: ${item.removals.join(', ')}`);
      }
      
      if (details.length > 0) {
        msg += ` (${details.join(' | ')})`;
      }
      
      msg += ` - R$ ${itemTotal.toFixed(2)}\n`;
    });
    
    msg += `-------------\n`;
    msg += `*Total:* R$ ${cartTotal.toFixed(2)}\n\n`;
    msg += `_ByLink: Sem comissão de marketplaces!_`;
    return msg;
  };

  const dispatchWhatsAppOnly = () => {
    const wame = `https://wa.me/5511999999999?text=${encodeURIComponent(getWhatsAppMessage())}`;
    window.open(wame, "_blank");
  };

  const filteredProducts = PRODUCTS.filter((p) => {
    const matchesCategory = activeTab === "all" || p.category === activeTab;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const filteredHistoryOrders = ordersHistory.filter((order) => {
    const status = getOrderStatus(order);
    if (historyFilter === "all") return true;
    if (historyFilter === "in_progress") {
      return status !== "entregue";
    }
    if (historyFilter === "completed") {
      return status === "entregue";
    }
    return true;
  });

  return (
    <div id="simulador-demo" className="scroll-mt-20">
      <div className="flex flex-col gap-6">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#FF6B00] bg-[#FFF5F0] px-3 py-1.5 rounded-full inline-block border border-[#FF6B00]/10 font-mono">
              Teste na prática
            </span>
            <h2 className="text-2xl md:text-3xl font-bold font-display tracking-tight text-[#111111] mt-2">
              Faça um pedido com o Checkout Direto ByLink
            </h2>
            <p className="text-[#555555] text-sm mt-1 max-w-xl font-sans">
              Monte seu prato e experimente o fluxo de <strong className="text-neutral-900">Checkout Direto</strong>. Altere as preferências visuais na barra de personalização abaixo para testar a flexibilidade de layouts!
            </p>
          </div>

          <button
            onClick={resetDemo}
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#111111] border border-[#E0E0E0] hover:border-[#FF6B00] hover:text-[#FF6B00] transition-all bg-white px-3 py-2 rounded-lg cursor-pointer self-start md:self-auto font-mono"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar Simulação
          </button>
        </div>

        {/* 🔄 SWITCHER DE MODOS DO SIMULADOR (Cliente vs Admin Funcionário) */}
        <div className="flex bg-neutral-100 p-1.5 rounded-2xl max-w-2xl mx-auto w-full border border-neutral-200/80 gap-1.5 shadow-sm">
          <button
            onClick={() => setSimulationMode("client")}
            className={`flex-1 py-3 text-xs md:text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              simulationMode === "client" 
                ? "bg-white text-neutral-900 shadow-md font-black border-l-3 border-[#FF6B00]" 
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <span className="text-sm">📱</span>
            <span>Vitrine de Delivery (Visão do Cliente)</span>
          </button>
          <button
            onClick={() => setSimulationMode("staff")}
            className={`flex-1 py-3 text-xs md:text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              simulationMode === "staff" 
                ? "bg-white text-[#FF6B00] shadow-md font-black border-l-3 border-[#FF6B00]" 
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            <span className="text-sm">🖥️</span>
            <span>Painel do Funcionário (Visão da Loja / ADM)</span>
            <span className="bg-[#FF6B00] text-white text-[9px] px-2 py-0.5 rounded-full font-black animate-pulse uppercase tracking-wider">
              Painel ADM
            </span>
          </button>
        </div>

        {/* 🎨 PAINEL DE PERSONALIZAÇÃO DE LAYOUT */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 md:p-5 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#FF6B00]/10 text-[#FF6B00]">
                <Palette className="w-5 h-5" />
              </span>
              <h3 className="font-extrabold text-sm md:text-base text-neutral-900 tracking-tight font-display">
                Central de Customização Visual de Cardápio
              </h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed font-sans max-w-2xl">
              <strong className="text-neutral-900">Layout 100% Personalizável!</strong> No painel ByLink, você ajusta as cores da marca, troca banners e adiciona sua própria identidade visual sem depender de programadores. Teste na prática abaixo:
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-6 w-full xl:w-auto">
            {/* Color Select Control */}
            <div className="flex flex-col gap-1.5 flex-1 sm:flex-initial">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6B00] font-mono">
                1. Cor de Destaque / Marca
              </span>
              <div className="flex items-center gap-2">
                {THEMES.map((t) => {
                  const isActive = selectedTheme.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTheme(t)}
                      title={t.name}
                      className={`w-7.5 h-7.5 rounded-full border-2 cursor-pointer transition-all flex items-center justify-center ${
                        isActive
                          ? "ring-2 ring-neutral-400 scale-110"
                          : "hover:scale-105 opacity-85 hover:opacity-100"
                      }`}
                      style={{
                        backgroundColor: t.hex,
                        borderColor: isActive ? "#ffffff" : "transparent"
                      }}
                    >
                      {isActive && <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nicho / Banner Select Control */}
            <div className="flex flex-col gap-1.5 flex-1 sm:flex-initial">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6B00] font-mono">
                2. Nicho de Atuação (Banner & Logo)
              </span>
              <div className="flex flex-wrap gap-1 md:max-w-xs xl:max-w-md">
                {BANNERS.map((b) => {
                  const isActive = selectedBanner.id === b.id;
                  return (
                    <button
                      key={b.id}
                      onClick={() => setSelectedBanner(b)}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? `${selectedTheme.bg} text-white`
                          : "bg-neutral-100 border border-neutral-200/60 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      <span>{b.logo}</span>
                      <span>{b.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Demo Grid */}
        {simulationMode === "client" ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Cardápio Virtual (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E0E0E0] shadow-sm flex flex-col justify-between overflow-hidden">
            <div>
              {/* CABEÇALHO DO SIMULADOR COM BANNER PERSONALIZÁVEL */}
              <div className="relative">
                {/* Imagem de Fundo do Banner */}
                <div className="h-28 md:h-32 xl:h-36 w-full relative overflow-hidden bg-neutral-100">
                  <img
                    src={selectedBanner.url}
                    alt={selectedBanner.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover brightness-75 transition-all duration-700 scale-101 hover:scale-103"
                  />
                  {/* Floating Badges */}
                  <span className="absolute top-3 right-3 text-[9px] font-black tracking-wider text-white bg-green-600 border border-green-500 px-2 py-0.5 rounded-full font-sans shadow-sm uppercase animate-pulse flex items-center gap-1">
                    🟢 ABERTO AGORA
                  </span>

                  <span className="absolute top-3 left-3 text-[9px] font-bold tracking-wider text-white bg-black/60 backdrop-blur-xs px-2.5 py-0.5 border border-white/10 rounded-full font-mono uppercase">
                    📱 Cardápio Digital Web
                  </span>
                </div>

                {/* Logotipo Circular flutuante */}
                <div className="absolute -bottom-6 left-5 z-10 w-16 h-16 md:w-20 md:h-20 rounded-full bg-white p-1 shadow-md border-2 border-white flex items-center justify-center text-3xl md:text-4xl transition-all duration-500 select-none">
                  {selectedBanner.logo}
                </div>
              </div>

              {/* Informações Ativas do Estabelecimento */}
              <div className="pt-8 px-5 pb-3 border-b border-neutral-100 bg-neutral-50/40 text-left">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-black text-lg md:text-xl text-[#111111] font-display tracking-tight leading-tight transition-all duration-300">
                      {selectedBanner.title}
                    </h3>
                    <p className="text-[11px] md:text-xs text-[#555555] mt-1 font-sans italic max-w-sm xl:max-w-md">
                      {selectedBanner.desc}
                    </p>
                  </div>

                  <span className={`text-[9px] font-bold border ${selectedTheme.bgLight} ${selectedTheme.text} ${selectedTheme.border} px-3 py-1 rounded-full font-mono flex items-center gap-1.5 self-start md:self-auto uppercase tracking-wide`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedTheme.bg} animate-ping`} />
                    Layout: {selectedTheme.name}
                  </span>
                </div>

                {/* Loja Status Extra Row */}
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#666666] font-medium mt-3.5 pt-2.5 border-t border-neutral-200/50">
                  <span className="flex items-center gap-1 text-amber-500 font-bold">
                    ★ 4.9 <span className="text-[#666666] font-normal">(150+ avaliações)</span>
                  </span>
                  <span className="text-neutral-300">•</span>
                  <span className="flex items-center gap-1 font-mono">
                    🕒 20-35 min
                  </span>
                  <span className="text-neutral-300">•</span>
                  <span className="text-green-600 font-bold">
                    Entrega Grátis
                  </span>
                </div>
              </div>

              <div className="p-5 pt-4 flex flex-col h-full min-h-[460px]">
                {/* Visual View Switching Tab System */}
                <div className="flex border-b border-neutral-100 mb-4 px-2 select-none">
                  <button
                    onClick={() => setCardapioView("menu")}
                    className={`flex items-center gap-2 pb-3 pt-1 text-xs font-black uppercase tracking-wider transition-all relative cursor-pointer ${
                      cardapioView === "menu"
                        ? `${selectedTheme.text}`
                        : "text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    <Flame className="w-4 h-4 animate-pulse" />
                    <span>Cardápio Virtual</span>
                    {cardapioView === "menu" && (
                      <motion.div
                        layoutId="activeMenuTabIndicator"
                        className={`absolute bottom-0 left-0 right-0 h-0.5 ${selectedTheme.bg}`}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>

                  <button
                    onClick={() => setCardapioView("history")}
                    className={`ml-6 flex items-center gap-2 pb-3 pt-1 text-xs font-black uppercase tracking-wider transition-all relative cursor-pointer ${
                      cardapioView === "history"
                        ? `${selectedTheme.text}`
                        : "text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Histórico de Pedidos</span>
                    <span className="text-[9px] bg-neutral-100 border border-neutral-200/60 px-1.5 py-0.2 rounded-full font-mono text-neutral-500 font-bold ml-1">
                      {ordersHistory.length}
                    </span>
                    {cardapioView === "history" && (
                      <motion.div
                        layoutId="activeMenuTabIndicator"
                        className={`absolute bottom-0 left-0 right-0 h-0.5 ${selectedTheme.bg}`}
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {cardapioView === "menu" ? (
                    <motion.div
                      key="menu-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex-1 flex flex-col"
                    >
                      {/* Search Bar & Categories Selectors */}
                      <div className="flex flex-col gap-3 mb-4">
                        {/* Search Bar Input */}
                        <div className="relative font-sans">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Pesquisar pratos pelo nome..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-9 h-9 text-xs bg-[#F8F9FA] hover:bg-neutral-100/80 focus:bg-white text-[#111111] placeholder-neutral-500 rounded-xl border border-neutral-200 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00]/20 transition-all outline-none"
                          />
                          {searchQuery && (
                            <button
                              onClick={() => setSearchQuery("")}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer p-1"
                              title="Limpar pesquisa"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Categories Segmented Control */}
                        <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none font-sans">
                          {categories.map((cat) => (
                            <button
                              key={cat}
                              onClick={() => setActiveTab(cat)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                                activeTab === cat
                                  ? `${selectedTheme.bg} text-white`
                                  : "bg-[#F8F9FA] text-[#555555] hover:bg-[#E0E0E0]"
                              }`}
                            >
                              {cat === "all" ? "Todos" : cat}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Interactive Products List */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                        {filteredProducts.length === 0 ? (
                          <div className="col-span-full py-10 px-4 flex flex-col items-center justify-center text-center bg-[#F8F9FA] rounded-xl border border-dashed border-neutral-200">
                            <span className="text-3xl mb-2">🔍</span>
                            <p className="text-xs font-extrabold text-[#111111] font-sans">Nenhum prato encontrado</p>
                            <p className="text-[10px] text-neutral-500 font-sans mt-1 max-w-[240px]">
                              Não encontramos itens correspondentes a "{searchQuery}" nesta categoria.
                            </p>
                          </div>
                        ) : (
                          filteredProducts.map((prod) => {
                            const qtyInCart = cart.filter(item => item.product.name === prod.name).reduce((sum, item) => sum + item.quantity, 0);
                            return (
                              <div
                                key={prod.id}
                                className="flex flex-col justify-between border border-[#E0E0E0] rounded-xl p-3 bg-[#F8F9FA] transition-all group font-sans"
                                style={{
                                  borderColor: qtyInCart > 0 ? selectedTheme.hex : undefined
                                }}
                              >
                                <div className="flex gap-3">
                                  <img
                                    src={prod.image}
                                    alt={prod.name}
                                    referrerPolicy="no-referrer"
                                    className="w-14 h-14 rounded-lg object-cover border border-[#E0E0E0] bg-white flex-shrink-0"
                                  />
                                  <div className="flex-1 min-w-0 text-left">
                                    <p className="font-bold text-xs text-[#111111] leading-snug transition-colors truncate"
                                       style={{ color: qtyInCart > 0 ? selectedTheme.hex : undefined }}>
                                      {prod.name}
                                    </p>
                                    <p className="text-[10px] text-[#666666] leading-normal line-clamp-2 mt-0.5 font-sans">
                                      {prod.description}
                                    </p>
                                    {(prod.addons && prod.addons.length > 0) && (
                                      <p className="text-[8px] text-[#FF6B00] font-bold font-mono tracking-wide mt-1 animate-pulse">
                                        ✦ OPÇÕES DE ADICIONAIS
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#E0E0E0]/60 font-sans">
                                  <span className="font-mono text-xs font-bold text-[#111111]">
                                    R$ {prod.price.toFixed(2)}
                                  </span>

                                  <div className="flex items-center gap-1.5 font-mono">
                                    {qtyInCart > 0 && (
                                      <>
                                        <motion.button
                                          whileTap={{ scale: 0.9 }}
                                          onClick={() => handleRemoveOneMenu(prod.name)}
                                          className="w-6 h-6 flex items-center justify-center rounded-md bg-white border border-[#E0E0E0] hover:bg-neutral-100 font-bold text-xs cursor-pointer transition-all"
                                        >
                                          -
                                        </motion.button>
                                        <motion.span
                                          key={qtyInCart}
                                          initial={{ scale: 0.8 }}
                                          animate={{ scale: [0.8, 1.3, 1] }}
                                          transition={{ type: "spring", stiffness: 450, damping: 15 }}
                                          className="w-5 text-center font-mono text-xs font-bold text-[#111111] inline-block"
                                        >
                                          {qtyInCart}
                                        </motion.span>
                                      </>
                                    )}
                                    <motion.button
                                      whileTap={{ scale: 0.95 }}
                                      onClick={() => handleAddToCart(prod)}
                                      className={`px-2.5 h-6 flex items-center justify-center rounded-md ${selectedTheme.bg} ${selectedTheme.bgHover} text-white text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all`}
                                    >
                                      {(prod.addons && prod.addons.length > 0) ? "Personalizar" : `Adicionar ${qtyInCart > 0 ? "(+1)" : ""}`}
                                    </motion.button>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="history-view"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className="flex-1 flex flex-col max-h-[420px] text-left font-sans w-full"
                    >
                      {/* Filter Bar */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3.5 select-none font-sans">
                        <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest font-mono">
                          Histórico de Simulações
                        </span>
                        
                        <div className="flex items-center gap-2 bg-[#F8F9FA] border border-neutral-200 hover:border-neutral-300 rounded-xl px-2.5 py-1.5 focus-within:border-[#FF6B00] focus-within:ring-1 focus-within:ring-[#FF6B00]/15 transition-all">
                          <span className="text-neutral-400 text-xs font-semibold">Filtro:</span>
                          <select
                            value={historyFilter}
                            onChange={(e) => setHistoryFilter(e.target.value as any)}
                            className="bg-transparent text-neutral-800 font-bold outline-none cursor-pointer text-xs pr-1"
                          >
                            <option value="all">📁 Todos ({ordersHistory.length})</option>
                            <option value="in_progress">🕒 Em Andamento ({ordersHistory.filter(o => getOrderStatus(o) !== "entregue").length})</option>
                            <option value="completed">✓ Concluídos ({ordersHistory.filter(o => getOrderStatus(o) === "entregue").length})</option>
                          </select>
                        </div>
                      </div>

                      {ordersHistory.length === 0 ? (
                        <div className="py-12 px-4 flex flex-col items-center justify-center text-center bg-[#F8F9FA] rounded-xl border border-dashed border-neutral-200">
                          <span className="text-3xl mb-2">📜</span>
                          <p className="text-xs font-extrabold text-[#111111] font-sans">Sem histórico de pedidos</p>
                          <p className="text-[10px] text-neutral-500 font-sans mt-1 max-w-[240px]">
                            Faça um pedido no checkout direto ByLink para iniciar seu histórico simulado!
                          </p>
                        </div>
                      ) : (
                        <div className="flex-1 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin space-y-3.5">
                          {filteredHistoryOrders.length === 0 ? (
                            <div className="py-12 px-4 flex flex-col items-center justify-center text-center bg-[#F8F9FA] rounded-xl border border-dashed border-neutral-200">
                              <span className="text-2xl mb-1">🔍</span>
                              <p className="text-xs font-extrabold text-[#111111] font-sans">Nenhum pedido encontrado</p>
                              <p className="text-[10px] text-neutral-500 font-sans mt-1">Nenhum pedido atende a este filtro de status.</p>
                            </div>
                          ) : (
                            filteredHistoryOrders.map((order) => {
                              const status = getOrderStatus(order);
                              let statusBadge = null;
                              if (status === " cozinha") {
                                statusBadge = (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full font-mono animate-pulse">
                                    🕒 Recebido
                                  </span>
                                );
                              } else if (status === "preparando") {
                                statusBadge = (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-500/10 border border-amber-450/30 px-2 py-0.5 rounded-full font-mono animate-pulse">
                                    🍳 Preparando
                                  </span>
                                );
                              } else if (status === "rota") {
                                statusBadge = (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 border border-emerald-400/30 px-2 py-0.5 rounded-full font-mono animate-bounce">
                                    🛵 Em Rota
                                  </span>
                                );
                              } else {
                                statusBadge = (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-neutral-500 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-full font-mono">
                                    ✓ Entregue
                                  </span>
                                );
                              }

                              let paymentLabel = order.paymentMethod === "pix" ? "Pix" : order.paymentMethod === "card" ? "Cartão" : "Dinheiro";

                              return (
                                <div
                                  key={order.id}
                                  onClick={() => setSelectedHistoryOrder(order)}
                                  className="bg-[#F8F9FA] border border-[#E0E0E0] rounded-xl p-3.5 hover:border-neutral-400 hover:shadow-xs transition-all flex flex-col justify-between relative overflow-hidden cursor-pointer group"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-black text-neutral-900 group-hover:text-[#FF6B00] transition-colors">
                                          #{order.id}
                                        </span>
                                        {statusBadge}
                                      </div>
                                      <p className="text-[10px] text-neutral-500 font-mono mt-1">
                                        {order.date}
                                      </p>
                                    </div>

                                    <div className="text-right flex flex-col items-end">
                                      <p className={`font-mono text-xs font-black ${selectedTheme.text}`}>
                                        R$ {order.totalAmount.toFixed(2)}
                                      </p>
                                      <span className="text-[8px] font-mono uppercase bg-neutral-200/60 font-black px-1.5 py-0.2 rounded text-neutral-700 inline-block mt-1">
                                        {paymentLabel}
                                      </span>
                                      <span className="text-[8px] font-bold text-[#FF6B00] opacity-0 group-hover:opacity-100 transition-opacity block mt-1.5 font-sans uppercase tracking-wider">
                                        🔍 Ver Itens
                                      </span>
                                    </div>
                                  </div>

                                  <div className="border-t border-dashed border-neutral-200 my-2.5" />

                                  <div className="space-y-1">
                                    {order.items.map((item, idx) => (
                                      <div key={idx} className="flex justify-between items-baseline text-[10px] font-sans">
                                        <span className="text-neutral-700 min-w-0 truncate">
                                          <strong className="text-neutral-900 font-mono pr-1">{item.quantity}x</strong> {item.name}
                                          {item.addons && item.addons.length > 0 && (
                                            <span className="text-emerald-500 text-[9px] font-medium leading-none block pl-4">
                                              + {item.addons.join(", ")}
                                            </span>
                                          )}
                                          {item.removals && item.removals.length > 0 && (
                                            <span className="text-red-500 text-[9px] font-medium leading-none block pl-4 font-sans">
                                              - sem {item.removals.join(", ")}
                                            </span>
                                          )}
                                        </span>
                                        <span className="text-neutral-500 font-mono text-[9px] flex-shrink-0 ml-2">
                                          R$ {(item.price * item.quantity).toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>

                                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-neutral-200/60 font-sans">
                                    <span className="text-[9px] font-mono text-neutral-500">
                                      Modalidade: {order.deliveryType === "delivery" ? "🚀 Entrega" : "🏪 Retirada"}
                                    </span>
                                    
                                    <motion.button
                                      whileTap={{ scale: 0.95 }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReorder(order);
                                      }}
                                      className={`px-2.5 h-6.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-white ${selectedTheme.bg} opacity-90 hover:opacity-100 transition-all cursor-pointer flex items-center gap-1`}
                                    >
                                      🔄 Repetir Pedido
                                    </motion.button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Simulated Live Cart Metrics info box */}
            <div className={`mt-2 mx-5 mb-5 p-3 ${selectedTheme.bgLight} border ${selectedTheme.border} rounded-xl flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${selectedTheme.bg} animate-pulse`} />
                <span className="text-xs text-neutral-700 font-sans">
                  Total provisório no carrinho: <strong className="text-neutral-900 font-mono">{totalItems} prato(s)</strong>
                </span>
              </div>
              <span className={`font-mono text-sm font-black ${selectedTheme.text}`}>R$ {cartTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Interactive Direct Checkout Terminal Panel (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between bg-[#111111] rounded-2xl border border-neutral-800 p-5 shadow-xl text-white relative">
            
            {/* Steps Indicator Tracker Header */}
            <div className="border-b border-neutral-800 pb-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF6B00]" />
                <h3 className="font-extrabold text-xs uppercase tracking-wider font-display text-[#FF6B00]">
                  Checkout Inteligente
                </h3>
              </div>
              <div className="flex gap-2 text-[10px] font-mono text-neutral-400 font-semibold">
                <span className={checkoutStep === "details" ? "text-[#FF6B00]" : ""}>1. Dados</span>
                <span>/</span>
                <span className={checkoutStep === "checkout" ? "text-[#FF6B00]" : ""}>2. Pagamento</span>
                <span>/</span>
                <span className={checkoutStep === "receipt" ? "text-[#FF6B00]" : ""}>3. Ticket</span>
              </div>
            </div>

            {totalItems === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4 rounded-xl border border-dashed border-neutral-800 bg-neutral-900/50">
                <ShoppingCart className="w-8 h-8 text-neutral-700 mb-2.5" />
                <p className="text-xs text-neutral-400 font-semibold leading-normal">
                  Seu carrinho está vazio no cardápio.
                </p>
                <p className="text-[11px] text-neutral-500 mt-1 max-w-[200px]">
                  Clique em "Adicionar" ao lado nos produtos do cardápio digital para começar o checkout!
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col justify-between h-full">

                {/* 1. Step DETAILS */}
                {checkoutStep === "details" && (
                  <div className="flex flex-col gap-3.5">
                    {/* Shopping Cart Items List inside Checkout Column */}
                    <div className="text-left bg-neutral-900/60 p-3 rounded-xl border border-neutral-800 space-y-2.5">
                      <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                        <span className="flex items-center gap-1.5 text-xs font-black text-white uppercase tracking-wider font-display">
                          <ShoppingCart className="w-3.5 h-3.5 text-[#FF6B00]" />
                          Itens no Carrinho
                        </span>
                        <motion.span
                          key={totalItems}
                          initial={{ scale: 0.8 }}
                          animate={{ scale: [0.8, 1.3, 1] }}
                          transition={{ type: "spring", stiffness: 450, damping: 15 }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedTheme.bgLight} ${selectedTheme.text} border ${selectedTheme.border} font-mono inline-block`}
                        >
                          {totalItems} item(ns)
                        </motion.span>
                      </div>

                      <div className="space-y-2 max-h-[175px] overflow-y-auto pr-1 scrollbar-thin">
                        <AnimatePresence initial={false}>
                          {cart.map((item) => {
                            const addonsPrice = item.addons.reduce((sum, a) => sum + a.price, 0);
                            const itemPrice = item.product.price + addonsPrice;
                            const itemTotal = itemPrice * item.quantity;
                            return (
                              <motion.div
                                key={item.cartId}
                                layout
                                initial={{ opacity: 0, scale: 0.92, y: 6 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.92, y: -6 }}
                                transition={{ type: "spring", stiffness: 450, damping: 22 }}
                                className="flex flex-col gap-1.5 bg-neutral-950 p-2.5 rounded-lg border border-neutral-800/65 hover:border-neutral-700 transition-colors"
                              >
                                <div className="flex items-center justify-between gap-2.5">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <img
                                      src={item.product.image}
                                      alt={item.product.name}
                                      className="w-8 h-8 rounded-md object-cover border border-neutral-800 bg-neutral-900 flex-shrink-0"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="flex-1 min-w-0 text-left">
                                      <p className="text-[11px] font-bold text-white truncate leading-tight">{item.product.name}</p>
                                      <p className="text-[10px] text-neutral-400 font-mono mt-0.5">
                                        R$ {itemPrice.toFixed(2)} cd • <strong className="text-neutral-200">R$ {itemTotal.toFixed(2)}</strong>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 rounded px-1 py-0.5">
                                    <motion.button
                                      whileTap={{ scale: 0.85 }}
                                      onClick={() => handleDecrementCartItem(item.cartId)}
                                      className="text-neutral-400 hover:text-white font-black w-4.5 h-4.5 flex items-center justify-center text-[11px] rounded hover:bg-neutral-800 transition-colors cursor-pointer"
                                      title="Remover um"
                                    >
                                      -
                                    </motion.button>
                                    <motion.span
                                      key={item.quantity}
                                      initial={{ scale: 0.8 }}
                                      animate={{ scale: [0.8, 1.25, 1] }}
                                      transition={{ type: "spring", stiffness: 450, damping: 15 }}
                                      className="text-[10px] font-bold text-white font-mono w-4 text-center inline-block"
                                    >
                                      {item.quantity}
                                    </motion.span>
                                    <motion.button
                                      whileTap={{ scale: 0.85 }}
                                      onClick={() => handleIncrementCartItem(item.cartId)}
                                      className="text-neutral-400 hover:text-[#FF6B00] font-black w-4.5 h-4.5 flex items-center justify-center text-[10px] rounded hover:bg-neutral-800 transition-colors cursor-pointer"
                                      title="Adicionar mais um"
                                    >
                                      +
                                    </motion.button>
                                  </div>
                                </div>

                                {/* Customizations text inside cart list item */}
                                {(item.addons.length > 0 || item.removals.length > 0) && (
                                  <div className="pl-10 text-[9px] font-medium leading-relaxed space-y-0.5 text-left border-t border-neutral-900/40 pt-1 border-dashed mt-1">
                                    {item.addons.length > 0 && (
                                      <div className="text-emerald-400">
                                        <span className="font-bold">Adicionais:</span>{" "}
                                        {item.addons.map((a) => `${a.name} (+R$ ${a.price.toFixed(2)})`).join(", ")}
                                      </div>
                                    )}
                                    {item.removals.length > 0 && (
                                      <div className="text-red-400 font-sans">
                                        <span className="font-bold">Inclusões removidas:</span>{" "}
                                        {item.removals.join(", ")}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>

                      <div className="flex items-center justify-between border-t border-neutral-800 pt-2 text-[11px] font-semibold text-neutral-300">
                        <span>Subtotal do Carrinho:</span>
                        <span className={`font-mono font-bold text-xs ${selectedTheme.text}`}>R$ {cartTotal.toFixed(2)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-neutral-400 font-medium text-left">
                      Preencha os dados de entrega / balcão e forma de pagamento para finalizar:
                    </p>

                    {/* Delivery / Takeaway Toggles */}
                    <div className="grid grid-cols-2 gap-2 bg-[#1C1C1E] p-1.5 rounded-xl border border-neutral-800">
                      <button
                        onClick={() => setDeliveryType("delivery")}
                        className={`py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          deliveryType === "delivery"
                            ? "bg-[#FF6B00] text-white"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Entrega
                      </button>
                      <button
                        onClick={() => setDeliveryType("takeaway")}
                        className={`py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          deliveryType === "takeaway"
                            ? "bg-[#FF6B00] text-white"
                            : "text-neutral-400 hover:text-white"
                        }`}
                      >
                        <Store className="w-3.5 h-3.5" />
                        Balcão
                      </button>
                    </div>

                    {/* Customer Inputs */}
                    <div className="space-y-2.5 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1 font-mono">
                          Nome para o Pedido:
                        </label>
                        <input
                          type="text"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1 font-mono">
                          WhatsApp / Telefone:
                        </label>
                        <input
                          type="text"
                          value={userPhone}
                          onChange={(e) => setUserPhone(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#FF6B00] font-mono"
                        />
                      </div>

                      {deliveryType === "delivery" && (
                        <div>
                          <label className="block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mb-1 font-mono">
                            Endereço de Entrega Completo:
                          </label>
                          <input
                            type="text"
                            value={userAddress}
                            onChange={(e) => setUserAddress(e.target.value)}
                            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#FF6B00]"
                          />
                        </div>
                      )}
                    </div>

                    {/* Method Payment Options */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-2 font-mono">
                        Escolha o Método de Pagamento Directo:
                      </p>

                      <div className="grid grid-cols-3 gap-2">
                        {/* Pix Option */}
                        <button
                          onClick={() => setPaymentMethod("pix")}
                          className={`flex flex-col gap-1 items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            paymentMethod === "pix"
                              ? "bg-[#FF6B00]/10 border-[#FF6B00] text-white"
                              : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                          }`}
                        >
                          <Coins className="w-4 h-4 text-[#FF6B00]" />
                          <span className="text-[10px] font-bold">PIX Direto</span>
                          <span className="text-[8px] bg-green-500/10 text-green-400 font-bold px-1 rounded">Automático</span>
                        </button>

                        {/* Card Option */}
                        <button
                          onClick={() => setPaymentMethod("card")}
                          className={`flex flex-col gap-1 items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            paymentMethod === "card"
                              ? "bg-[#FF6B00]/10 border-[#FF6B00] text-white"
                              : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                          }`}
                        >
                          <CreditCard className="w-4 h-4 text-neutral-300" />
                          <span className="text-[10px] font-bold">Cartão</span>
                          <span className="text-[8px] text-neutral-500">Na entrega</span>
                        </button>

                        {/* Cash Option */}
                        <button
                          onClick={() => setPaymentMethod("cash")}
                          className={`flex flex-col gap-1 items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                            paymentMethod === "cash"
                              ? "bg-[#FF6B00]/10 border-[#FF6B00] text-white"
                              : "bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white"
                          }`}
                        >
                          <Coins className="w-4 h-4 text-emerald-400" />
                          <span className="text-[10px] font-bold">Dinheiro</span>
                          <span className="text-[8px] text-neutral-500">Troco</span>
                        </button>
                      </div>

                      {/* Cash Change Conditional Option */}
                      {paymentMethod === "cash" && (
                        <div className="mt-2 text-right">
                          <label className="inline-block text-[9px] font-bold text-neutral-400 uppercase tracking-wider mr-2 font-mono">
                            Precisa de troco para quanto? R$
                          </label>
                          <input
                            type="number"
                            value={cashChange}
                            onChange={(e) => setCashChange(e.target.value)}
                            placeholder="Ex: 100"
                            className="bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-[#FF6B00] w-24 text-center font-mono"
                          />
                        </div>
                      )}
                    </div>

                    {/* Progress To Checkout Step CTA Button */}
                    <button
                      onClick={submitDirectCheckout}
                      className="w-full mt-2 h-11 bg-[#FF6B00] hover:bg-[#ff8c3a] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-[#FF6B00]/10"
                    >
                      Avançar para Checkout Direto
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* 2. Step CHECKOUT (Pix generation & live simulation page) */}
                {checkoutStep === "checkout" && (
                  <div className="flex flex-col gap-4 items-center text-center">
                    <div className="w-full flex justify-between items-center bg-neutral-900 px-3 py-2 rounded-lg border border-neutral-800 mb-1">
                      <span className="text-xs text-neutral-400">Total a pagar:</span>
                      <span className="font-mono text-sm font-bold text-[#FF6B00]">R$ {cartTotal.toFixed(2)}</span>
                    </div>

                    {/* Dynamic Simulated High Contrast QR Code block */}
                    <div className="bg-white p-3 rounded-2xl border-4 border-[#FF6B00] shadow-xl relative overflow-hidden group">
                      {/* Animated scanning line */}
                      <div className="absolute left-0 right-0 h-0.5 bg-green-500 top-1/2 animate-bounce opacity-80" />
                      
                      {/* position patterns of QR */}
                      <svg className="w-32 h-32 text-neutral-800" viewBox="0 0 100 100" fill="currentColor">
                        <path d="M0,0 h25 v25 h-25 z M5,5 h15 v15 h-15 z M10,10 h5 v5 h-5 z" />
                        <path d="M75,0 h25 v25 h-25 z M80,5 h15 v15 h-15 z M85,10 h5 v5 h-5 z" />
                        <path d="M0,75 h25 v25 h-25 z M5,80 h15 v15 h-15 z M10,85 h5 v5 h-5 z" />
                        <path d="M75,75 h10 v10 h-10 z" />
                        <path d="M35,5 h5 v5 h-5 z M45,0 h10 v5 h-10 z M60,10 h5 v10 h-5 z L30,40 h10 v5 h-10 z" />
                        <path d="M5,40 h15 v5 h-15 z M45,35 h5 v15 h-5 z M65,45 h10 v5 h-10 z" />
                        <path d="M30,60 h10 v15 h-10 z M50,65 h5 v5 h-5 z M60,75 h5 v10 h-5 z" />
                        <path d="M80,40 h15 v5 h-15 z M85,55 h5 v10 h-5 z M40,85 h15 v5 h-15 z" />
                        <path d="M45,20 h5 v5 h-5 z M20,20 h10 v5 h-10 z" />
                      </svg>
                    </div>

                    <div className="space-y-1.5 w-full">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1.5 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        Aguardando pagamento automático...
                      </span>

                      <p className="text-xs text-neutral-300 leading-normal max-w-xs mx-auto">
                        A ByLink valida se o Pix caiu na conta da empresa em menos de 3 segundos sem intervention manual!
                      </p>
                    </div>

                    {/* Copy Paste Code input block */}
                    <div className="w-full flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value="00020126440014br.gov.bcb.pix2522bylink.delivery/pay/g8421"
                        className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg p-2 text-[10px] font-mono text-neutral-400 focus:outline-none"
                      />
                      <button
                        onClick={handleCopyPix}
                        className="bg-neutral-800 hover:bg-neutral-700 text-xs py-1.5 px-3.5 rounded-lg font-bold font-mono transition-all border border-neutral-700 flex-shrink-0 cursor-pointer"
                      >
                        {copiedPix ? "Copiado! ✓" : "Copiar"}
                      </button>
                    </div>

                    {/* Simulation Triggers Block */}
                    <div className="w-full pt-3.5 border-t border-neutral-800 space-y-2">
                      <button
                        onClick={simulatePixPayment}
                        className="w-full h-11 bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer shadow-emerald-500/10"
                      >
                        {isPixPaid ? "Confirmado! ✓" : "Simular Pagamento Instantâneo Pix"}
                      </button>
                      
                      <button
                        onClick={() => setCheckoutStep("details")}
                        className="text-neutral-500 hover:text-neutral-300 text-[10px] font-bold uppercase tracking-widest font-mono text-center cursor-pointer transition-colors block mx-auto"
                      >
                        ← Voltar para dados
                      </button>
                    </div>
                  </div>
                )}

                {/* 3. Step RECEIPT TICKET (Virtual Thermal Printer + WhatsApp view) */}
                {checkoutStep === "receipt" && (
                  <div className="flex flex-col gap-4">
                    
                    {/* Visual Success Header */}
                    <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/15 p-3 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                        ✓
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-emerald-400">Pedido Lançado com Sucesso!</p>
                        <p className="text-[10px] text-neutral-400 leading-tight">ByLink Direct Checkout validou a entrada e emitiu as ordens!</p>
                      </div>
                    </div>

                    {/* Visual representation of real thermal ticket (ByLink POS Integration) */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5 font-mono text-left">
                        Cupom de Impressão de Balcão (Visual do Restaurante):
                      </p>
                      
                      {/* Ticket paper effect style */}
                      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 font-mono text-[10px] text-neutral-300 leading-relaxed text-left max-h-[160px] overflow-y-auto">
                        <p className="text-center font-bold text-[#FF6B00]">*** BYLINK AUTOMATION ***</p>
                        <p className="text-center font-mono">LOJA EXEMPLO DELIVERY</p>
                        <p className="text-neutral-500">------------------------------------</p>
                        <p className="font-bold">PEDIDO #BY-7489</p>
                        <p>Data: {new Date().toLocaleDateString("pt-BR")} - {new Date().toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}</p>
                        <p className="text-neutral-500">------------------------------------</p>
                        <p><strong className="text-white">Cliente:</strong> {userName}</p>
                        <p><strong className="text-white">Fone:</strong> {userPhone}</p>
                        <p><strong className="text-white">Modalidade:</strong> {deliveryType === "delivery" ? `ENTREGA (${userAddress})` : "RETIRADA NO BALCÃO"}</p>
                        <p className="text-neutral-500">------------------------------------</p>
                        <p className="font-bold text-white">ITEMS:</p>
                        {cart.map((item) => {
                          const addonsPrice = item.addons.reduce((sum, a) => sum + a.price, 0);
                          const itemPrice = item.product.price + addonsPrice;
                          const itemTotal = itemPrice * item.quantity;
                          return (
                            <div key={item.cartId} className="pl-2 border-b border-neutral-800/30 pb-1 mb-1 last:border-0 last:pb-0">
                              <div className="flex justify-between font-bold">
                                <span>*{item.quantity}x* {item.product.name}</span>
                                <span className="text-white">R$ {itemTotal.toFixed(2)}</span>
                              </div>
                              {item.addons.length > 0 && (
                                <p className="text-emerald-400 pl-4 text-[9px] leading-tight">
                                  + {item.addons.map(a => `${a.name} (+R$${a.price.toFixed(2)})`).join(', ')}
                                </p>
                              )}
                              {item.removals.length > 0 && (
                                <p className="text-red-400 pl-4 text-[9px] leading-tight font-sans">
                                  - {item.removals.join(', ')}
                                </p>
                              )}
                            </div>
                          );
                        })}
                        <p className="text-neutral-500">------------------------------------</p>
                        <p className="flex justify-between font-bold text-white leading-normal">
                          <span>FORMA PAGTO:</span>
                          <span className="text-emerald-400 uppercase">
                            [{paymentMethod === "pix" ? "Pix Confirmado" : paymentMethod === "card" ? "Cartão na entrega" : "Dinheiro"}]
                          </span>
                        </p>
                        {paymentMethod === "cash" && cashChange && (
                          <p className="text-gray-400 text-[9px] pl-2">Troco para: R$ {parseFloat(cashChange).toFixed(2)}</p>
                        )}
                        <p className="text-neutral-500">------------------------------------</p>
                        <p className="flex justify-between font-extrabold text-sm text-[#FF6B00]">
                          <span>TOTAL LIQUIDO:</span>
                          <span>R$ {cartTotal.toFixed(2)}</span>
                        </p>
                        <p className="text-neutral-500">------------------------------------</p>
                        <p className="text-center text-[9px] text-neutral-500">_ByLink Delivery: Taxa 0% de comissão_</p>
                      </div>
                    </div>

                    {/* Live delivery status tracking simulator */}
                    <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4.5 text-left relative overflow-hidden select-none">
                      {/* Ambient header line */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6B00] font-mono leading-none">
                            Rastreamento Ativo
                          </p>
                        </div>
                        <span className="text-[9px] bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-md font-mono text-neutral-400">
                          PEDIDO #BY-7489
                        </span>
                      </div>

                      {/* Animated Dynamic Progress % Bar */}
                      <div className="mb-6">
                        <div className="flex justify-between items-baseline mb-1.5">
                          <span className="text-[10px] text-neutral-400 font-bold font-sans">Status do Preparo</span>
                          <span className="text-xs font-black font-mono text-[#FF6B00]">
                            {simulatedStatus === " cozinha" ? "25%" : simulatedStatus === "preparando" ? "65%" : "100%"}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800/60 p-[1px]">
                          <motion.div
                            initial={{ width: "25%" }}
                            animate={{
                              width: simulatedStatus === " cozinha" ? "25%" : simulatedStatus === "preparando" ? "65%" : "100%"
                            }}
                            transition={{ type: "spring", stiffness: 60, damping: 15 }}
                            className="h-full rounded-full bg-gradient-to-r from-[#FF6B00] via-amber-500 to-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Step-by-Step Vertical Timeline with Connector Bar */}
                      <div className="relative pl-7 space-y-5 font-sans">
                        {/* Connecting Line Tracker Background */}
                        <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-neutral-900 rounded-full" />
                        
                        {/* Connecting Line Tracker Active Highlight */}
                        <motion.div
                          className="absolute left-[11px] top-2 w-[2px] rounded-full bg-[#FF6B00]"
                          animate={{
                            height: simulatedStatus === " cozinha" ? "15%" : simulatedStatus === "preparando" ? "60%" : "95%"
                          }}
                          transition={{ duration: 0.8, ease: "easeInOut" }}
                        />

                        {/* Step 1: Pix Verified (100% completed instantly) */}
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="relative flex gap-3 text-left"
                        >
                          {/* Circle Icon */}
                          <div className="absolute -left-[23px] top-0.5 w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
                            <Check className="w-3.5 h-3.5 stroke-[3px]" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-neutral-200">Pagamento Confirmado</h4>
                              <span className="text-[8px] font-mono font-bold bg-emerald-500/15 text-emerald-400 px-1 py-0.2 rounded">0s</span>
                            </div>
                            <p className="text-[10px] text-neutral-400 leading-normal mt-0.5">
                              O robô de validação ByLink registrou o recebimento instantâneo.
                            </p>
                          </div>
                        </motion.div>

                        {/* Step 2: Print/Acceptance (Active if status is cozinha, Done if preparing or route) */}
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="relative flex gap-3 text-left"
                        >
                          {/* Circle Icon and active status colors */}
                          <div
                            className={`absolute -left-[23px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              simulatedStatus === " cozinha"
                                ? "bg-amber-500/20 border-2 border-amber-400 text-amber-400 ring-4 ring-amber-500/10"
                                : "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400"
                            }`}
                          >
                            {simulatedStatus === " cozinha" ? (
                              <motion.div
                                animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                              >
                                <Clock className="w-3.5 h-3.5" />
                              </motion.div>
                            ) : (
                              <Check className="w-3.5 h-3.5 stroke-[3px]" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className={`text-xs font-bold ${simulatedStatus === " cozinha" ? "text-amber-400" : "text-neutral-200"}`}>
                                Impressão & Aceite na Cozinha
                              </h4>
                              <span className="text-[8px] font-mono font-bold text-neutral-500">[2s]</span>
                            </div>
                            <p className="text-[10px] text-neutral-400 leading-normal mt-0.5">
                              {simulatedStatus === " cozinha"
                                ? "Imprimindo via ByLink POS... Aguardando confirmação do estabelecimento."
                                : "Cupom de comanda térmica gerado! O estabelecimento aceitou e iniciou."}
                            </p>
                          </div>
                        </motion.div>

                        {/* Step 3: Chef Cooking (Active if status is preparando, Done if route, Pending if kitchen) */}
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="relative flex gap-3 text-left"
                        >
                          {/* Circle Icon and active status colors */}
                          <div
                            className={`absolute -left-[23px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              simulatedStatus === " cozinha"
                                ? "bg-neutral-900 border border-neutral-800 text-neutral-600"
                                : simulatedStatus === "preparando"
                                  ? "bg-amber-500/20 border-2 border-amber-450 text-amber-400 ring-4 ring-amber-500/10"
                                  : "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400"
                            }`}
                          >
                            {simulatedStatus === " cozinha" ? (
                              <span className="text-[10px] font-mono font-black">3</span>
                            ) : simulatedStatus === "preparando" ? (
                              <motion.div
                                animate={{ scale: [1, 1.2, 1], y: [0, -1.5, 0] }}
                                transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                              >
                                <Flame className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                              </motion.div>
                            ) : (
                              <Check className="w-3.5 h-3.5 stroke-[3px]" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className={`text-xs font-bold ${
                                simulatedStatus === "preparando"
                                  ? "text-amber-400"
                                  : simulatedStatus === "rota"
                                    ? "text-neutral-200"
                                    : "text-neutral-500"
                              }`}>
                                Chef preparando os lanches
                              </h4>
                              <span className="text-[8px] font-mono font-bold text-neutral-500">[10s]</span>
                            </div>
                            <p className="text-[10px] text-neutral-450 leading-normal mt-0.5">
                              {simulatedStatus === " cozinha"
                                ? "Aguardando envio para a grelha de preparo."
                                : simulatedStatus === "preparando"
                                  ? "Sabor artesanal sendo preparado! Processando hambúrgueres e adicionais na grelha."
                                  : "Lanches cozidos, temperados, selados e devidamente embalados com cuidado."}
                            </p>
                          </div>
                        </motion.div>

                        {/* Step 4: Dispatched / Route of delivery (Active if status is rota, Pending otherwise) */}
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="relative flex gap-3 text-left"
                        >
                          {/* Circle Icon and active status colors */}
                          <div
                            className={`absolute -left-[23px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                              simulatedStatus !== "rota"
                                ? "bg-neutral-900 border border-neutral-800 text-neutral-600"
                                : "bg-emerald-500/25 border-2 border-emerald-400 text-emerald-400 ring-4 ring-emerald-400/10"
                            }`}
                          >
                            {simulatedStatus !== "rota" ? (
                              <span className="text-[10px] font-mono font-black">4</span>
                            ) : deliveryType === "delivery" ? (
                              <motion.div
                                animate={{ x: [-2, 2, -2] }}
                                transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
                              >
                                <Truck className="w-3.5 h-3.5 text-emerald-400" />
                              </motion.div>
                            ) : (
                              <Store className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className={`text-xs font-bold ${simulatedStatus === "rota" ? "text-emerald-400" : "text-neutral-500"}`}>
                                {deliveryType === "delivery" ? "Despachado (Rota de Entrega)" : "Pronto para Retirada"}
                              </h4>
                              <span className="text-[8px] font-mono font-bold text-neutral-500">[20s]</span>
                            </div>
                            <p className="text-[10px] text-neutral-450 leading-normal mt-0.5">
                              {simulatedStatus !== "rota"
                                ? deliveryType === "delivery"
                                  ? "Aguardando o entregador coletar na lanchonete."
                                  : "Será embalado e colocado no balcão de retirada."
                                : deliveryType === "delivery"
                                  ? "Motoqueiro já acelerou! Curta seu pedido quando chegar em alguns minutos."
                                  : "Está prontinho! Apresente o código BY-7489 no balcão para levar para casa."}
                            </p>
                          </div>
                        </motion.div>
                      </div>

                      {/* Spark of automation stats */}
                      <div className="mt-4 pt-3.5 border-t border-neutral-900 flex justify-between items-center text-[9px] font-mono text-neutral-500">
                        <span>Canal: Direct Checkout Web</span>
                        <span className="text-emerald-500 text-right">Taxa zero de comissão</span>
                      </div>
                    </div>

                    {/* Dispatch options to WhatsApp to prove integration */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={dispatchWhatsAppOnly}
                        className="w-full h-11 bg-[#25D366] hover:bg-[#1EBE53] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer shadow-green-500/10 font-sans"
                      >
                        <Send className="w-3.5 h-3.5" />
                        Disparar Cópia para o WhatsApp
                      </button>

                      <button
                        onClick={resetDemo}
                        className="w-full py-1 text-neutral-500 hover:text-[#FF6B00] text-[10px] font-bold uppercase tracking-widest font-mono text-center cursor-pointer transition-colors"
                      >
                        ← Fazer Outro Pedido (Limpar)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        ) : (
          <AdminPanel 
            orders={ordersHistory} 
            onUpdateOrderStatus={handleUpdateOrderStatus} 
            onClearOrders={handleClearOrders} 
            selectedThemeHex={selectedTheme.hex}
            storeName={selectedBanner.title}
          />
        )}
      </div>

      {/* Product Customization Modal */}
      <AnimatePresence>
        {customizingProduct && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-neutral-100 flex flex-col"
            >
              {/* Modal Header */}
              <div className="relative h-40 bg-neutral-100">
                <img
                  src={customizingProduct.image}
                  alt={customizingProduct.name}
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setCustomizingProduct(null)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center font-bold text-sm cursor-pointer border border-white/10 transition-colors"
                >
                  ✕
                </button>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                  <div>
                    <span className="text-[9px] font-bold text-white bg-[#FF6B00] px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                      Personalizar item
                    </span>
                    <h3 className="text-lg font-black text-white font-display mt-1">
                      {customizingProduct.name}
                    </h3>
                  </div>
                </div>
              </div>

              {/* Modal Body Scroll Container */}
              <div className="p-5 space-y-5 max-h-[350px] overflow-y-auto text-left">
                <p className="text-xs text-neutral-600 leading-relaxed font-sans">
                  {customizingProduct.description}
                </p>

                {/* Addons Checklist */}
                {customizingProduct.addons && customizingProduct.addons.length > 0 && (
                  <div className="space-y-2.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6B00] font-mono block">
                      ➕ ADICIONAIS EXTRAS (Opcional)
                    </span>
                    <div className="space-y-1.5">
                      {customizingProduct.addons.map((addon) => {
                        const isChecked = !!selectedAddons[addon.name];
                        return (
                          <div
                            key={addon.name}
                            onClick={() => handleToggleAddon(addon.name)}
                            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? `${selectedTheme.border} ${selectedTheme.bgLight} border-2`
                                : "border-neutral-200 hover:bg-neutral-50"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                  isChecked
                                    ? `${selectedTheme.bg} border-transparent text-white`
                                    : "border-neutral-300 bg-white"
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3px]" />}
                              </div>
                              <span className="text-xs font-bold text-neutral-800">{addon.name}</span>
                            </div>
                            <span className={`text-xs font-mono font-bold ${selectedTheme.text}`}>
                              + R$ {addon.price.toFixed(2)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Removals Checklist */}
                {customizingProduct.removals && customizingProduct.removals.length > 0 && (
                  <div className="space-y-2.5 pt-1.5 border-t border-neutral-100">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 font-mono block">
                      ➖ RETIRAR INGREDIENTES (Opcional)
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {customizingProduct.removals.map((removal) => {
                        const isChecked = !!selectedRemovals[removal];
                        return (
                          <div
                            key={removal}
                            onClick={() => handleToggleRemoval(removal)}
                            className={`flex items-center gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                              isChecked
                                ? "bg-red-50/50 border-red-200 text-red-600"
                                : "border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                isChecked
                                  ? "bg-red-500 border-transparent text-white"
                                  : "border-neutral-300 bg-white"
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3px]" />}
                            </div>
                            <span className="text-xs font-bold font-sans">{removal}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer (Dynamic Interactive Sticky Pricing Preview) */}
              <div className="p-5 bg-neutral-50 border-t border-neutral-200/60 flex items-center justify-between gap-4">
                <div className="text-left font-sans">
                  <span className="text-[9px] font-extrabold uppercase tracking-widest text-neutral-400 font-mono block">
                    Preço Unitário Total:
                  </span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-xs text-neutral-500 line-through font-mono font-medium">
                      R$ {customizingProduct.price.toFixed(2)}
                    </span>
                    <span className="text-lg font-black text-neutral-900 font-mono">
                      R${" "}
                      {(
                        customizingProduct.price +
                        (customizingProduct.addons || []).reduce(
                          (sum, addon) => sum + (selectedAddons[addon.name] ? addon.price : 0),
                          0
                        )
                      ).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  <button
                    onClick={() => setCustomizingProduct(null)}
                    className="h-10 px-4 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-xs text-neutral-800 font-bold cursor-pointer transition-all"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleConfirmCustomization}
                    className={`h-10 px-5 rounded-xl ${selectedTheme.bg} hover:bg-[#111111] text-white text-xs font-bold transition-all shadow-md shadow-neutral-950/10 cursor-pointer`}
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Order Breakdown Modal */}
      <AnimatePresence>
        {selectedHistoryOrder && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in font-sans select-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-neutral-100 flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-neutral-100 relative bg-neutral-50">
                <button
                  onClick={() => setSelectedHistoryOrder(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-neutral-200 hover:bg-neutral-350 text-neutral-850 flex items-center justify-center font-bold text-sm cursor-pointer transition-colors border border-transparent"
                >
                  ✕
                </button>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-extrabold text-white bg-[#FF6B00] px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                      #{selectedHistoryOrder.id}
                    </span>
                    <span className="text-[9px] font-mono font-bold text-neutral-500">
                      {selectedHistoryOrder.date}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-neutral-900 font-display mt-2">
                    Cupom de Venda ByLink
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Confira o detalhamento dos itens e dados de entrega deste pedido.
                  </p>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-5 space-y-4 max-h-[350px] overflow-y-auto text-left">
                {/* Status Segment */}
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full bg-emerald-500 rounded-full opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                    </span>
                    <span className="text-[11px] font-mono font-extrabold uppercase text-neutral-700">
                      Status da Simulação
                    </span>
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-neutral-900 font-sans">
                    {getOrderStatus(selectedHistoryOrder) === " cozinha" ? "🕒 Recebido" : 
                     getOrderStatus(selectedHistoryOrder) === "preparando" ? "🍳 Preparando" : 
                     getOrderStatus(selectedHistoryOrder) === "rota" ? "🛵 Em Rota" : "✓ Entregue"}
                  </span>
                </div>

                {/* Customer Details */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400 font-mono block">
                    👤 DADOS DO CLIENTE
                  </span>
                  <div className="bg-neutral-50 rounded-xl p-3 border border-neutral-200/40 text-xs space-y-1">
                    <p className="font-bold text-neutral-800">
                      Nome: <span className="font-normal text-neutral-600">{selectedHistoryOrder.customerName}</span>
                    </p>
                    {selectedHistoryOrder.phone && (
                      <p className="font-bold text-neutral-800">
                        Contato: <span className="font-normal text-neutral-500 font-mono">{selectedHistoryOrder.phone}</span>
                      </p>
                    )}
                    <p className="font-bold text-neutral-800">
                      Modalidade: <span className="font-normal text-neutral-600">{selectedHistoryOrder.deliveryType === "delivery" ? "🚀 Entrega" : "🏪 Retirada no Balcão"}</span>
                    </p>
                    {selectedHistoryOrder.deliveryType === "delivery" && selectedHistoryOrder.address && (
                      <p className="font-bold text-neutral-800 leading-relaxed">
                        Endereço: <span className="font-normal text-neutral-600">{selectedHistoryOrder.address}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Itemized breakdown */}
                <div className="space-y-2 pt-1 border-t border-neutral-100">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#FF6B00] font-mono block">
                    🍔 ITENS DO PEDIDO
                  </span>
                  <div className="space-y-2.5 p-1">
                    {selectedHistoryOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start text-xs border-b border-dashed border-neutral-100 pb-2 last:border-0 last:pb-0">
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-neutral-900 font-sans leading-tight">
                            <span className="font-mono text-[#FF6B00] pr-1">{item.quantity}x</span> {item.name}
                          </p>
                          {item.addons && item.addons.length > 0 && (
                            <p className="text-emerald-600 text-[10px] font-medium leading-tight mt-0.5 pl-5">
                              + {item.addons.join(", ")}
                            </p>
                          )}
                          {item.removals && item.removals.length > 0 && (
                            <p className="text-red-500 text-[10px] font-medium leading-tight mt-0.5 pl-5 font-sans">
                              - sem {item.removals.join(", ")}
                            </p>
                          )}
                        </div>
                        <span className="font-mono font-bold text-neutral-700 flex-shrink-0">
                          R$ {(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Subtotals & ByLink Zero Tax highlight */}
                <div className="pt-3 border-t border-neutral-100 space-y-1.5">
                  <div className="flex justify-between text-xs text-neutral-500 font-mono">
                    <span>Subtotal:</span>
                    <span>R$ {selectedHistoryOrder.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-neutral-500 font-mono">
                    <span>Taxa de Entrega:</span>
                    <span>{selectedHistoryOrder.deliveryType === "delivery" ? "R$ 0,00 (Grátis)" : "R$ 0,00"}</span>
                  </div>
                  <div className="flex justify-between text-xs text-emerald-600 font-sans font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                    <span>Taxa de Plataforma ByLink:</span>
                    <span>R$ 0,00 (Comissão de 0%!)</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-red-500 font-sans font-bold bg-red-50 p-2 rounded-lg border border-red-100 leading-normal">
                    <span>Economizado nesta venda vs iFood (22%):</span>
                    <span>R$ {(selectedHistoryOrder.totalAmount * 0.22).toFixed(2)}</span>
                  </div>
                  <div className="my-1 border-t border-dashed border-neutral-200" />
                  <div className="flex justify-between text-sm font-black text-neutral-900 font-mono">
                    <span>TOTAL LIQUIDO:</span>
                    <span className={selectedTheme.text}>
                      R$ {selectedHistoryOrder.totalAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-neutral-400 font-mono font-bold">
                    <span>Forma de Pagamento:</span>
                    <span className="uppercase text-neutral-600 font-black">
                      {selectedHistoryOrder.paymentMethod === "pix" ? "💰 Pix Online" : selectedHistoryOrder.paymentMethod === "card" ? "💳 Cartão na Entrega" : "💵 Dinheiro"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-end gap-3 font-sans">
                <button
                  onClick={() => setSelectedHistoryOrder(null)}
                  className="h-10 px-4 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-100 text-xs text-neutral-800 font-bold cursor-pointer transition-all"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    handleReorder(selectedHistoryOrder);
                    setSelectedHistoryOrder(null);
                  }}
                  className={`h-10 px-5 rounded-xl ${selectedTheme.bg} hover:bg-[#111111] text-white text-xs font-bold transition-all shadow-md shadow-neutral-950/10 cursor-pointer flex items-center gap-1.5`}
                >
                  🔄 Repetir Pedido
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success checkout Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-6 right-6 md:right-1/2 md:translate-x-1/2 bg-[#FF6B00] text-white py-3 px-5 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-bounce border border-white/20">
          <div className="bg-white rounded-full p-1 text-[#FF6B00]">
            <Check className="w-4 h-4 stroke-[3px]" />
          </div>
          <div className="text-left">
            <p className="text-xs font-bold uppercase tracking-wider">{toastMessage}</p>
            <p className="text-[10px] opacity-90 font-sans">Sem ByLink, você pagaria até R$ {((cartTotal) * 0.22).toFixed(2)} em taxas nesta venda!</p>
          </div>
        </div>
      )}
    </div>
  );
}
