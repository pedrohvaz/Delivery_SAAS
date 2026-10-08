'use client'

import { MessageCircle } from 'lucide-react'
import { CONTACT } from './data'

export default function FloatingWhatsapp() {
  return (
    <a
      href={CONTACT.whatsappLink}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Falar no WhatsApp ${CONTACT.whatsappDisplay}`}
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-lp-whats text-white shadow-[0_8px_20px_-8px_rgba(21,128,61,0.7)] transition-transform duration-200 hover:-translate-y-0.5"
    >
      <MessageCircle className="h-6 w-6" />
    </a>
  )
}
