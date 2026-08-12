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
      const existing = await prisma.account.findFirst({
        where: { userId, provider: "google" },
        select: { id: true, providerAccountId: true },
      })
      if (existing) {
        await prisma.account.update({
          where: { id: existing.id },
          data: { access_token: tokenData.access_token, refresh_token: tokenData.refresh_token ?? undefined, expires_at: Math.floor(Date.now() / 1000) + tokenData.expires_in },
        })
      } else {
        await prisma.account.create({
          data: { userId, provider: "google", providerAccountId: String(userId), type: "oauth", access_token: tokenData.access_token, refresh_token: tokenData.refresh_token || "", expires_at: Math.floor(Date.now() / 1000) + tokenData.expires_in },
        })
      }
    }

    return NextResponse.redirect(new URL("/expenses?gdrive=connected", req.url))
  } catch (error_) {
    console.error("Auth callback error:", error_)
    return NextResponse.redirect(new URL("/expenses?gdrive=error", req.url))
  }
}
