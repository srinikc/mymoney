import { NextRequest, NextResponse } from "next/server"
import { SharekhanClient } from "@/lib/sharekhan"

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

    const apiKey = process.env.SHAREKHAN_API_KEY
    const secret = process.env.SHAREKHAN_API_SECRET

    if (!apiKey || !secret) {
      return NextResponse.redirect(
        new URL("/settings/integrations?sharekhan=error&message=API+key+or+secret+not+configured", url.origin)
      )
    }

    const session = await SharekhanClient.generateSession(apiKey, code, secret)

    return NextResponse.redirect(
      new URL(
        `/settings/integrations?sharekhan=success&access_token=${session.accessToken}&user_id=${session.userId}`,
        url.origin
      )
    )
  } catch (error) {
    console.error("Sharekhan callback error:", error)
    const redirectUrl = new URL(
      "/settings/integrations?sharekhan=error&message=" + encodeURIComponent(String(error)),
      req.nextUrl.origin
    )
    return NextResponse.redirect(redirectUrl)
  }
}
