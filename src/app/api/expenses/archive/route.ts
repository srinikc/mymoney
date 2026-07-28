import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { action, ids } = await req.json()

    if (action === "restore") {
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "ids array required" }, { status: 400 })
      }
      const result = await prisma.expense.updateMany({
        where: { id: { in: ids.map(Number) } },
        data: { deletedAt: null },
      })
      return NextResponse.json({ success: true, count: result.count })
    }

    if (action === "purge") {
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "ids array required" }, { status: 400 })
      }
      const result = await prisma.expense.deleteMany({
        where: { id: { in: ids.map(Number) } },
      })
      return NextResponse.json({ success: true, count: result.count })
    }

    if (action === "purge-expired") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const result = await prisma.expense.deleteMany({
        where: { deletedAt: { lt: sevenDaysAgo } },
      })
      return NextResponse.json({ success: true, count: result.count })
    }

    return NextResponse.json({ error: "invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Archive action error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
