import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const { ids } = await req.json()
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids array required" }, { status: 400 })
    }
    const result = await prisma.expense.updateMany({
      where: { id: { in: ids.map(Number) } },
      data: { deletedAt: new Date() },
    })
    return NextResponse.json({ success: true, count: result.count })
  } catch (error) {
    console.error("Batch delete error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
