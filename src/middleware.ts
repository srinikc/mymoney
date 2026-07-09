import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// ── Rate Limiter ───────────────────────────────────────────────────────────
// Simple in-memory rate limiter using a sliding window.

interface RateLimitEntry {
  count: number
  resetAt: number
}

const rateLimitMap = new Map<string, RateLimitEntry>()

// Cleanup stale entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (entry.resetAt < now) {
      rateLimitMap.delete(key)
    }
  }
}, 60_000)

function getRateLimitKey(req: NextRequest, prefix: string): string {
  // Use X-Forwarded-For, then X-Real-IP, then fallback to local
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  return `${prefix}:${ip}`
}

function checkRateLimit(
  req: NextRequest,
  prefix: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfter: number } {
  const now = Date.now()
  const key = getRateLimitKey(req, prefix)
  const entry = rateLimitMap.get(key)

  if (!entry || entry.resetAt < now) {
    // New window
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfter: 0 }
  }

  entry.count++
  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }

  return { allowed: true, retryAfter: 0 }
}

// ── Rate limit configurations ──────────────────────────────────────────────
interface RateLimitConfig {
  limit: number
  windowMs: number
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  api: { limit: 500, windowMs: 60_000 },       // 500 req/min for API
  auth: { limit: 50, windowMs: 60_000 },        // 50 req/min for auth
  default: { limit: 200, windowMs: 60_000 },    // 200 req/min for other routes
}

// ── Admin / Manager route patterns ─────────────────────────────────────────
const ADMIN_PREFIX = "/admin"
const MANAGER_PREFIX = "/manager"
const API_PREFIX = "/api"
const AUTH_PREFIX = "/api/auth"
const AUDIT_LOG_PREFIX = "/audit-log"

// ── Middleware ─────────────────────────────────────────────────────────────
export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── 1. Rate limiting ──────────────────────────────────────────────────
  if (process.env.E2E !== "true") {
    let rateLimitConfig = RATE_LIMITS.default
    if (pathname.startsWith(API_PREFIX)) {
      rateLimitConfig = pathname.startsWith(AUTH_PREFIX)
        ? RATE_LIMITS.auth
        : RATE_LIMITS.api
    }

    const rateLimitResult = checkRateLimit(
      req,
      "rl",
      rateLimitConfig.limit,
      rateLimitConfig.windowMs
    )

    if (!rateLimitResult.allowed) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rateLimitResult.retryAfter),
          "X-RateLimit-Limit": String(rateLimitConfig.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(
            Math.ceil((Date.now() + rateLimitConfig.windowMs) / 1000)
          ),
        },
      }
    )
  }
  }

  // ── 2. Public route check ─────────────────────────────────────────────
  const publicRoutes = ["/api/auth", "/api/drive", "/login", "/"]
  const isPublic = publicRoutes.some((r) => pathname.startsWith(r))

  // Static assets and images are always public
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/manifest.json") ||
    pathname.startsWith("/sw.js")
  ) {
    return NextResponse.next()
  }

  if (isPublic) return NextResponse.next()

  // ── 3. Authentication check ───────────────────────────────────────────
  const sessionCookie = req.cookies.get("authjs.session-token")?.value
  
  // For API routes, let the route handler handle auth (returns 401 JSON)
  if (pathname.startsWith("/api/")) {
    return NextResponse.next()
  }

  // Protected pages require a session cookie
  if (!sessionCookie) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return Response.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
