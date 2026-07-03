import { NextResponse } from "next/server"
import { getTokenFromCode } from "@/lib/oauth"
import { storeToken } from "@/lib/token-store"

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

    await storeToken({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      email: user.email,
      name: user.name,
    })

    return NextResponse.redirect(new URL("/expenses?gdrive=connected", req.url))
  } catch (error_) {
    console.error("Auth callback error:", error_)
    return NextResponse.redirect(new URL("/expenses?gdrive=error", req.url))
  }
}
