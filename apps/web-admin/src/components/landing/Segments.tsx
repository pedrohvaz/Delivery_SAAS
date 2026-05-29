'use client'

import { SEGMENTS } from "./data";

export default function Segments() {
  return (
    <div id="segmentos" className="scroll-mt-20">
      <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto mb-10">
        <span className="text-xs font-bold uppercase tracking-widest text-[#FF6B00] bg-[#FFF5F0] px-3.5 py-1.5 rounded-full inline-block border border-[#FF6B00]/10 font-mono">
          Feito pra você
        </span>
        <h2 className="text-3xl md:text-4xl font-extrabold font-display tracking-tight text-[#111111] mt-3">
          Sistemas completos adaptados ao seu segmento
        </h2>
        <p className="text-[#555555] text-sm mt-2">
          Não importa se você vende hambúrgueres artesanais ou vinhos finos. A ByLink tem o cardápio e o fluxo ideais para o seu fluxo de entregas.
        </p>
      </div>

      {/* Grid of Segments */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {SEGMENTS.map((seg) => (
          <div
            key={seg.name}
            className="group relative rounded-2xl overflow-hidden border border-[#E0E0E0] shadow-sm bg-white hover:border-[#FF6B00] hover:shadow-md transition-all duration-300 flex flex-col cursor-pointer"
          >
            {/* Aspect Ratio container with Unsplash Cover Image */}
            <div className="aspect-[4/3] w-full bg-neutral-100 overflow-hidden relative">
              <img
                src={seg.image}
                alt={seg.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 pointer-events-none" />
            </div>

            {/* Segment Title */}
            <div className="p-3.5 flex items-center justify-between">
              <span className="font-bold text-xs text-[#111111] font-display">
                {seg.name}
              </span>
              <span className="text-[10px] font-mono font-bold text-[#FF6B00] group-hover:translate-x-1 transition-transform">
                Ver fluxo →
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
