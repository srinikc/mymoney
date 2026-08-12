import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateBody } from "@/shared/validate"
import { ExpenseUpdateSchema } from "@/shared/validation"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let profileId: number
  try {
    const ctx = await getAuthContext()
    profileId = ctx.profileId
  } catch (e) {
    return handleAuthError(e)
  }

  const { id } = await params
  const owned = await prisma.expense.findFirst({ where: { id: Number.parseInt(id), profileId } })
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 })
  const { data: body, error } = await validateBody(req, ExpenseUpdateSchema)
  if (error) return error

  const data: Record<string, unknown> = {}

  if (body.date !== undefined) data.date = new Date(body.date)
  if (body.amount !== undefined) data.amount = body.amount
  if (body.categoryId !== undefined) data.categoryId = Number(body.categoryId)
  if (body.subCategory !== undefined) data.subCategory = body.subCategory
  if (body.person !== undefined) data.person = body.person
  if (body.vendor !== undefined) data.vendor = body.vendor
  if (body.description !== undefined) data.description = body.description
  if (body.paymentMode !== undefined) data.paymentMode = body.paymentMode
  if (body.recurrenceType !== undefined) data.recurrenceType = body.recurrenceType
  if (body.otherType !== undefined) data.otherType = body.otherType
  if (body.tags !== undefined) data.tags = body.tags
  if (body.receiptUrl !== undefined) data.receiptUrl = body.receiptUrl
  if (body.isShared !== undefined) data.isShared = body.isShared
  if (body.sharedWith !== undefined) data.sharedWith = body.sharedWith
  if (body.notes !== undefined) data.notes = body.notes
  if (body.bankAccount !== undefined) data.bankAccount = body.bankAccount
  if (body.paidThrough !== undefined) data.paidThrough = body.paidThrough

  const expense = await prisma.expense.update({
    where: { id: Number.parseInt(id) },
    data,
    include: { category: true },
  })

  // Always upsert merchant mapping when vendor is present
  if (body.vendor) {
    const key = String(body.vendor).toLowerCase().trim()
    if (key) {
      let expenseType = ""
      const catId = body.categoryId ? Number(body.categoryId) : 0
      if (catId) {
        const cat = await prisma.category.findUnique({ where: { id: catId } })
        if (cat) expenseType = cat.name
      }
      await prisma.merchantMapping.upsert({
        where: { merchantKey: key },
        update: {
          description: body.vendor,
          expenseType: expenseType || undefined,
          subCategory: body.subCategory || undefined,
          person: body.person || undefined,
        },
        create: {
          merchantKey: key,
          description: body.vendor,
          expenseType: expenseType || "",
          subCategory: body.subCategory || "",
          person: body.person || "",
          source: "user_edit",
        },
      })
    }
  }

  return NextResponse.json(expense)
}
