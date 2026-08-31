import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/with-auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const { userId } = await getAuthContext()
    await prisma.account.deleteMany({ where: { userId, provider: "google" } })
  } catch { /* ignore */ }
  return NextResponse.redirect(new URL("/expenses", "http://localhost:3005"))
}
