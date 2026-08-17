import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let userId: number
  try {
    const ctx = await getAuthContext()
    userId = ctx.userId
  } catch (e) {
    return handleAuthError(e)
  }

  const { id } = await params
  try {
    const body = await req.json()
    const mapping = await prisma.vendorMapping.findUnique({ where: { id: Number.parseInt(id) } })
    if (!mapping || mapping.userId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const updated = await prisma.vendorMapping.update({
      where: { id: Number.parseInt(id) },
      data: {
        category: body.expenseType ?? null,
        subCategory: body.subCategory ?? null,
        person: body.person ?? null,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Vendor update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 400 })
  }
}
