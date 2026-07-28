import { NextRequest, NextResponse } from "next/server"
import { ZerodhaClient } from "@/lib/zerodha"

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl
    const requestToken = url.searchParams.get("request_token")
    const error = url.searchParams.get("error")

    if (error) {
      return NextResponse.redirect(
        new URL("/settings/integrations?zerodha=error&message=" + encodeURIComponent(error), url.origin)
      )
    }

    if (!requestToken) {
      return NextResponse.redirect(
        new URL("/settings/integrations?zerodha=error&message=No+request+token+received", url.origin)
      )
    }

    const apiKey = process.env.ZERODHA_API_KEY
    const secret = process.env.ZERODHA_API_SECRET

    if (!apiKey || !secret) {
      return NextResponse.redirect(
        new URL("/settings/integrations?zerodha=error&message=API+key+or+secret+not+configured", url.origin)
      )
    }

    const session = await ZerodhaClient.generateSession(apiKey, requestToken, secret)

    // In production, store the access token securely (encrypted DB, session, etc.)
    // For now, we'll redirect back to the settings page with the token in the URL
    // The frontend can then store it in localStorage or send to backend for secure storage

    return NextResponse.redirect(
      new URL(
        `/settings/integrations?zerodha=success&access_token=${session.accessToken}&user_id=${session.userId}`,
        url.origin
      )
    )
  } catch (error) {
    console.error("Zerodha callback error:", error)
    const redirectUrl = new URL("/settings/integrations?zerodha=error&message=Authentication+failed", req.nextUrl.origin)
    return NextResponse.redirect(redirectUrl)
  }
}
