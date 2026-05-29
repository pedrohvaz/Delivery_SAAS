'use client'

import { useState } from "react";
import { HistoryOrder } from "./ActiveSimulateDemo";
import { 
  ShoppingBag, 
  Check, 
  TrendingUp, 
  Users, 
  DollarSign, 
  ChevronRight, 
  Layers, 
  Clock, 
  UtensilsCrossed, 
  MapPin, 
  FileText, 
  Bell, 
  Sliders, 
  Tag, 
  Award, 
  Compass, 
  Store, 
  Coffee,
  Truck,
  ExternalLink,
  Plus,
  Trash2,
  ChevronDown,
  Laptop
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PRODUCTS, Product } from "./data";

interface AdminPanelProps {
  orders: HistoryOrder[];
  onUpdateOrderStatus: (id: string, newStatus: " cozinha" | "preparando" | "rota" | "entregue") => void;
  onClearOrders: () => void;
  selectedThemeHex: string;
  storeName: string;
}

export default function AdminPanel({
  orders,
  onUpdateOrderStatus,
  onClearOrders,
  selectedThemeHex: _selectedThemeHex,
  storeName
}: AdminPanelProps) {
  const [activeMenu, setActiveMenu] = useState<string>("Dashboard");
  const [storeOpen, setStoreOpen] = useState<boolean>(true);
  
  // Local reactive states for interactive modules
  const [localProducts, setLocalProducts] = useState<Product[]>(PRODUCTS);
  const [posCart, setPosCart] = useState<{ product: Product; qty: number }[]>([]);
  const [posCustomerName, setPosCustomerName] = useState("");
  const [posCustomerPhone, setPosCustomerPhone] = useState("");
  const [posPaymentMethod, setPosPaymentMethod] = useState<"pix" | "card" | "cash">("pix");
  
  // Custom interactive onboarding checklist (toggles update metrics live)
  const [checklist, setChecklist] = useState({
    shopData: true,
    menuReady: true,
    deliveryArea: false,
    hours: false,
    payments: true 
  });

  const [deliveryAreas, setDeliveryAreas] = useState([
    { id: 1, name: "Centro", fee: 5.00, time: "20-30 min", active: true },
    { id: 2, name: "Zona Sul", fee: 8.00, time: "30-40 min", active: true },
    { id: 3, name: "Zona Norte", fee: 10.00, time: "35-45 min", active: true },
    { id: 4, name: "Zona Oeste", fee: 12.00, time: "40-50 min", active: false },
  ]);

  const [coupons, setCoupons] = useState([
    { code: "BYLINK10", discount: 10, type: "percentage", minOrder: 30.00, active: true },
    { code: "FRETEGRATIS", discount: 0, type: "free_delivery", minOrder: 50.00, active: true },
    { code: "BEMVINDO20", discount: 20, type: "percentage", minOrder: 40.00, active: false }
  ]);

  const [drivers, setDrivers] = useState([
    { id: "M1", name: "Lucas Souza", status: "disponivel", vehicle: "Moto (CG 160)" },
    { id: "M2", name: "Marcio Silva", status: "entregando", vehicle: "Moto (CB 300)" },
    { id: "M3", name: "Julio Cesar", status: "offline", vehicle: "Bicicleta Elétrica" }
  ]);

  const [operatingHours, setOperatingHours] = useState([
    { day: "Segunda-feira", open: "18:00", close: "23:00", status: true },
    { day: "Terça-feira", open: "18:00", close: "23:00", status: true },
    { day: "Quarta-feira", open: "18:00", close: "23:00", status: true },
    { day: "Quinta-feira", open: "18:00", close: "23:30", status: true },
    { day: "Sexta-feira", open: "18:00", close: "00:00", status: true },
    { day: "Sábado", open: "18:00", close: "00:30", status: true },
    { day: "Domingo", open: "18:00", close: "23:00", status: true },
  ]);

  // Toast / confirmation notification
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Compute metrics from the simulator's active order array
  const activeOrders = orders.filter(o => o.status !== "entregue");
  const ordersCount = orders.length;
  const uniqueCustomers = Array.from(new Set(orders.map(o => o.customerName))).length;
  const totalRevenue = orders.reduce((acc, curr) => acc + curr.totalAmount, 0);
  const averageTicket = ordersCount > 0 ? totalRevenue / ordersCount : 0;

  // Checklist helper calculations
  const checklistCompletedCount = Object.values(checklist).filter(v => v).length;
  const progressPercent = (checklistCompletedCount / 5) * 100;

  // Menu items list matching the exact screenshot visual structure and names
  const sidebarItems = [
    { title: "Dashboard", icon: Sliders },
    { title: "Pedidos", icon: ShoppingBag, badge: activeOrders.length > 0 ? activeOrders.length : undefined },
    { title: "Caixa / PDV", icon: DollarSign },
    { title: "Financeiro", icon: TrendingUp },
    { title: "Cardápio", icon: Layers },
    { title: "Estoque", icon: UtensilsCrossed },
    { title: "Áreas de Entrega", icon: MapPin },
    { title: "Horários", icon: Clock },
    { title: "Clientes", icon: Users },
    { title: "Entregadores", icon: Truck },
    { title: "Promoções", icon: Tag },
    { title: "Cupons", icon: FileText },
    { title: "Fidelidade", icon: Award },
    { title: "Sorteios", icon: Compass },
    { title: "Mesas", icon: Coffee },
    { title: "Relatórios", icon: Laptop }
  ];

  // Helper trigger for offline PDV simulated order
  const handlePOSCheckout = () => {
    if (posCart.length === 0) {
      triggerToast("Seu carrinho do PDV está vazio!");
      return;
    }
    const customer = posCustomerName.trim() || "Cliente do Balcão";
    const phone = posCustomerPhone.trim() || "(11) 99999-9999";
    const subtotal = posCart.reduce((sum, item) => sum + item.product.price * item.qty, 0);

    // Create a physical order format
    const newSimulatedOrder: HistoryOrder = {
      id: Math.floor(Math.random() * 9000 + 1000).toString(),
      customerName: customer,
      phone: phone,
      deliveryType: "takeaway",
      paymentMethod: posPaymentMethod,
      totalAmount: subtotal,
      items: posCart.map(item => ({
        name: item.product.name,
        quantity: item.qty,
        price: item.product.price,
        addons: [],
        removals: []
      })),
      date: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      status: " cozinha"
    };

    // Push into the simulator's active collection
    orders.push(newSimulatedOrder);
    onUpdateOrderStatus(newSimulatedOrder.id, " cozinha");

    // Reset PDV fields
    setPosCart([]);
    setPosCustomerName("");
    setPosCustomerPhone("");
    triggerToast(`Pedido #${newSimulatedOrder.id} gerado com sucesso no PDV!`);
  };

  return (
    <div className="bg-[#FAF9F6] min-h-[900px] rounded-3xl border border-neutral-200 overflow-hidden shadow-2xl flex flex-col lg:flex-row text-left font-sans select-none relative">
      
      {/* 🔮 Live Success Toast */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#FF6B00] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-orange-500 font-bold text-xs font-sans uppercase tracking-wider"
          >
            <span className="bg-white/20 p-1.5 rounded-full select-none">⚡</span>
            <span>{successToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📱 LEFT SIDEBAR: PURE LIGHT THEME EXACT MATCH TO SCREENSHOT */}
      <div className="w-full lg:w-64 bg-white text-neutral-700 flex flex-col justify-between shrink-0 border-r border-neutral-200/80">
        <div>
          {/* Logo unit matched directly */}
          <div className="p-4 border-b border-neutral-100 flex items-center gap-3.5 bg-neutral-50/50">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6B00] flex items-center justify-center text-white shadow-lg shadow-[#FF6B00]/15">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div className="truncate">
              <h4 className="font-extrabold text-[#111111] text-xs uppercase tracking-tight leading-tight font-sans">
                {storeName || "pedro teste5"}
              </h4>
              <p className="text-[10px] text-neutral-400 font-mono font-bold mt-0.5">
                /{storeName?.toLowerCase().replace(/\s+/g, "-") || "pedro-teste5"}
              </p>
            </div>
          </div>

          {/* Scrolling Left Menu Bar */}
          <div className="p-3 space-y-1.5 max-h-[580px] overflow-y-auto scrollbar-thin">
            {sidebarItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.title;
              return (
                <button
                  key={idx}
                  onClick={() => setActiveMenu(item.title)}
                  className={`w-full flex items-center justify-between px-3.5 h-[42px] rounded-2xl text-xs font-black font-sans tracking-wide transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#FFF0E6] text-[#FF6B00]"
                      : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4.5 h-4.5 ${isActive ? "text-[#FF6B00]" : "text-neutral-400"}`} />
                    <span className="font-extrabold text-[12px]">{item.title}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="text-[9px] bg-[#FF6B00] text-white font-black font-mono px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Core Commands Matching Footer links of Sidebar */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50/60 space-y-2 font-sans">
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-black uppercase text-neutral-400 tracking-wider">
            Atalhos Administrativos
          </div>
          
          <a
            href="#simulador-demo"
            className="flex items-center justify-between text-xs font-extrabold text-neutral-600 hover:text-[#FF6B00] transition-colors px-2 py-1"
          >
            <span className="flex items-center gap-2">📱 Vitrine da Loja</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          
          <button
            onClick={() => {
              onClearOrders();
              triggerToast("Histórico de pedidos apagado!");
            }}
            className="w-full h-9 flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-200/50 text-red-600 text-[10.5px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpar Pedidos</span>
          </button>
        </div>
      </div>

      {/* 🖥️ MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* UPPER PANEL HEADER */}
        <header className="h-16 bg-white border-b border-neutral-200/80 px-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-2.5">
            <h1 className="text-sm md:text-base font-black text-neutral-900 tracking-tight font-sans uppercase">
              {activeMenu}
            </h1>
            <span className="text-[9.5px] font-mono font-black bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-full text-neutral-400 uppercase tracking-widest">
              ByLink ADM
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Bell notificator */}
            <div className="relative cursor-pointer p-2 hover:bg-neutral-100 rounded-full transition-colors">
              <Bell className="w-4.5 h-4.5 text-neutral-500" />
              {activeOrders.length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FF6B00] rounded-full ring-2 ring-white animate-pulse" />
              )}
            </div>

            {/* Profile badge style matched */}
            <div className="flex items-center gap-2.5 border-l border-neutral-200 pl-4">
              <div className="w-8 h-8 rounded-full bg-[#FF6B00] text-white flex items-center justify-center text-xs font-black shadow-md shadow-[#FF6B00]/15">
                P
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-black text-neutral-800 leading-none">pedro6</p>
                <p className="text-[9px] text-neutral-400 font-mono font-bold mt-1 uppercase">Dono da Loja</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400 hidden sm:block" />
            </div>
          </div>
        </header>

        {/* SCROLLABLE INTERACTIVE MODULE CONTENT AREA */}
        <div className="p-6 overflow-y-auto flex-1 max-h-[830px] space-y-6">

          {/* MODULE SCREEN: 📈 DASHBOARD (Exact Screenshot Design) */}
          {activeMenu === "Dashboard" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              {/* Olá Banner with Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-neutral-200/80 p-5 rounded-3xl shadow-xs">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900 tracking-tight font-sans">
                    Olá, pedro6 👋
                  </h2>
                  <p className="text-xs text-neutral-500 font-sans mt-0.5">
                    Bem-vindo ao painel de <strong className="text-neutral-800 font-bold">{storeName || "pedro teste5"}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-500">Status da loja:</span>
                  <button
                    onClick={() => {
                      setStoreOpen(!storeOpen);
                      triggerToast(storeOpen ? "Sua loja foi FECHADA para novos pedidos." : "Sua loja agora está aberta!");
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all cursor-pointer border ${
                      storeOpen 
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                        : "bg-neutral-100 text-neutral-500 border-neutral-300"
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${storeOpen ? "bg-emerald-500 animate-pulse" : "bg-neutral-400"}`} />
                    <span>{storeOpen ? "Aberta" : "Fechada"}</span>
                  </button>
                </div>
              </div>

              {/* Configure sua Loja Checklist Container */}
              <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm relative">
                <div className="flex justify-between items-start gap-4 pb-4 border-b border-neutral-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[#FF6B00]">⚡</span>
                      <h3 className="font-bold text-sm md:text-base text-neutral-900 tracking-tight font-sans">
                        Configure sua loja
                      </h3>
                    </div>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      {checklistCompletedCount} de 5 etapas concluídas
                    </p>
                  </div>
                  <button 
                    onClick={() => setChecklist({ shopData: true, menuReady: true, deliveryArea: true, hours: true, payments: true })}
                    className="text-xs font-extrabold text-[#FF6B00] hover:underline cursor-pointer"
                  >
                    Concluir tudo
                  </button>
                </div>

                {/* Simulated Orange Progress Bar */}
                <div className="w-full bg-neutral-150 h-2 rounded-full overflow-hidden mt-4">
                  <div 
                    className="bg-[#FF6B00] h-full transition-all duration-500" 
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* List items derived directly from the reference UI image */}
                <div className="space-y-3 mt-5">
                  {/* Step 1 */}
                  <div 
                    onClick={() => {
                      setChecklist(prev => ({ ...prev, shopData: !prev.shopData }));
                      triggerToast("Passo 1 alterado!");
                    }}
                    className="p-3 bg-neutral-50/50 hover:bg-neutral-50 border border-neutral-200/60 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${checklist.shopData ? "bg-orange-50 text-[#FF6B00]" : "bg-neutral-200 text-neutral-400"}`}>
                        <Store className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${checklist.shopData ? "text-neutral-900" : "text-neutral-500"}`}>Dados da loja</p>
                        <p className="text-[10px] text-neutral-400">Preencha nome, endereço e contato comercial</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400 font-bold" />
                  </div>

                  {/* Step 2 */}
                  <div 
                    onClick={() => {
                      setChecklist(prev => ({ ...prev, menuReady: !prev.menuReady }));
                      triggerToast("Passo 2 alterado!");
                    }}
                    className="p-3 bg-neutral-50/50 hover:bg-neutral-50 border border-neutral-200/60 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${checklist.menuReady ? "bg-orange-50 text-[#FF6B00]" : "bg-neutral-200 text-neutral-400"}`}>
                        <UtensilsCrossed className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${checklist.menuReady ? "text-neutral-900" : "text-neutral-500"}`}>Cardápio digital</p>
                        <p className="text-[10px] text-neutral-400">Adicione categorias, produtos e adicionais interativos</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400 font-bold" />
                  </div>

                  {/* Step 3 */}
                  <div 
                    onClick={() => {
                      setChecklist(prev => ({ ...prev, deliveryArea: !prev.deliveryArea }));
                      triggerToast("Passo 3 alterado!");
                    }}
                    className="p-3 bg-neutral-50/50 hover:bg-neutral-50 border border-neutral-200/60 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${checklist.deliveryArea ? "bg-orange-50 text-[#FF6B00]" : "bg-neutral-200 text-neutral-400"}`}>
                        <MapPin className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${checklist.deliveryArea ? "text-neutral-900" : "text-neutral-500"}`}>Áreas de entrega</p>
                        <p className="text-[10px] text-neutral-400">Configure bairros, raios e taxas de frete</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400 font-bold" />
                  </div>

                  {/* Step 4 */}
                  <div 
                    onClick={() => {
                      setChecklist(prev => ({ ...prev, hours: !prev.hours }));
                      triggerToast("Passo 4 alterado!");
                    }}
                    className="p-3 bg-neutral-50/50 hover:bg-neutral-50 border border-[#EBEBEB] rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${checklist.hours ? "bg-orange-50 text-[#FF6B00]" : "bg-neutral-200 text-neutral-400"}`}>
                        <Clock className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${checklist.hours ? "text-neutral-900" : "text-neutral-500"}`}>Horários</p>
                        <p className="text-[10px] text-neutral-400">Defina quando sua loja trabalha e recebe pedidos</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400 font-bold" />
                  </div>

                  {/* Step 5 */}
                  <div 
                    onClick={() => {
                      setChecklist(prev => ({ ...prev, payments: !prev.payments }));
                      triggerToast("Passo 5 alterado!");
                    }}
                    className="p-3 bg-neutral-50/50 hover:bg-neutral-50 border border-neutral-100 rounded-2xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${checklist.payments ? "bg-emerald-50 text-emerald-600" : "bg-neutral-100 text-neutral-400"}`}>
                        <Check className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <p className={`text-xs font-bold ${checklist.payments ? "text-emerald-700 font-extrabold line-through" : "text-neutral-500"}`}>Formas de pagamento</p>
                        <p className="text-[10px] text-neutral-400">Ative PIX, cartão ou dinheiro de forma autônoma</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-400 font-bold" />
                  </div>
                </div>
              </div>

              {/* Responsive 4 Column Metrics Deck */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Metric 1 */}
                <div className="bg-white border border-neutral-250 p-4 rounded-3xl flex items-center gap-4 shadow-xs">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-neutral-900 font-mono tracking-tight">{ordersCount}</h4>
                    <p className="text-[11px] text-[#4B5563] font-extrabold uppercase mt-0.5 tracking-wider font-sans">Pedidos hoje</p>
                  </div>
                </div>

                {/* Metric 2 */}
                <div className="bg-white border border-neutral-250 p-4 rounded-3xl flex items-center gap-4 shadow-xs">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-neutral-900 font-mono tracking-tight">{uniqueCustomers}</h4>
                    <p className="text-[11px] text-[#4B5563] font-extrabold uppercase mt-0.5 tracking-wider font-sans">Novos clientes</p>
                  </div>
                </div>

                {/* Metric 3 */}
                <div className="bg-white border border-neutral-250 p-4 rounded-3xl flex items-center gap-4 shadow-xs">
                  <div className="w-12 h-12 bg-amber-50 text-[#FF6B00] rounded-2xl flex items-center justify-center shrink-0">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-neutral-900 font-mono tracking-tight">R$ {totalRevenue.toFixed(2)}</h4>
                    <p className="text-[11px] text-[#4B5563] font-extrabold uppercase mt-0.5 tracking-wider font-sans">Receita hoje</p>
                  </div>
                </div>

                {/* Metric 4 */}
                <div className="bg-white border border-neutral-250 p-4 rounded-3xl flex items-center gap-4 shadow-xs">
                  <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-neutral-900 font-mono tracking-tight">R$ {averageTicket.toFixed(2)}</h4>
                    <p className="text-[11px] text-[#4B5563] font-extrabold uppercase mt-0.5 tracking-wider font-sans">Ticket médio</p>
                  </div>
                </div>
              </div>

              {/* Bottom Quick widgets */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Active orders pipeline */}
                <div className="xl:col-span-7 bg-white border border-neutral-200 p-5 rounded-3xl shadow-xs space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-neutral-150">
                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800">📋 Controle de Cozinha</h3>
                    <button onClick={() => setActiveMenu("Pedidos")} className="text-xs text-[#FF6B00] font-black hover:underline cursor-pointer">
                      Ver Todos os Pedidos
                    </button>
                  </div>

                  <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                    {activeOrders.length === 0 ? (
                      <div className="py-12 text-center text-neutral-400 text-xs flex flex-col items-center justify-center gap-2">
                        <span>🍳</span>
                        <p className="font-bold text-neutral-700">Sem pedidos pendentes no momento</p>
                        <p className="text-[10px] text-neutral-400">Faca uma compra no painel da Vitrine para testar.</p>
                      </div>
                    ) : (
                      activeOrders.map(item => (
                        <div key={item.id} className="p-3 bg-neutral-50/70 border border-neutral-200 rounded-2xl text-xs space-y-2">
                          <div className="flex justify-between font-sans">
                            <div>
                              <strong className="text-neutral-900">#{item.id} - {item.customerName}</strong>
                              <p className="text-[10px] text-neutral-400 mt-0.5">{item.date} • {item.deliveryType === "delivery" ? "🚀 Entrega" : "🏪 Retirada"}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-extrabold text-[#FF6B00]">R$ {item.totalAmount.toFixed(2)}</span>
                              <span className="block text-[9px] uppercase font-black text-neutral-500 mt-0.5">
                                {item.status.toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-dashed border-neutral-200 pt-2 flex items-center justify-between">
                            <span className="text-[10px] text-neutral-500 font-mono">{item.items.length} itens pedidos</span>
                            <div className="flex gap-2">
                              {item.status === " cozinha" && (
                                <button
                                  onClick={() => {
                                    onUpdateOrderStatus(item.id, "preparando");
                                    triggerToast(`Pedido #${item.id} iniciado na cozinha!`);
                                  }}
                                  className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-orange-500 hover:bg-orange-600 text-white cursor-pointer"
                                >
                                  Começar preparo
                                </button>
                              )}
                              {item.status === "preparando" && (
                                <button
                                  onClick={() => {
                                    onUpdateOrderStatus(item.id, "rota");
                                    triggerToast(`Pedido #${item.id} despachado com motoboy!`);
                                  }}
                                  className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
                                >
                                  Despachar motoboy
                                </button>
                              )}
                              {item.status === "rota" && (
                                <button
                                  onClick={() => {
                                    onUpdateOrderStatus(item.id, "entregue");
                                    triggerToast(`Pedido #${item.id} concluído e entregue!`);
                                  }}
                                  className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                                >
                                  Confirmar Entrega o/
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Savings and summary right panel */}
                <div className="xl:col-span-5 bg-white border border-neutral-200 p-5 rounded-3xl shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-neutral-800 pb-2 border-b border-neutral-150 mb-3">
                      💡 Tarifa de intermediários
                    </h3>
                    <p className="text-xs text-neutral-500 leading-normal">
                      Vender via plataformas de delivery custa absurdos. Com a ByLink, você é dono do seu canal de vendas direta e economiza em todas as vendas!
                    </p>
                  </div>

                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl mt-4 text-xs text-emerald-800 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 leading-none">
                      <span>💰</span> Economia estimada hoje:
                    </p>
                    <p className="text-lg font-black font-mono text-emerald-700 pt-1">
                      R$ {(totalRevenue * 0.22).toFixed(2)}
                    </p>
                    <p className="text-[10px] text-emerald-600">
                      Calculado com base em 22% de taxa que o iFood cobraria sobre seu volume faturado hoje.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* MODULE SCREEN: 📋 PEDIDOS */}
          {activeMenu === "Pedidos" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100 mb-4 font-sans">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">Gestão Unificada de Pedidos</h3>
                    <p className="text-xs text-neutral-400">Gerencie todos os pedidos simulados vindos do cardápio digital.</p>
                  </div>
                  <span className="text-xs bg-[#FFF5F0] text-[#FF6B00] px-3.5 py-1.5 rounded-xl font-bold font-mono">
                    Total: {orders.length} pedidos
                  </span>
                </div>

                {orders.length === 0 ? (
                  <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                    <span className="text-5xl">📦</span>
                    <strong className="text-sm font-bold text-neutral-700">Sem pedidos registrados</strong>
                    <p className="text-xs text-neutral-400 max-w-sm">Adicione pedidos navegando até a vitrine do cliente e realizando checkout fictício.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {orders.map(order => (
                      <div key={order.id} className="border border-neutral-200 hover:border-neutral-300 rounded-2xl p-4 transition-all bg-white relative">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black font-mono">#{order.id}</span>
                              <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${order.deliveryType === "delivery" ? "bg-blue-50 text-blue-700 border border-blue-200" : "bg-purple-50 text-purple-700 border border-purple-200"}`}>
                                {order.deliveryType}
                              </span>
                            </div>
                            <h4 className="text-xs font-bold text-[#111111] mt-1">{order.customerName}</h4>
                            <p className="text-[10px] text-neutral-400 font-mono">{order.phone} • {order.date}</p>
                          </div>
                          <span className="text-xs font-black text-[#FF6B00] font-mono">R$ {order.totalAmount.toFixed(2)}</span>
                        </div>

                        {/* List items */}
                        <div className="bg-neutral-50/50 border border-neutral-100 rounded-xl p-2.5 my-3 text-[11px] font-sans">
                          {order.items.map((it, idx) => (
                            <div key={idx} className="flex justify-between text-neutral-700">
                              <span>{it.quantity}x {it.name}</span>
                              <span className="font-mono text-neutral-500">R$ {it.price.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center border-t border-neutral-100 pt-3 mt-1 font-sans">
                          <span className="text-[10px] text-neutral-400 uppercase font-mono font-bold">
                            Pagamento: {order.paymentMethod.toUpperCase()}
                          </span>

                          <div className="flex gap-1.5">
                            {order.status !== "entregue" ? (
                              <button
                                onClick={() => {
                                  let next: " cozinha" | "preparando" | "rota" | "entregue" = " cozinha";
                                  if (order.status === " cozinha") next = "preparando";
                                  else if (order.status === "preparando") next = "rota";
                                  else if (order.status === "rota") next = "entregue";
                                  onUpdateOrderStatus(order.id, next);
                                  triggerToast(`Pedido #${order.id} atualizado para ${next}!`);
                                }}
                                className="px-2.5 py-1.5 bg-[#FF6B00] text-white text-[10px] font-bold rounded-lg cursor-pointer"
                              >
                                {order.status === " cozinha" && "🍳 Cozinhar"}
                                {order.status === "preparando" && "🛵 Despachar"}
                                {order.status === "rota" && "✓ Entregar"}
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                <span>✓</span> Entregue
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* MODULE SCREEN: 💵 CAIXA / PDV */}
          {activeMenu === "Caixa / PDV" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* Product catalog selection */}
                <div className="xl:col-span-7 bg-white border border-neutral-200 p-5 rounded-3xl shadow-xs space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900 font-sans">Venda Rápida de Balcão (PDV)</h3>
                    <p className="text-xs text-neutral-400">Adicione produtos rapidamente para registrar vendas no balcão.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {localProducts.map(prod => (
                      <div 
                        key={prod.id} 
                        onClick={() => {
                          setPosCart(prev => {
                            const exists = prev.find(item => item.product.id === prod.id);
                            if (exists) {
                              return prev.map(item => item.product.id === prod.id ? { ...item, qty: item.qty + 1 } : item);
                            }
                            return [...prev, { product: prod, qty: 1 }];
                          });
                          triggerToast(`${prod.name} adicionado ao PDV!`);
                        }}
                        className="border border-neutral-200 hover:border-neutral-400 p-3 rounded-2xl flex gap-3 cursor-pointer items-center select-none bg-white font-sans"
                      >
                        <img src={prod.image} alt={prod.name} className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-neutral-900 truncate">{prod.name}</h4>
                          <span className="text-[11px] font-mono text-[#FF6B00] font-black block mt-0.5">R$ {prod.price.toFixed(2)}</span>
                        </div>
                        <span className="w-6 h-6 bg-[#FFF5F0] text-[#FF6B00] rounded-full flex items-center justify-center text-xs font-black">+</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shopping basket & checkout terminal */}
                <div className="xl:col-span-5 bg-white border border-neutral-200 p-5 rounded-3xl shadow-xs flex flex-col justify-between h-fit space-y-4">
                  <div>
                    <div className="flex justify-between items-center pb-2 border-b border-neutral-150 mb-3">
                      <h3 className="text-xs font-black uppercase text-neutral-800">🧺 Carrinho do PDV</h3>
                      <button 
                        onClick={() => setPosCart([])} 
                        className="text-[10px] text-red-500 font-bold hover:underline"
                      >
                        Esvaziar
                      </button>
                    </div>

                    {posCart.length === 0 ? (
                      <div className="py-12 text-center text-neutral-400 text-xs font-sans">
                        Carrinho do PDV vazio. Toque nos produtos ao lado para incluir na venda.
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                        {posCart.map(item => (
                          <div key={item.product.id} className="flex justify-between items-center text-xs text-neutral-700">
                            <div>
                              <span><strong>{item.qty}x</strong> {item.product.name}</span>
                              <p className="text-[9.5px] text-neutral-400">R$ {item.product.price.toFixed(2)} cada</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold">R$ {(item.product.price * item.qty).toFixed(2)}</span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPosCart(prev => prev.filter(i => i.product.id !== item.product.id));
                                }}
                                className="text-red-500 hover:text-red-700"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 pt-3 border-t border-neutral-100 font-sans">
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase tracking-wider text-neutral-500">Nome do cliente</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Pedro Henrique" 
                        value={posCustomerName}
                        onChange={e => setPosCustomerName(e.target.value)}
                        className="w-full text-xs bg-neutral-50 border border-neutral-200 focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00]/20 rounded-xl px-3 h-9 outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="block text-[9px] font-black uppercase text-neutral-500">Forma de Pgto</label>
                        <select 
                          value={posPaymentMethod}
                          onChange={e => setPosPaymentMethod(e.target.value as any)}
                          className="w-full text-xs bg-neutral-50 border border-neutral-200 rounded-xl px-2 h-9 outline-none font-bold"
                        >
                          <option value="pix">PIX</option>
                          <option value="card">Cartão</option>
                          <option value="cash">Dinheiro</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[9px] font-black uppercase text-neutral-500 font-sans">Taxas / Descontos</label>
                        <div className="bg-neutral-100 text-neutral-500 h-9 rounded-xl flex items-center justify-center text-xs font-mono">
                          Sem Taxas (ByLink)
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-100 flex justify-between items-baseline font-sans">
                      <span className="text-xs font-bold text-[#111111]">Total Geral:</span>
                      <span className="text-lg font-black font-mono text-[#FF6B00]">
                        R$ {posCart.reduce((sum, item) => sum + item.product.price * item.qty, 0).toFixed(2)}
                      </span>
                    </div>

                    <button 
                      onClick={handlePOSCheckout}
                      disabled={posCart.length === 0}
                      className="w-full h-10 bg-[#FF6B00] hover:bg-[#E05E00] disabled:bg-neutral-200 disabled:cursor-not-allowed text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>⚡</span>
                      <span>Fechar e Registrar Venda</span>
                    </button>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* MODULE SCREEN: 📈 FINANCEIRO */}
          {activeMenu === "Financeiro" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs space-y-6">
                <div className="border-b pb-3 border-neutral-100">
                  <h3 className="text-base font-bold text-neutral-900">Relatório Financeiro Analítico</h3>
                  <p className="text-xs text-neutral-400">Monitore faturamento líquido, descontos aplicados e economia de taxas.</p>
                </div>

                {/* Graph mockup using fully custom CSS styling */}
                <div className="bg-neutral-50 border border-neutral-150 rounded-2xl p-5 text-left font-sans space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black uppercase tracking-wider text-neutral-400">Faturamento da Semana</span>
                    <span className="text-xs bg-[#FFF5F0] text-[#FF6B00] border border-orange-200 px-3 py-1 rounded-full font-bold">Consolidado</span>
                  </div>

                  <div className="h-44 flex items-end justify-between gap-2.5 pt-6 relative border-b border-dashed border-neutral-250 pb-2">
                    {/* Simulated vertical bar components representation */}
                    {[
                      { day: "Seg", val: 550, height: "h-[40%]" },
                      { day: "Ter", val: 780, height: "h-[55%]" },
                      { day: "Qua", val: 920, height: "h-[65%]" },
                      { day: "Qui", val: 1200, height: "h-[80%]" },
                      { day: "Sex", val: 1600, height: "h-[95%]" },
                      { day: "Sáb", val: 2400, height: "h-[100%]" },
                      { day: "Dom", val: 1850, height: "h-[85%]" }
                    ].map((bar, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end font-sans">
                        <span className="text-[10px] font-mono font-bold text-[#FF6B00]">R$ {bar.val}</span>
                        <div className={`w-full ${bar.height} bg-gradient-to-t from-[#FF6B00] to-orange-400 rounded-lg shadow-xs hover:to-orange-500 transition-all cursor-pointer`} />
                        <span className="text-[10px] font-semibold text-neutral-500 font-mono">{bar.day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#FFF5F0]/80 border border-[#FF6B00]/15 rounded-2xl">
                    <h4 className="text-xs font-black uppercase tracking-wider text-neutral-800">Métodos de Pagamento Usados</h4>
                    <div className="space-y-3 mt-4 text-xs font-sans">
                      <div>
                        <div className="flex justify-between font-bold mb-1">
                          <span>PIX</span>
                          <span className="font-mono">75%</span>
                        </div>
                        <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-[#FF6B00] h-full" style={{ width: "75%" }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between font-bold mb-1">
                          <span>Cartão de Crédito / Débito</span>
                          <span className="font-mono">20%</span>
                        </div>
                        <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full" style={{ width: "20%" }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between font-bold mb-1">
                          <span>Dinheiro</span>
                          <span className="font-mono">5%</span>
                        </div>
                        <div className="w-full bg-neutral-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-amber-500 h-full" style={{ width: "5%" }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase text-emerald-800 leading-none">Canal de Venda Próprio ByLink</h4>
                      <p className="text-[11px] text-neutral-500 mt-2 font-sans">Sua margem de faturamento é superior em 22% porque não paga o imposto abusivo de marketplace.</p>
                    </div>
                    <div className="pt-4 border-t border-emerald-100 flex justify-between items-baseline font-sans">
                      <span className="text-xs font-bold text-[#111111]">Sua margem adicional total:</span>
                      <span className="text-base font-black font-mono text-emerald-700">+ R$ {(totalRevenue * 0.22).toFixed(2)}</span>
                    </div>
                  </div>
                </div>

              </div>
            </motion.div>
          )}

          {/* MODULE SCREEN: 🍔 CARDÁPIO */}
          {activeMenu === "Cardápio" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs">
                <div className="flex justify-between items-center pb-3 border-b border-neutral-100 mb-4 font-sans">
                  <div>
                    <h3 className="text-sm font-black uppercase text-neutral-800">Cardápio Digital Ativo</h3>
                    <p className="text-xs text-neutral-400">Edite preços de pratos simulando alterações reais no applet.</p>
                  </div>
                  <button 
                    onClick={() => {
                      triggerToast("Adicionar prato está indisponível na simulação.");
                    }}
                    className="h-8.5 px-3 bg-[#FF6B00] hover:bg-[#E05E00] text-xs font-bold text-white rounded-xl transition-all cursor-pointer flex items-center gap-1 leading-none font-sans"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Novo Item</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {localProducts.map(prod => (
                    <div key={prod.id} className="border border-neutral-200 rounded-2xl p-4 flex gap-4 hover:shadow-2xs transition-shadow bg-white items-center">
                      <img src={prod.image} alt={prod.name} className="w-16 h-16 rounded-xl object-cover shrink-0" referrerPolicy="no-referrer" />
                      <div className="flex-1 min-w-0 font-sans space-y-1">
                        <h4 className="text-xs font-bold text-[#111111] truncate">{prod.name}</h4>
                        <div className="flex items-center gap-1 pt-1">
                          <span className="text-[10px] text-neutral-400 font-bold">R$</span>
                          <input 
                            type="number" 
                            step="0.1"
                            value={prod.price} 
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setLocalProducts(prev => prev.map(p => p.id === prod.id ? { ...p, price: val } : p));
                            }}
                            className="bg-neutral-50 border border-neutral-250 w-20 text-xs px-2 py-0.5 rounded font-mono font-black text-[#FF6B00] outline-none"
                          />
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <button 
                            onClick={() => {
                              triggerToast(`${prod.name} marcado como Disponível!`);
                            }}
                            className="text-[9.5px] font-extrabold px-2.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 cursor-pointer"
                          >
                            Disponível
                          </button>
                          <span className="text-[9px] uppercase font-mono text-neutral-400 font-semibold">{prod.category}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* MODULE SCREEN: 📦 ESTOQUE */}
          {activeMenu === "Estoque" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs">
                <div className="border-b pb-3 mb-4 font-sans">
                  <h3 className="text-sm font-bold text-neutral-900">Gerenciador de Estoque e Insumos</h3>
                  <p className="text-xs text-neutral-400">Ative o aviso de falta de produtos automaticamente.</p>
                </div>

                <div className="space-y-3 font-sans">
                  {[
                    { name: "Pão Brioche Hambúrguer", qty: 45, status: "ok" },
                    { name: "Massa Artesanal Brotinho", qty: 3, status: "critical" },
                    { name: "Polpa de Açaí Gelado", qty: 120, status: "ok" },
                    { name: "Queijo Cheddar", qty: 8, status: "low" },
                    { name: "Batata Congelada (Palito)", qty: 25, status: "ok" }
                  ].map((item, idx) => (
                    <div key={idx} className="p-3.5 border border-neutral-200 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <strong className="text-neutral-900">{item.name}</strong>
                        <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Estoque simulado em tempo real</p>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold ${item.status === "ok" ? "bg-green-50 text-green-700 border border-green-200" : item.status === "low" ? "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse" : "bg-red-50 text-red-700 border border-red-200 font-extrabold animate-bounce"}`}>
                          {item.qty} un • {item.status.toUpperCase()}
                        </span>
                        <button 
                          onClick={() => triggerToast(`+20 unidades adicionadas ao estoque de ${item.name}`)}
                          className="px-2.5 h-7 bg-neutral-100 hover:bg-neutral-200 text-[10px] text-neutral-700 font-bold border rounded-lg cursor-pointer"
                        >
                          Abastecer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* MODULE SCREEN: ÁREAS DE ENTREGA */}
          {activeMenu === "Áreas de Entrega" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs">
                <div className="border-b pb-3 mb-4 font-sans flex justify-between items-center">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Configuração de Raio de Logística</h3>
                    <p className="text-xs text-neutral-400">Defina suas taxas e tempo estimado de entrega de forma autônoma.</p>
                  </div>
                  <button onClick={() => triggerToast("Novas áreas indisponíveis na simulação.")} className="px-3 h-8 text-xs bg-[#FF6B00] text-white font-bold rounded-lg cursor-pointer">
                    + Adicionar Bairro
                  </button>
                </div>

                <div className="space-y-3 font-sans">
                  {deliveryAreas.map(area => (
                    <div key={area.id} className="p-4 border border-neutral-200 rounded-2xl flex justify-between items-center text-xs">
                      <div className="space-y-1">
                        <strong className="text-[#111111] text-xs">{area.name}</strong>
                        <p className="text-[10px] text-neutral-400">Tempo estimado: {area.time} • Estimador Ativo</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center bg-neutral-50 border rounded-xl px-2 py-1">
                          <span className="text-neutral-400 text-[10px] pr-1.5 font-bold">Taxa: R$</span>
                          <input 
                            type="number" 
                            step="0.50"
                            value={area.fee} 
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setDeliveryAreas(prev => prev.map(a => a.id === area.id ? { ...a, fee: val } : a));
                            }}
                            className="bg-transparent w-14 outline-none font-mono font-black text-neutral-800 text-xs"
                          />
                        </div>

                        <button 
                          onClick={() => {
                            setDeliveryAreas(prev => prev.map(a => a.id === area.id ? { ...a, active: !a.active } : a));
                            triggerToast(`${area.name} status alterado!`);
                          }}
                          className={`px-3 py-1 font-bold rounded-xl text-[10px] cursor-pointer ${area.active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-neutral-100 text-neutral-400"}`}
                        >
                          {area.active ? "Ativa" : "Inativa"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* MODULE SCREEN: CUSTOM OPERATING HOURS */}
          {activeMenu === "Horários" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs">
                <div className="border-b pb-3 mb-4 font-sans">
                  <h3 className="text-sm font-bold text-neutral-900">Agenda de Atendimento ao Cliente</h3>
                  <p className="text-xs text-neutral-400">Configure em quais horários o link do cardápio estará aberto para receber pedidos dos clientes de forma 100% autônoma.</p>
                </div>

                <div className="space-y-2.5 font-sans text-xs">
                  {operatingHours.map((sched, idx) => (
                    <div key={idx} className="p-3 bg-neutral-50/50 border border-neutral-200/50 rounded-2xl flex justify-between items-center">
                      <strong className="text-neutral-800 w-28 uppercase tracking-wide text-[10px]">{sched.day}</strong>
                      
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={sched.open} 
                          onChange={e => {
                            const val = e.target.value;
                            setOperatingHours(p => p.map(o => o.day === sched.day ? { ...o, open: val } : o));
                          }}
                          className="bg-white border rounded px-1.5 py-0.5 text-[11px] font-mono text-center w-14 text-neutral-800"
                        />
                        <span className="text-neutral-400">às</span>
                        <input 
                          type="text" 
                          value={sched.close} 
                          onChange={e => {
                            const val = e.target.value;
                            setOperatingHours(p => p.map(o => o.day === sched.day ? { ...o, close: val } : o));
                          }}
                          className="bg-white border rounded px-1.5 py-0.5 text-[11px] font-mono text-center w-14 text-neutral-800"
                        />
                      </div>

                      <button
                        onClick={() => {
                          setOperatingHours(p => p.map(o => o.day === sched.day ? { ...o, status: !o.status } : o));
                          triggerToast(`${sched.day} alterado!`);
                        }}
                        className={`px-3 py-1 text-[10px] font-black rounded-lg cursor-pointer ${sched.status ? "bg-[#FFF5F0] text-[#FF6B00] border border-orange-200" : "bg-neutral-100 text-neutral-400"}`}
                      >
                        {sched.status ? "OPERANDO" : "FECHADO"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* MODULE SCREEN: CUSTOMERS */}
          {activeMenu === "Clientes" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs">
                <div className="border-b pb-3 mb-4 font-sans">
                  <h3 className="text-sm font-bold text-neutral-900">Base Histórica de Clientes Simulada</h3>
                  <p className="text-xs text-[#9CA3AF]">Os clientes que compram na vitrine são vinculados aqui.</p>
                </div>

                {orders.length === 0 ? (
                  <div className="py-14 text-center text-xs text-neutral-400">Nenhum cliente registrado na base.</div>
                ) : (
                  <div className="space-y-2 font-sans text-xs">
                    {Array.from(new Set(orders.map(o => o.phone))).map((phone, idx) => {
                      const clientOrders = orders.filter(o => o.phone === phone);
                      const name = clientOrders[0]?.customerName || "Cliente do Balcão";
                      const totalPurchased = clientOrders.reduce((sum, item) => sum + item.totalAmount, 0);

                      return (
                        <div key={idx} className="p-3 bg-neutral-50/50 border border-neutral-200/50 rounded-2xl flex justify-between items-center">
                          <div>
                            <strong className="text-neutral-900 text-xs block">{name}</strong>
                            <p className="text-[10px] text-neutral-400 font-mono mt-0.5">{phone}</p>
                          </div>

                          <div className="text-right">
                            <span className="font-mono text-[#FF6B00] font-bold block">R$ {totalPurchased.toFixed(2)} acumulados</span>
                            <span className="text-[9.5px] font-bold text-neutral-500 font-sans">{clientOrders.length} pedidos em andamento / fechados</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* MODULE SCREEN: DELIVERERS */}
          {activeMenu === "Entregadores" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs">
                <div className="border-b pb-3 mb-4 font-sans flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Frota e Escala de Despacho</h3>
                    <p className="text-xs text-neutral-400">Monitore os motoboys vinculados ao restaurante.</p>
                  </div>
                  <button onClick={() => triggerToast("Indisponível no ambiente de testes.")} className="px-3 h-8.5 bg-[#FF6B00] text-xs font-bold text-white rounded-xl cursor-pointer">
                    + Vincular Motoboy
                  </button>
                </div>

                <div className="space-y-3 font-sans">
                  {drivers.map(driver => (
                    <div key={driver.id} className="p-3.5 border border-neutral-200 rounded-2xl flex justify-between items-center text-xs">
                      <div>
                        <strong className="text-[#111111]">{driver.name}</strong>
                        <p className="text-[10px] text-neutral-400 font-mono mt-0.5">ID: {driver.id} • {driver.vehicle}</p>
                      </div>

                      <div className="flex gap-2.5">
                        <select 
                          value={driver.status}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDrivers(prev => prev.map(d => d.id === driver.id ? { ...d, status: val } : d));
                            triggerToast(`${driver.name} agora está ${val}!`);
                          }}
                          className="bg-neutral-50 border border-neutral-200 text-neutral-700 px-2.5 py-1 text-[11px] font-bold rounded-xl outline-none"
                        >
                          <option value="disponivel">Disponível</option>
                          <option value="entregando">Em Entrega</option>
                          <option value="offline">Offline</option>
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* MODULE SCREEN: PROMOÇÕES */}
          {activeMenu === "Promoções" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs">
                <div className="border-b pb-3 mb-4 font-sans">
                  <h3 className="text-sm font-bold text-neutral-900">Campanhas e Promoções Ativas</h3>
                  <p className="text-xs text-neutral-400">Programe descontos em toda a vitrine simulada.</p>
                </div>

                <div className="space-y-3 font-sans text-xs leading-relaxed">
                  <div className="p-4 bg-orange-50/50 border border-orange-200/50 rounded-2xl">
                    <h4 className="font-bold text-neutral-950 flex items-center gap-1.5 text-xs">
                      <span>🎉</span> Desconto Dinâmico Geral (ByLink Premium)
                    </h4>
                    <p className="text-[11.5px] text-neutral-600 mt-1 max-w-sm">
                      Dê desconto para os clientes que comprarem direto no Pix! Aumente o faturamento em até 30% em dias frios de movimento.
                    </p>
                    <button 
                      onClick={() => triggerToast("Desconto Pix ativado com sucesso!")} 
                      className="mt-3 px-3 py-1 text-[10.5px] font-black uppercase text-white bg-[#FF6B00] rounded-lg tracking-wider cursor-pointer"
                    >
                      Ativar Campanha Pix
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* MODULE SCREEN: CUPONS */}
          {activeMenu === "Cupons" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-white border border-neutral-200 rounded-3xl p-5 shadow-xs">
                <div className="border-b pb-3 mb-4 font-sans flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-neutral-900">Cupons de Desconto Autônomos</h3>
                    <p className="text-xs text-neutral-400">Crie códigos e cupons para reengajar clientes.</p>
                  </div>
                  <button 
                    onClick={() => {
                      const codeInput = prompt("Digite o nome do novo cupom:");
                      if (codeInput) {
                        setCoupons(prev => [...prev, { code: codeInput.toUpperCase(), discount: 15, type: "percentage", minOrder: 30, active: true }]);
                        triggerToast(`Cupom ${codeInput.toUpperCase()} criado!`);
                      }
                    }} 
                    className="px-3 h-8.5 bg-[#FF6B00] text-xs font-bold text-white rounded-xl cursor-pointer font-sans"
                  >
                    + Criar Cupom
                  </button>
                </div>

                <div className="space-y-3.5 font-sans">
                  {coupons.map((c, idx) => (
                    <div key={idx} className="p-3.5 border border-neutral-200 rounded-2xl flex justify-between items-center text-xs">
                      <div>
                        <strong className="bg-[#FFF5F0] border border-orange-200/40 text-[#FF6B00] px-2.5 py-1 rounded-md font-mono text-xs font-black inline-block">{c.code}</strong>
                        <p className="text-[10px] text-neutral-400 font-sans mt-2">
                          Min. compra: R$ {c.minOrder.toFixed(2)} • {c.type === "free_delivery" ? "Frete Grátis!" : `${c.discount}% de Desconto`}
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          setCoupons(prev => prev.map((item, i) => i === idx ? { ...item, active: !item.active } : item));
                          triggerToast(`Cupom ${c.code} alterado!`);
                        }}
                        className={`px-3 py-1 font-bold rounded-xl text-[10px] tracking-wide cursor-pointer ${c.active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-neutral-100 text-neutral-400"}`}
                      >
                        {c.active ? "Ativo" : "Pausado"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* FALLBACK INFO FOR SECURED / COMPLEX UTILITIES */}
          {!["Dashboard", "Pedidos", "Caixa / PDV", "Financeiro", "Cardápio", "Estoque", "Áreas de Entrega", "Horários", "Clientes", "Entregadores", "Promoções", "Cupons"].includes(activeMenu) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="bg-white border border-neutral-200/80 p-10 rounded-3xl text-center shadow-xs flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-3xl bg-[#FF6B00]/10 flex items-center justify-center text-3xl mb-4">
                  🔒
                </div>
                <h3 className="text-sm font-black text-neutral-800 uppercase tracking-widest leading-none">
                  Módulo de Simulação {activeMenu}
                </h3>
                <p className="text-xs text-neutral-400 mt-2 max-w-sm font-sans leading-relaxed">
                  O módulo de <strong className="text-[#FF6B00]">{activeMenu}</strong> está pré-configurado com inteligência de ponta para a sua loja fictícia! Todas as métricas gerais são computadas e visíveis no Dashboard geral interativamente.
                </p>
                <button 
                  onClick={() => {
                    setActiveMenu("Dashboard");
                    triggerToast("Voltando para o Dashboard Principal!");
                  }} 
                  className="mt-6 px-5 h-9 bg-[#FF6B00] hover:bg-[#E05E00] text-xs font-bold text-white rounded-xl transition-all shadow-md shadow-[#FF6B00]/10 cursor-pointer"
                >
                  Ir para Dashboard Principal
                </button>
              </div>
            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
}
