import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/with-auth"

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ")

export async function GET() {
  let userId: number
  try {
    const ctx = await getAuthContext()
    userId = ctx.userId
  } catch {
    return NextResponse.redirect(new URL("/login", "http://localhost:3005"))
  }
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3005"
  const redirectUri = `${baseUrl}/api/auth/callback`
  const clientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || ""
  const params = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: "code",
    scope: SCOPES, access_type: "offline", prompt: "consent", state: String(userId),
  })
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
}
