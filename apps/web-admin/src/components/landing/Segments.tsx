'use client'

import { SEGMENTS } from './data'

// Uma foto grande (o segmento mais comum) + os demais como lista tipográfica.
export default function Segments() {
  const [main, ...rest] = SEGMENTS
  return (
    <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
      <figure className="overflow-hidden rounded-md lg:col-span-6">
        <img
          src={main!.image.replace('w=400', 'w=1000')}
          alt={`Pedido de ${main!.name.toLowerCase()} pronto para entrega`}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="aspect-[4/3] w-full object-cover"
        />
      </figure>
      <div className="lg:col-span-5 lg:col-start-8">
        <h2 className="font-display text-4xl font-semibold leading-[1.05] tracking-[-0.015em] sm:text-5xl">
          Para quem vende comida pelo WhatsApp.
        </h2>
        <ul className="mt-8 border-t border-lp-line">
          {[main!, ...rest].map((s) => (
            <li key={s.name} className="border-b border-lp-line py-3.5 font-display text-2xl">
              {s.name}
            </li>
          ))}
        </ul>
        <p className="mt-6 leading-relaxed text-lp-muted">
          Escolhas obrigatórias (sabor, tamanho, ponto da carne), adicionais pagos e observação por item:
          o cardápio se adapta ao que você vende.
        </p>
      </div>
    </div>
  )
}
