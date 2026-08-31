import { NextResponse } from "next/server"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

export const maxDuration = 60

const STALE_MS = 5 * 60 * 1000

export async function POST(req: Request) {
  let userId: number
  let profileId: number
  try {
    const ctx = await getAuthContext()
    userId = ctx.userId
    profileId = ctx.profileId
  } catch (e) {
    return handleAuthError(e)
  }

  try {
    const { prisma } = await import("@/lib/prisma")
    const { range, from, to } = await req.json().catch(() => ({}))

    // Reuse an in-progress scan so we never start a duplicate — unless the
    // previous one is stale (e.g. the server restarted mid-scan).
    const existing = await prisma.gmailScan.findFirst({
      where: { userId, status: "running" },
      orderBy: { createdAt: "desc" },
      select: { id: true, updatedAt: true },
    })
    if (existing) {
      const stale = Date.now() - new Date(existing.updatedAt).getTime() > STALE_MS
      if (!stale) {
        return NextResponse.json({ scanId: existing.id, resumed: true })
      }
      await prisma.gmailScan.update({
        where: { id: existing.id },
        data: { status: "error", error: "Scan expired (server restarted?)" },
      })
    }

    const scan = await prisma.gmailScan.create({
      data: { userId, status: "running" },
      select: { id: true },
    })

    // Fire-and-forget background scan. The user can navigate away;
    // progress is tracked via /api/gmail/scan/status.
    const { runGmailScan } = await import("@/lib/gmail-scan")
    void runGmailScan(scan.id, userId, profileId, { range, from, to })

    return NextResponse.json({ scanId: scan.id, resumed: false })
  } catch (error) {
    console.error("Gmail scan error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}