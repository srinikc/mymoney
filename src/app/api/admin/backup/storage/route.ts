import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getAllStorageUsage } from "@/lib/backup"

export const runtime = "nodejs"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if ((session.user as Record<string, unknown>).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const usage = await getAllStorageUsage()
  return NextResponse.json(usage)
}
