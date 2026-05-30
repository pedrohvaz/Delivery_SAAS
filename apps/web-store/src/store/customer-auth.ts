import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '@/lib/api'

export interface CustomerAccount {
  id: string
  name: string
  phone: string
  email: string | null
}

interface RegisterData {
  name: string
  phone: string
  email?: string
  password: string
  cpf?: string
}

interface CustomerAuthState {
  account: CustomerAccount | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (identifier: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  fetchMe: () => Promise<void>
}

type CustomerAuthPersisted = Pick<CustomerAuthState, 'account' | 'accessToken' | 'refreshToken' | 'isAuthenticated'>

export const useCustomerAuth = create<CustomerAuthState>()(
  persist<CustomerAuthState, [], [], CustomerAuthPersisted>(
    (set) => ({
      account: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (identifier, password) => {
        const { data } = await api.post('/customer/login', { identifier, password })
        const { accessToken, refreshToken, account } = data.data
        localStorage.setItem('customer_accessToken', accessToken)
        localStorage.setItem('customer_refreshToken', refreshToken)
        set({ account, accessToken, refreshToken, isAuthenticated: true })
      },

      register: async (registerData) => {
        const { data } = await api.post('/customer/register', registerData)
        const { accessToken, refreshToken, account } = data.data
        localStorage.setItem('customer_accessToken', accessToken)
        localStorage.setItem('customer_refreshToken', refreshToken)
        set({ account, accessToken, refreshToken, isAuthenticated: true })
      },

      logout: () => {
        localStorage.removeItem('customer_accessToken')
        localStorage.removeItem('customer_refreshToken')
        set({ account: null, accessToken: null, refreshToken: null, isAuthenticated: false })
      },

      fetchMe: async () => {
        const { data } = await api.get('/customer/me')
        set({ account: data.data.account, isAuthenticated: true })
      },
    }),
    {
      name: 'delivery-customer-auth',
      partialize: (state) => ({
        account: state.account,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
