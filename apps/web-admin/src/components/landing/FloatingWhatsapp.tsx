'use client'

import { MessageSquare } from "lucide-react";

export default function FloatingWhatsapp() {
  return (
    <a
      href="https://wa.me/5511999999999?text=Ol%C3%A1%21+Gostaria+de+saber+mais+sobre+o+ByLink+Delivery."
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 group border border-white/10"
      aria-label="Fale conosco no WhatsApp"
    >
      <div className="absolute inset-0 bg-[#25D366] rounded-full animate-ping opacity-25 group-hover:animate-none" />
      <MessageSquare className="w-6 h-6 stroke-[2.3px] relative z-10" />
    </a>
  );
}
