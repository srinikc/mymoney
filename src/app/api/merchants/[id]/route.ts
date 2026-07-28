import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const mapping = await prisma.merchantMapping.findUnique({ where: { id: Number.parseInt(id) } })
    if (!mapping) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const updated = await prisma.merchantMapping.update({
      where: { id: Number.parseInt(id) },
      data: {
        expenseType: body.expenseType ?? null,
        subCategory: body.subCategory ?? null,
        person: body.person ?? null,
      },
    })

    // Also update all existing expenses with this merchant key
    const updateData: Record<string, unknown> = {}
    if (body.expenseType) {
      const cat = await prisma.category.findFirst({ where: { name: body.expenseType } })
      if (cat) updateData.categoryId = cat.id
    }
    if (body.subCategory !== undefined) updateData.subCategory = body.subCategory
    if (body.person !== undefined) updateData.person = body.person
    if (Object.keys(updateData).length > 0) {
      await prisma.expense.updateMany({ where: { vendor: mapping.merchantKey }, data: updateData })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Merchant update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 400 })
  }
}
