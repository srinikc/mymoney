import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateBody } from "@/shared/validate"
import { MerchantBatchSchema } from "@/shared/validation"
import { resetMappingCache } from "@/shared/merchant-mapping"

export async function POST(req: Request) {
  try {
    const { data: body, error } = await validateBody(req, MerchantBatchSchema)
    if (error) return error
    const { mappings } = body

    let created = 0
    let updated = 0

    for (const m of mappings) {
      const key = m.merchantKey.toLowerCase().trim()
      if (!key) continue

      const expenseType = m.expenseType || ""
      const subCategory = m.subCategory || ""
      const person = m.person || ""

      const existing = await prisma.merchantMapping.findUnique({ where: { merchantKey: key } })
      if (existing) {
        await prisma.merchantMapping.update({
          where: { merchantKey: key },
          data: { expenseType, subCategory, person, source: "user_review" },
        })
        // Also update all existing expenses with this vendor
        const updateData: Record<string, unknown> = {}
        if (m.expenseType) {
          const cat = await prisma.category.findFirst({ where: { name: expenseType } })
          if (cat) updateData.categoryId = cat.id
        }
        if (m.subCategory) updateData.subCategory = subCategory
        if (m.person) updateData.person = person
        if (Object.keys(updateData).length > 0) {
          await prisma.expense.updateMany({ where: { vendor: key }, data: updateData })
        }
        updated++
      } else {
        await prisma.merchantMapping.create({
          data: { merchantKey: key, expenseType, subCategory, person, source: "user_review" },
        })
        created++
      }
    }

    if (created > 0) resetMappingCache()

    return NextResponse.json({ success: true, created, updated, total: mappings.length })
  } catch (error) {
    console.error("Batch mapping error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const { keys } = await req.json()
    if (!Array.isArray(keys) || keys.length === 0) {
      return NextResponse.json({ error: "keys array is required" }, { status: 400 })
    }

    // Create empty placeholder mappings for each key to remove from Unmapped
    const existing = await prisma.merchantMapping.findMany({
      where: { merchantKey: { in: keys.map((k) => k.toLowerCase().trim()) } },
      select: { merchantKey: true },
    })
    const existingSet = new Set(existing.map((m) => m.merchantKey))

    const toCreate = keys
      .map((k) => k.toLowerCase().trim())
      .filter((k) => k && !existingSet.has(k))

    if (toCreate.length > 0) {
      await prisma.merchantMapping.createMany({
        data: toCreate.map((key) => ({
          merchantKey: key,
          source: "dismissed",
        })),
      })
      resetMappingCache()
    }

    return NextResponse.json({ success: true, dismissed: toCreate.length, total: keys.length })
  } catch (error) {
    console.error("Batch dismiss error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
