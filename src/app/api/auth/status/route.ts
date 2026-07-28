import { NextResponse } from "next/server"
import { getStoredToken } from "@/lib/token-store"

export async function GET() {
  const token = await getStoredToken()
  if (!token) {
    return NextResponse.json({ connected: false })
  }
  return NextResponse.json({
    connected: true,
    email: token.email,
    name: token.name,
  })
}
