export const TIER_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  free: { limit: 100, windowMs: 60_000 },
  pro: { limit: 500, windowMs: 60_000 },
  enterprise: { limit: 2000, windowMs: 60_000 },
}

export const ROUTE_LIMITS: Record<string, { maxRequests: number; windowSeconds: number }> = {
  "/api/auth/signin": { maxRequests: 5, windowSeconds: 60 },
  "/api/auth/callback/credentials": { maxRequests: 5, windowSeconds: 60 },
  "/api/auth/csrf": { maxRequests: 10, windowSeconds: 60 },
  "/api/import": { maxRequests: 5, windowSeconds: 300 },
  "/api/import/bank-csv": { maxRequests: 5, windowSeconds: 300 },
  "/api/import/kcexpenses": { maxRequests: 5, windowSeconds: 300 },
  "/api/drive/import": { maxRequests: 5, windowSeconds: 300 },
  "/api/chat": { maxRequests: 20, windowSeconds: 60 },
  "/api/chat/stream": { maxRequests: 20, windowSeconds: 60 },
  "/api/expenses/auto-categorize": { maxRequests: 10, windowSeconds: 60 },
}

export const TIER_KEYS = Object.keys(TIER_LIMITS)

export function getTierLimit(tier?: string | null): { limit: number; windowMs: number } {
  return TIER_LIMITS[tier || "free"] || TIER_LIMITS.free
}