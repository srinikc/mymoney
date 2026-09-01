import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"
import { getTierLimit } from "@/shared/middleware/rate-limit-config"

const SECRET = new TextEncoder().encode(process.env.AUTH_SECRET || "")

// ── Rate Limiter ───────────────────────────────────────────────────────────
// Per-tier in-memory rate limiter using a sliding window.

interface RateLimitEntry {
  count: number
  resetAt: number
}

interface TieredRateLimitEntry extends RateLimitEntry {
  tier: string
}

const rateLimitMap = new Map<string, TieredRateLimitEntry>()

// Cleanup stale entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap) {
    if (entry.resetAt < now) {
      rateLimitMap.delete(key)
    }
  }
}, 60_000)

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1"
  )
}

function getTierFromRequest(req: NextRequest): string {
  // Check mobile user header (set by JWT auth)
  const mobileUser = req.headers.get("x-mobile-user")
  if (mobileUser) {
    try {
      const parsed = JSON.parse(mobileUser)
      if (parsed.tier) return parsed.tier
    } catch { /* ignore parse errors */ }
  }
  // Check session cookie for web users (NextAuth v5 uses __Secure- prefix on HTTPS)
  const cookie = req.cookies.get("__Secure-authjs.session-token")?.value || req.cookies.get("authjs.session-token")?.value
  if (cookie) {
    // For web users, middleware can't easily decode session,
    // but the tier header can be set by page components via middleware rewrite
  }
  return "free"
}

function checkRateLimit(
  req: NextRequest
): { allowed: boolean; retryAfter: number; limit: number; remaining: number } {
  const now = Date.now()
  const ip = getClientIp(req)
  const tier = getTierFromRequest(req)
  const config = getTierLimit(tier)
  const key = `${tier}:${ip}`
  const entry = rateLimitMap.get(key)

  if (!entry || entry.resetAt < now) {
    rateLimitMap.set(key, { count: 1, resetAt: now + config.windowMs, tier })
    return { allowed: true, retryAfter: 0, limit: config.limit, remaining: config.limit - 1 }
  }

  entry.count++
  const remaining = config.limit - entry.count

  if (entry.count > config.limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000)
    return { allowed: false, retryAfter, limit: config.limit, remaining: 0 }
  }

  return { allowed: true, retryAfter: 0, limit: config.limit, remaining }
}


// ── Middleware ─────────────────────────────────────────────────────────────
export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // ── 1. Per-tier rate limiting ─────────────────────────────────────────
  // Rate limiting is a production concern; skip it in dev to avoid
  // throttling HMR, auth-session polling, and multi-request page loads.
  if (process.env.E2E !== "true" && process.env.NODE_ENV === "production") {
    const rateLimitResult = checkRateLimit(req)

    if (!rateLimitResult.allowed) {
      return new NextResponse(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rateLimitResult.retryAfter),
          "X-RateLimit-Limit": String(rateLimitResult.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(
            Math.ceil((Date.now() + rateLimitResult.retryAfter * 1000) / 1000)
          ),
        },
      }
    )
  }
  }

  // ── 2. Public route check ─────────────────────────────────────────────
  // Each entry must state WHY the route is public.
  const publicRoutes: { prefix: string; reason: string }[] = [
    { prefix: "/api/auth", reason: "NextAuth sign-in/callback/CSRF endpoints must be accessible without auth" },
    { prefix: "/api/drive", reason: "Google Drive file upload callback used before user is fully authenticated" },
    { prefix: "/login", reason: "Unauthenticated users must be able to reach the login page" },
    { prefix: "/setup", reason: "First-run admin setup must work before any user account exists" },
  ]
  const isPublic = publicRoutes.some((r) => pathname.startsWith(r.prefix))

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
  // For API routes, let the route handler handle auth
  // But inject mobile JWT session if Bearer token is present
  if (pathname.startsWith("/api/")) {
    const bearer = req.headers.get("authorization")?.replace("Bearer ", "")
    if (bearer) {
      try {
        const { payload } = await jwtVerify(bearer, SECRET)
        const response = NextResponse.next()
        response.headers.set("x-mobile-user", JSON.stringify(payload))
        return response
      } catch {
        // Invalid token — let route return 401
      }
    }
    return NextResponse.next()
  }

  // Protected pages require a session cookie. The cookie value is a JWE
  // encrypted with an HKDF-derived key, so it can't be verified here with
  // jwtVerify; presence check is enough (route handlers 401 as needed).
  // NextAuth v5 uses __Secure- prefix on HTTPS deployments.
  const sessionCookie = req.cookies.get("__Secure-authjs.session-token")?.value || req.cookies.get("authjs.session-token")?.value

  if (!sessionCookie) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
