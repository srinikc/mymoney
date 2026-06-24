import { NextResponse } from "next/server"
import { clearToken } from "@/lib/token-store"

export async function GET() {
  await clearToken()
  return NextResponse.redirect(new URL("/expenses", "http://localhost:3005"))
}
