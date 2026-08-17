import { NextResponse } from "next/server"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

export async function GET(req: Request) {
  let userId: number
  try {
    const ctx = await getAuthContext()
    userId = ctx.userId
  } catch (e) {
    return handleAuthError(e)
  }

  try {
    const url = new URL(req.url)
    const scanId = url.searchParams.get("scanId")
    const { prisma } = await import("@/lib/prisma")

    const scan = scanId
      ? await prisma.gmailScan.findUnique({ where: { id: Number(scanId) } })
      : await prisma.gmailScan.findFirst({
          where: { userId, status: { in: ["running", "done", "error"] } },
          orderBy: { createdAt: "desc" },
        })

    if (!scan) return NextResponse.json({ scan: null })

    const transactions =
      typeof scan.transactions === "string"
        ? JSON.parse(scan.transactions)
        : scan.transactions || []

    const journal =
      typeof scan.journal === "string" ? JSON.parse(scan.journal) : scan.journal || {}

    return NextResponse.json({
      scan: {
        id: scan.id,
        status: scan.status,
        totalEmails: scan.totalEmails,
        processed: scan.processed,
        parsed: scan.parsed,
        alreadyImported: scan.alreadyImported,
        error: scan.error,
        createdAt: scan.createdAt,
        updatedAt: scan.updatedAt,
      },
      transactions,
      journal,
    })
  } catch (error) {
    console.error("Gmail scan status error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}