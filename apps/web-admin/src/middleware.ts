import { NextResponse, type NextRequest } from 'next/server'

// Visitante que chegou por http:// (sem cadeado, navegador mostra "Não seguro") é
// redirecionado para https://. A Cloudflare informa o protocolo original em
// X-Forwarded-Proto; sem ela (rodando local) nada muda.
export function middleware(request: NextRequest) {
  if (request.headers.get('x-forwarded-proto') === 'http') {
    const host = request.headers.get('host')
    if (host && !host.startsWith('localhost') && !host.startsWith('127.')) {
      const url = new URL(request.nextUrl.pathname + request.nextUrl.search, `https://${host}`)
      return NextResponse.redirect(url, 308)
    }
  }
  return NextResponse.next()
}

export const config = {
  // Não roda para arquivos estáticos do Next
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
