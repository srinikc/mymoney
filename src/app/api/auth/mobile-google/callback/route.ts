import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import crypto from "node:crypto"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const token = url.searchParams.get("token")

    if (token) {
      // Token already provided by NextAuth callback — redirect to app
      return NextResponse.redirect(`mymoney://auth?token=${token}`)
    }

    // No token — redirect to web
    return NextResponse.redirect(new URL("/login", url.origin).toString())
  } catch {
    return NextResponse.redirect(new URL("/login", req.url).toString())
  }
}
