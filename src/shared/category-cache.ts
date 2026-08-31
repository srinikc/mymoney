import { prisma } from "@/lib/prisma"
import { cacheGet, cacheSet, cacheDel } from "@/lib/redis"

// Shared cache for the global Category table.
// Phase 2 of scaling_perf.md B7: moved the process-local `Map` caches to the
// shared cache. Categories are GLOBAL (not per-user), so a single key covers
// all users. Categories change rarely, so the TTL is 1 hour.
//
// Invalidation: call `invalidateCategoryCache()` from any write path that
// creates or updates a Category (admin actions).

const CATEGORY_CACHE_KEY = "cat:all"
const CATEGORY_TTL_SECONDS = 60 * 60 // 1 hour

export interface CachedCategory {
  id: number
  name: string
}

export async function getAllCategoriesCached(): Promise<CachedCategory[]> {
  const cached = await cacheGet<CachedCategory[]>(CATEGORY_CACHE_KEY)
  if (cached) return cached
  const rows = await prisma.category.findMany({
    select: { id: true, name: true },
  })
  await cacheSet(CATEGORY_CACHE_KEY, rows, CATEGORY_TTL_SECONDS)
  return rows
}

export async function getCategoryIdByName(name: string): Promise<number | null> {
  const cats = await getAllCategoriesCached()
  const lower = name.toLowerCase()
  const found = cats.find((c) => c.name.toLowerCase() === lower)
  return found ? found.id : null
}

export async function invalidateCategoryCache() {
  await cacheDel(CATEGORY_CACHE_KEY)
}

// Convenience: get a Map<name, id> from the cached list (replaces the old
// per-process `Map<string, number>`).
export async function getCategoryMap(): Promise<Map<string, number>> {
  const cats = await getAllCategoriesCached()
  return new Map(cats.map((c) => [c.name.toLowerCase(), c.id]))
}
