import type { Metadata } from 'next'
import { Inter, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space-grotesk' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' })

export const metadata: Metadata = {
  title: 'ByLink — Cardápio digital e pedidos no WhatsApp, sem comissão',
  description: 'Cardápio com o seu link, atendente automático no WhatsApp e tela de cozinha. Mensalidade fixa a partir de R$ 0 e nenhuma comissão por pedido.',
}

const THEME_BOOT = `try{if(location.pathname.indexOf('/dashboard')===0){var c=localStorage.getItem('bylink:primaryColor');var m=/^#?([0-9a-f]{6})$/i.exec(c||'');if(m){var n=parseInt(m[1],16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255,x=Math.max(r,g,b),y=Math.min(r,g,b),h=0,s=0,l=(x+y)/2;if(x!==y){var d=x-y;s=l>.5?d/(2-x-y):d/(x+y);h=x===r?((g-b)/d+(g<b?6:0))/6:x===g?((b-r)/d+2)/6:((r-g)/d+4)/6}var v=Math.round(h*360)+' '+Math.round(s*100)+'% '+Math.round(l*100)+'%',st=document.documentElement.style;st.setProperty('--primary',v);st.setProperty('--ring',v);var f=function(c){c/=255;return c<=.03928?c/12.92:Math.pow((c+.055)/1.055,2.4)};st.setProperty('--primary-foreground',(.2126*f(n>>16&255)+.7152*f(n>>8&255)+.0722*f(n&255))>.45?'222 47% 11%':'0 0% 100%')}}}catch(e){}`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Cor da loja (salva no último acesso) aplicada antes de desenhar o painel: evita piscar laranja */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} ${inter.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
