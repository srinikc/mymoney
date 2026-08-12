import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/with-auth"
import { prisma } from "@/lib/prisma"
import { tryCreateTakeoutExport } from "@/lib/gpay-takeout-client"

export async function GET() {
  try {
    const { userId } = await getAuthContext()
    const account = await prisma.account.findFirst({
      where: { userId, provider: "google" },
      select: { access_token: true, refresh_token: true },
    })
    if (!account?.access_token) return NextResponse.json({ error: "No Google token found" }, { status: 401 })
    const result = await tryCreateTakeoutExport(account.access_token, account.refresh_token || "")
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }
}
