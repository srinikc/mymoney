import { useQuery, keepPreviousData, type UseQueryOptions } from '@tanstack/react-query'
import api from '../api/client'

type QueryOptions<T> = Partial<Pick<UseQueryOptions<T, Error>, 'enabled' | 'staleTime' | 'placeholderData'>>

// Thin React Query wrapper over the authenticated axios client. Queries are
// cached in-memory and keyed by the caller, so repeat navigation paints from
// cache instead of re-hitting the API.
export function useApiQuery<T>(
  queryKey: readonly unknown[],
  url: string,
  options: QueryOptions<T> & { params?: Record<string, unknown> } = {},
) {
  const { params, ...queryOptions } = options
  return useQuery<T, Error>({
    queryKey,
    queryFn: async () => {
      const res = await api.get(url, { params })
      return res.data as T
    },
    ...(queryOptions.placeholderData ? { placeholderData: keepPreviousData as never } : {}),
    ...queryOptions,
  })
}