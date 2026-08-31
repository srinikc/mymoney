import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const userId = Number(searchParams.get("state")) || 0

  if (error || !code) {
    return NextResponse.redirect(new URL("/expenses?gdrive=error", req.url))
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3005"
    const redirectUri = `${baseUrl}/api/auth/callback`
    const clientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || ""
    const clientSecret = process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || ""

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
    })
    if (!tokenRes.ok) throw new Error("Token exchange failed")
    const tokenData = await tokenRes.json()

    if (userId) {
      // Fetch the real Google account id so we upsert against the account the
      // user actually logs in with (which may already exist via NextAuth).
      let googleId: string | null = null
      try {
        const infoRes = await fetch("https://www.googleapis.com/oauth2/v1/userinfo?alt=json", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        })
        if (infoRes.ok) {
          const info = await infoRes.json()
          googleId = String(info.id || "")
        }
      } catch {
        // fall back to userId-based upsert
      }

      const existing = await prisma.account.findFirst({
        where: {
          userId,
          provider: "google",
          ...(googleId ? { providerAccountId: googleId } : {}),
        },
        select: { id: true },
      })

      if (existing) {
        await prisma.account.update({
          where: { id: existing.id },
          data: { access_token: tokenData.access_token, refresh_token: tokenData.refresh_token ?? undefined, expires_at: Math.floor(Date.now() / 1000) + tokenData.expires_in },
        })
      } else {
        await prisma.account.create({
          data: { userId, provider: "google", providerAccountId: googleId || String(userId), type: "oauth", access_token: tokenData.access_token, refresh_token: tokenData.refresh_token || "", expires_at: Math.floor(Date.now() / 1000) + tokenData.expires_in },
        })
      }

      // Remove stale google accounts for this user that we didn't just refresh
      // (e.g. old tokens from a different OAuth client with no refresh token).
      if (googleId) {
        await prisma.account.deleteMany({
          where: { userId, provider: "google", NOT: { providerAccountId: googleId } },
        })
      }
    }

    return NextResponse.redirect(new URL("/expenses?gdrive=connected", req.url))
  } catch (error_) {
    console.error("Auth callback error:", error_)
    return NextResponse.redirect(new URL("/expenses?gdrive=error", req.url))
  }
}
