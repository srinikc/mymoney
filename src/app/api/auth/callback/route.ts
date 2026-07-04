import { NextResponse } from "next/server"
import { getTokenFromCode } from "@/lib/oauth"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error || !code) {
    return NextResponse.redirect(new URL("/expenses?gdrive=error", req.url))
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3005"
    const redirectUri = `${baseUrl}/api/auth/callback`

    const tokenData = await getTokenFromCode(code, redirectUri)

    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const user = await userRes.json()

    const tokenPayload = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      email: user.email,
      name: user.name,
    }

    const response = NextResponse.redirect(new URL("/expenses?gdrive=connected", req.url))
    response.cookies.set("gdrive_token", encodeURIComponent(JSON.stringify(tokenPayload)), {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    })

    return response
  } catch (error_) {
    console.error("Auth callback error:", error_)
    return NextResponse.redirect(new URL("/expenses?gdrive=error", req.url))
  }
}
