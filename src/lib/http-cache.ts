import { NextResponse } from "next/server"
import crypto from "crypto"
import { cacheGet, cacheSet } from "@/lib/redis"

// Helper: build a stable ETag from a JSON-serializable body. Adds weak-validity
// prefix (W/) so caches/proxies that don't understand strong validators treat it
// as semantically equal. Use for read-only endpoints where the body is
// deterministic for a given set of inputs.
export function buildETag(payload: unknown): string {
  const json = JSON.stringify(payload, Object.keys(payload as object).sort())
  const hash = crypto.createHash("sha1").update(json).digest("base64")
  return `W/"${hash.slice(0, 16)}"`
}

// Helper: short-circuit a request if the client's If-None-Match matches our ETag.
// Returns a 304 Response if match, or null if the client should get the body.
export function checkIfNoneMatch(req: Request, etag: string): Response | null {
  const inm = req.headers.get("if-none-match")
  if (inm && inm === etag) {
    return new NextResponse(null, { status: 304, headers: { ETag: etag } })
  }
  return null
}

// Helper: short-circuit a request if the client's If-Modified-Since is after our
// lastModified date. Returns a 304 Response if not modified, or null otherwise.
export function checkIfModifiedSince(req: Request, lastModified: Date): Response | null {
  const ims = req.headers.get("if-modified-since")
  if (!ims) return null
  const clientTime = new Date(ims).getTime()
  if (Number.isFinite(clientTime) && lastModified.getTime() <= clientTime) {
    return new NextResponse(null, { status: 304, headers: { "Last-Modified": lastModified.toUTCString() } })
  }
  return null
}

// Add standard cache headers to a response. mode is one of:
//   "public-long"   — stable data (categories, vendor lists), 1 day + SWR 7d
//   "public-short"  — semi-stable (settings, profiles), 30s + SWR 5m
//   "private-short" — per-user ephemeral (insights), no shared cache
//   "no-store"      — sensitive (auth, mutations), never cache
export function withCacheHeaders(res: NextResponse, mode: CacheMode): NextResponse {
  res.headers.set("Vary", "Cookie, Authorization")
  switch (mode) {
    case "public-long":
      res.headers.set("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800")
      break
    case "public-short":
      res.headers.set("Cache-Control", "public, max-age=30, stale-while-revalidate=300")
      break
    case "private-short":
      res.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=300")
      break
    case "no-store":
      res.headers.set("Cache-Control", "no-store")
      break
  }
  return res
}

export type CacheMode = "public-long" | "public-short" | "private-short" | "no-store"

// Read-through cache wrapper that also produces an ETag. Used for read endpoints
// that should be both Redis-cached and HTTP-cacheable.
//
// Usage:
//   const cached = await cachedWithETag(`exp:summary:${profileId}:${filterHash}`, 60, fetcher)
//   if (cached.notModified(req)) return cached.response304
//   return withCacheHeaders(cached.response, "private-short")
export async function cachedWithETag<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<{ data: T; lastModified?: Date }>,
) {
  const hit = await cacheGet<{ data: T; lastModified?: string }>(key)
  if (hit) {
    return {
      data: hit.data,
      lastModified: hit.lastModified ? new Date(hit.lastModified) : undefined,
      etag: buildETag(hit.data),
      fromCache: true,
    }
  }
  const { data, lastModified } = await fetcher()
  await cacheSet(key, { data, lastModified: lastModified?.toISOString() }, ttl)
  return {
    data,
    lastModified,
    etag: buildETag(data),
    fromCache: false,
  }
}
