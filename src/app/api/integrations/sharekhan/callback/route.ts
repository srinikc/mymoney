import { NextRequest, NextResponse } from "next/server"
import { SharekhanClient } from "@/lib/sharekhan"
import { getSession } from "@/lib/auth-helper"
import { setConfig } from "@/lib/get-config"

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl
    const code = url.searchParams.get("code")
    const error = url.searchParams.get("error")

    if (error) {
      return NextResponse.redirect(
        new URL("/settings/integrations?sharekhan=error&message=" + encodeURIComponent(error), url.origin)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/settings/integrations?sharekhan=error&message=No+authorization+code+received", url.origin)
      )
    }

    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.redirect(
        new URL("/settings/integrations?sharekhan=error&message=Please+log+in+to+connect+your+brokerage", url.origin)
      )
    }

    const apiKey = process.env.SHAREKHAN_API_KEY
    const secret = process.env.SHAREKHAN_API_SECRET

    if (!apiKey || !secret) {
      return NextResponse.redirect(
        new URL("/settings/integrations?sharekhan=error&message=API+key+or+secret+not+configured", url.origin)
      )
    }

    const sessionData = await SharekhanClient.generateSession(apiKey, code, secret)

    // Store the access token server-side, scoped to the authenticated user.
    // Never echo the token back to the browser via URL/localStorage.
    await setConfig(Number(session.user.id), "SHAREKHAN_ACCESS_TOKEN", sessionData.accessToken)

    return NextResponse.redirect(
      new URL("/settings/integrations?sharekhan=success", url.origin)
    )
  } catch (error) {
    console.error("Sharekhan callback error:", error)
    const redirectUrl = new URL(
      "/settings/integrations?sharekhan=error&message=Authentication+failed",
      req.nextUrl.origin
    )
    return NextResponse.redirect(redirectUrl)
  }
}