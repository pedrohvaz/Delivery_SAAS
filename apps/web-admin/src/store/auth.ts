import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Store {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  isOpen?: boolean
}

interface AuthState {
  user: User | null
  store: Store | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

interface RegisterData {
  storeName: string
  storeSlug: string
  name: string
  email: string
  password: string
  phone?: string
  planSlug?: string
  successUrl?: string
  cancelUrl?: string
}

type AuthPersisted = Pick<AuthState, 'user' | 'store' | 'accessToken' | 'refreshToken' | 'isAuthenticated'>

export const useAuthStore = create<AuthState>()(
  persist<AuthState, [], [], AuthPersisted>(
    (set) => ({
      user: null,
      store: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password })
        const { accessToken, refreshToken, user, store } = data.data

        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)

        set({ user, store, accessToken, refreshToken, isAuthenticated: true })
      },

      register: async (registerData) => {
        const { data } = await api.post('/auth/register', registerData)
        const { accessToken, refreshToken, user, store } = data.data

        localStorage.setItem('accessToken', accessToken)
        localStorage.setItem('refreshToken', refreshToken)

        set({ user, store, accessToken, refreshToken, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        set({ user: null, store: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },

      fetchMe: async () => {
        const { data } = await api.get('/auth/me')
        set({ user: data.data.user, store: data.data.store, isAuthenticated: true })
      },
    }),
    {
      name: 'delivery-auth',
      partialize: (state) => ({
        user: state.user,
        store: state.store,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
