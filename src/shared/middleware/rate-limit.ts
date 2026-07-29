import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"

export { TIER_LIMITS, TIER_KEYS, getTierLimit } from "./rate-limit-config"

interface RateEntry {
  count: number
  resetAt: number
}

const STORE_PATH = join(process.cwd(), "data", "rate-limit.json")

function readStore(): Record<string, RateEntry> {
  try {
    if (!existsSync(STORE_PATH)) return {}
    return JSON.parse(readFileSync(STORE_PATH, "utf8"))
  } catch { return {} }
}

function writeStore(data: Record<string, RateEntry>): void {
  try {
    mkdirSync(join(process.cwd(), "data"), { recursive: true })
    writeFileSync(STORE_PATH, JSON.stringify(data, null, 2))
  } catch { /* best effort */ }
}

let cache: Record<string, RateEntry> = readStore()
let dirty = false

setInterval(() => {
  if (dirty) {
    writeStore(cache)
    dirty = false
  }
}, 10_000)

setInterval(() => {
  const now = Date.now()
  let changed = false
  for (const [key, entry] of Object.entries(cache)) {
    if (now > entry.resetAt) {
      delete cache[key]
      changed = true
    }
  }
  if (changed) dirty = true
}, 5 * 60 * 1000)

export function checkRateLimit(
  ip: string,
  maxRequests: number = 100,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = Date.now()
  const key = ip

  const entry = cache[key]

  if (!entry || now > entry.resetAt) {
    cache[key] = { count: 1, resetAt: now + windowMs }
    dirty = true
    return { allowed: true, remaining: maxRequests - 1, resetAt: new Date(now + windowMs) }
  }

  entry.count++
  dirty = true
  const remaining = maxRequests - entry.count

  if (entry.count > maxRequests) {
    return { allowed: false, remaining: 0, resetAt: new Date(entry.resetAt) }
  }

  return { allowed: true, remaining, resetAt: new Date(entry.resetAt) }
}

export function resetRateLimiter(): void {
  cache = {}
  dirty = true
}