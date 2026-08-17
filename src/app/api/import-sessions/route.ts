import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

const SOURCE_LABELS: Record<string, string> = {
  kcexpenses: "Spreadsheet",
  spreadsheet: "Spreadsheet",
  "gpay-takeout": "GPay",
  "gpay-takeout-zip": "GPay",
  "gpay-takeout-html": "GPay",
  "file-upload": "File",
  bank: "Bank CSV",
  "bank-analysis": "Bank Analysis",
  gmail: "Gmail",
}

export async function GET() {
  let userId: number
  try {
    const ctx = await getAuthContext()
    userId = ctx.userId
  } catch (e) {
    return handleAuthError(e)
  }

  const sessions = await prisma.importSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  })
  return NextResponse.json(sessions.map((s) => ({ ...s, source: SOURCE_LABELS[s.source] || s.source })))
}
