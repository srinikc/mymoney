// Simple in-memory rate limiter
// For production, replace with Redis-based implementation

export const TIER_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  free: { limit: 100, windowMs: 60_000 },
  pro: { limit: 500, windowMs: 60_000 },
  enterprise: { limit: 2000, windowMs: 60_000 },
}

export const TIER_KEYS = Object.keys(TIER_LIMITS)

const requestCounts = new Map<string, { count: number; resetAt: number }>()

export function getTierLimit(tier?: string | null): { limit: number; windowMs: number } {
  return TIER_LIMITS[tier || "free"] || TIER_LIMITS.free
}

export function checkRateLimit(
  ip: string,
  maxRequests: number = 100,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = Date.now()
  const key = ip

  const entry = requestCounts.get(key)

  if (!entry || now > entry.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetAt: new Date(now + windowMs) }
  }

  entry.count++
  const remaining = maxRequests - entry.count

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: new Date(entry.resetAt) }
  }

  return { allowed: true, remaining, resetAt: new Date(entry.resetAt) }
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of requestCounts) {
    if (now > entry.resetAt) {
      requestCounts.delete(key)
    }
  }
}, 5 * 60 * 1000)
