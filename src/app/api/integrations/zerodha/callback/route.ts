import { NextRequest, NextResponse } from "next/server"
import { ZerodhaClient } from "@/lib/zerodha"
import { getSession } from "@/lib/auth-helper"
import { setConfig } from "@/lib/get-config"

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

    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL("/settings/integrations?zerodha=error&message=Please+log+in+to+connect+your+brokerage", url.origin)
      )
    }

    const apiKey = process.env.ZERODHA_API_KEY
    const secret = process.env.ZERODHA_API_SECRET

    if (!apiKey || !secret) {
      return NextResponse.redirect(
        new URL("/settings/integrations?zerodha=error&message=API+key+or+secret+not+configured", url.origin)
      )
    }

    const sessionData = await ZerodhaClient.generateSession(apiKey, requestToken, secret)

    // Store the access token server-side, scoped to the authenticated user.
    // Never echo the token back to the browser via URL/localStorage.
    await setConfig(Number(session.user.id), "ZERODHA_ACCESS_TOKEN", sessionData.accessToken)

    return NextResponse.redirect(
      new URL("/settings/integrations?zerodha=success", url.origin)
    )
  } catch (error) {
    console.error("Zerodha callback error:", error)
    const redirectUrl = new URL("/settings/integrations?zerodha=error&message=Authentication+failed", req.nextUrl.origin)
    return NextResponse.redirect(redirectUrl)
  }
}