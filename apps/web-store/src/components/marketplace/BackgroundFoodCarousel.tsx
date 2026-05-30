'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'

// Imagens de fundo do hero (food porn). Pode trocar/adicionar URLs à vontade.
const FOOD_IMAGES = [
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1600&q=80', // burger
  'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1600&q=80', // pizza
  'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=1600&q=80', // sushi
  'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=1600&q=80', // açaí
  'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1600&q=80', // drinks
  'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1600&q=80', // massa
]

export function BackgroundFoodCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % FOOD_IMAGES.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-none bg-slate-950">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
          className="absolute inset-0 h-full w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${FOOD_IMAGES[currentIndex]})` }}
        />
      </AnimatePresence>
    </div>
  )
}
