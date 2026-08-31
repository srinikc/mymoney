// Phase 3 of scaling_perf.md: rate limiting + abuse protection.
//
// Sliding window rate limiter with per-route configurable limits.
// Backed by Redis when available, falls back to in-process memory so it
// works in any deployment (Vercel, single VPS, dev). The Redis path means
// the limit is consistent across multiple Next.js instances.
//
// Each route gets a `route` (e.g. "auth-signin") and we count requests in
// fixed windows of `windowSeconds` per (route, identityKey). The identityKey
// is the authenticated userId when available, otherwise the client IP.
//
// When limit is exceeded we return 429 with:
//   - Retry-After: seconds until the window resets
//   - X-RateLimit-Limit, -Remaining, -Reset headers (draft IETF standard)

import { cacheGet, cacheSet } from "@/lib/redis"

const MEMORY_STORE = new Map<string, { count: number; resetAt: number }>()
const SWEEP_INTERVAL_MS = 5 * 60 * 1000 // 5 min
let lastSweep = Date.now()

function sweepMemoryStore(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return
  lastSweep = now
  for (const [k, v] of MEMORY_STORE.entries()) {
    if (v.resetAt <= now) MEMORY_STORE.delete(k)
  }
}

export interface RateLimitConfig {
  /** Unique name for this rule (e.g. "auth-signin") */
  name: string
  /** Max requests per window */
  limit: number
  /** Window length in seconds */
  windowSeconds: number
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: number
  retryAfter?: number
}

/**
 * Check + increment the counter for this identity+route. Returns whether the
 * request is allowed and the headers to set.
 */
export async function checkRateLimit(
  identityKey: string,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const key = `rl:${config.name}:${identityKey}`
  const now = Math.floor(Date.now() / 1000)
  const resetAt = now + config.windowSeconds

  // Try Redis first
  const existing = await cacheGet<{ count: number; resetAt: number }>(key)
  if (existing && existing.resetAt > now) {
    if (existing.count >= config.limit) {
      return {
        allowed: false,
        limit: config.limit,
        remaining: 0,
        resetAt: existing.resetAt,
        retryAfter: existing.resetAt - now,
      }
    }
    existing.count += 1
    await cacheSet(key, existing, config.windowSeconds)
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - existing.count,
      resetAt: existing.resetAt,
    }
  }

  // Fallback: in-memory
  sweepMemoryStore(Date.now())
  const mem = MEMORY_STORE.get(key)
  if (mem && mem.resetAt > Math.floor(Date.now() / 1000)) {
    if (mem.count >= config.limit) {
      return {
        allowed: false,
        limit: config.limit,
        remaining: 0,
        resetAt: mem.resetAt,
        retryAfter: mem.resetAt - now,
      }
    }
    mem.count += 1
    return {
      allowed: true,
      limit: config.limit,
      remaining: config.limit - mem.count,
      resetAt: mem.resetAt,
    }
  }

  // First request in window
  const fresh = { count: 1, resetAt }
  MEMORY_STORE.set(key, fresh)
  return { allowed: true, limit: config.limit, remaining: config.limit - 1, resetAt }
}

/**
 * Extract the identity key from a request. Tries authenticated userId first,
 * falls back to IP from x-forwarded-for / x-real-ip.
 */
export function getIdentityKey(req: Request, userId?: number): string {
  if (userId) return `u:${userId}`
  const xff = req.headers.get("x-forwarded-for")
  if (xff) return `ip:${xff.split(",")[0].trim()}`
  const xri = req.headers.get("x-real-ip")
  if (xri) return `ip:${xri}`
  return `ip:unknown`
}

/**
 * Set standard rate-limit response headers. Use on every response (allowed
 * or denied) so clients can see their remaining quota.
 */
export function setRateLimitHeaders(res: Response, result: RateLimitResult): void {
  res.headers.set("X-RateLimit-Limit", String(result.limit))
  res.headers.set("X-RateLimit-Remaining", String(Math.max(0, result.remaining)))
  res.headers.set("X-RateLimit-Reset", String(result.resetAt))
  if (!result.allowed && result.retryAfter) {
    res.headers.set("Retry-After", String(result.retryAfter))
  }
}

// ── Preset limits for common routes ──────────────────────────────────────
//
// Conservative defaults aimed at stopping abuse while not blocking normal
// users. Tune via env vars if you need more or less.

export const LIMITS = {
  authSignin: { name: "auth-signin", limit: 5, windowSeconds: 60 } as RateLimitConfig,         // 5/min per identity
  authSignup: { name: "auth-signup", limit: 3, windowSeconds: 60 } as RateLimitConfig,         // 3/min
  authCallback: { name: "auth-callback", limit: 10, windowSeconds: 60 } as RateLimitConfig,   // 10/min
  importZip: { name: "import-zip", limit: 3, windowSeconds: 60 * 5 } as RateLimitConfig,      // 3 per 5 min
  importCsv: { name: "import-csv", limit: 5, windowSeconds: 60 } as RateLimitConfig,         // 5/min
  importPdf: { name: "import-pdf", limit: 3, windowSeconds: 60 * 5 } as RateLimitConfig,      // 3 per 5 min
  importMappings: { name: "import-mappings", limit: 5, windowSeconds: 60 } as RateLimitConfig, // 5/min
  importBank: { name: "import-bank", limit: 5, windowSeconds: 60 } as RateLimitConfig,       // 5/min
  driveImport: { name: "drive-import", limit: 3, windowSeconds: 60 * 5 } as RateLimitConfig,    // 3 per 5 min
  expenseCreate: { name: "expense-create", limit: 60, windowSeconds: 60 } as RateLimitConfig, // 60/min
  upload: { name: "file-upload", limit: 10, windowSeconds: 60 } as RateLimitConfig,         // 10/min
} as const
