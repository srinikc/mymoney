import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

const TOKEN_KEY = 'mymoney-session-token'

// Use dev URL in development, production URL when building for store
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3005'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
})

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY)
  if (token) {
    config.headers.Cookie = `authjs.session-token=${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync(TOKEN_KEY)
    }
    return Promise.reject(error)
  }
)

export { TOKEN_KEY, BASE_URL }
export default api
