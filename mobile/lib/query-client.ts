import { QueryClient } from '@tanstack/react-query'

// Memory-only cache (never persisted to disk). Financial data is cleared on
// logout via queryClient.clear() in store/auth.ts — mirroring the web app.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
})