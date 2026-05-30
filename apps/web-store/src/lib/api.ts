import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Anexa o token da conta global do cliente SE existir.
// A vitrine tem muitas chamadas públicas (cardápio, loja, criar pedido, cupom);
// a ausência de token é normal e não deve quebrar nada.
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('customer_accessToken')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Trata 401 de forma defensiva: só tenta refresh quando HAVIA um token de cliente.
// Nunca redireciona globalmente — a vitrine é pública/multi-loja; a UI decide o que mostrar.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const hadToken = typeof window !== 'undefined' && !!localStorage.getItem('customer_accessToken')
    if (error.response?.status === 401 && hadToken && original && !original._retry) {
      original._retry = true
      try {
        const refreshToken = localStorage.getItem('customer_refreshToken')
        if (!refreshToken) throw new Error('No refresh token')
        const { data } = await axios.post(`${API_URL}/customer/refresh`, { refreshToken })
        const newToken = data.data.accessToken
        localStorage.setItem('customer_accessToken', newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        localStorage.removeItem('customer_accessToken')
        localStorage.removeItem('customer_refreshToken')
        // Sem redirect — a tela decide se oferece "entrar".
      }
    }
    return Promise.reject(error)
  },
)
