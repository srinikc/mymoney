import { NextResponse } from "next/server"
import { getGoogleAuthUrl } from "@/lib/oauth"

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3005"
  const redirectUri = `${baseUrl}/api/auth/callback`
  const url = getGoogleAuthUrl(redirectUri)
  return NextResponse.redirect(url)
}
