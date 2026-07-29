export const TIER_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  free: { limit: 100, windowMs: 60_000 },
  pro: { limit: 500, windowMs: 60_000 },
  enterprise: { limit: 2000, windowMs: 60_000 },
}

export const TIER_KEYS = Object.keys(TIER_LIMITS)

export function getTierLimit(tier?: string | null): { limit: number; windowMs: number } {
  return TIER_LIMITS[tier || "free"] || TIER_LIMITS.free
}