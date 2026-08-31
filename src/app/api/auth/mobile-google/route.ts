import { NextResponse } from "next/server"

const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ")

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3005"
  const redirectUri = `${baseUrl}/api/auth/mobile-google/callback`
  const clientId = process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || ""
  const params = new URLSearchParams({
    client_id: clientId, redirect_uri: redirectUri, response_type: "code",
    scope: SCOPES, access_type: "offline", prompt: "consent",
  })
  return NextResponse.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` })
}
