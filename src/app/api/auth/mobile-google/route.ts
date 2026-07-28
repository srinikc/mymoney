import { NextResponse } from "next/server"

export async function GET() {
  try {
    const { getGoogleAuthUrl } = await import("@/lib/oauth")
    const url = new URL("/api/auth/mobile-google/callback", process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005")
    const authUrl = getGoogleAuthUrl(url.toString())

    return NextResponse.json({ url: authUrl })
  } catch (error) {
    console.error("Mobile Google auth error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
