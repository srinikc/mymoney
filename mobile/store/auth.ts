import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import api, { TOKEN_KEY } from '../api/client'

interface User {
  id: string
  name: string
  email: string
  role: string
  profileId: number
  tier?: string
}

interface AuthStore {
  isLoggedIn: boolean
  isLoading: boolean
  user: User | null
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthStore>((set) => ({
  isLoggedIn: false,
  isLoading: true,
  user: null,
  error: null,

  login: async (email: string, password: string) => {
    set({ error: null })
    try {
      const response = await api.post('/api/auth/mobile-login', { email, password })
      const { token, user } = response.data
      if (!token) throw new Error('No token received')
      await SecureStore.setItemAsync(TOKEN_KEY, token)
      set({ isLoggedIn: true, user: user || null, error: null })
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || 'Login failed'
      set({ error: message })
      throw new Error(message)
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY)
    set({ isLoggedIn: false, user: null, error: null })
  },

  checkAuth: async () => {
    set({ isLoading: true })
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY)
      if (!token) {
        set({ isLoggedIn: false, user: null, isLoading: false })
        return
      }
      const response = await api.get('/api/auth/status')
      set({
        isLoggedIn: true,
        user: response.data?.user || null,
        isLoading: false,
      })
    } catch {
      set({ isLoggedIn: false, user: null, isLoading: false })
    }
  },

  clearError: () => set({ error: null }),
}))
