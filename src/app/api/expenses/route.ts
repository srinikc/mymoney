import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateBody } from "@/shared/validate"
import { ExpenseCreateSchema } from "@/shared/validation"
import type { Prisma } from "@prisma/client"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const categoryId = searchParams.get("categoryId")
  const month = searchParams.get("month")
  const year = searchParams.get("year")
  const importSessionId = searchParams.get("importSessionId")
  const person = searchParams.get("person")
  const recurrenceType = searchParams.get("recurrenceType")
  const search = searchParams.get("search")
  const paymentMode = searchParams.get("paymentMode")
  const vendor = searchParams.get("vendor")
  const subCategory = searchParams.get("subCategory")
  const bankAccount = searchParams.get("bankAccount")
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const amountMin = searchParams.get("amountMin")
  const amountMax = searchParams.get("amountMax")
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const pageSize = Math.max(1, Math.min(200, parseInt(searchParams.get("pageSize") || "100")))
  const sortField = searchParams.get("sortField") || "date"
  const sortDir = searchParams.get("sortDir") || "desc"

  const where: Prisma.ExpenseWhereInput = {}

  if (categoryId) where.categoryId = parseInt(categoryId)
  if (importSessionId) where.importSessionId = parseInt(importSessionId)
  if (person) where.person = person
  if (recurrenceType) where.recurrenceType = recurrenceType
  if (paymentMode) where.paymentMode = paymentMode
  if (vendor === "__blank__") {
    where.vendor = null
  } else if (vendor) {
    where.vendor = { contains: vendor }
  }
  if (subCategory) where.subCategory = { contains: subCategory }
  if (bankAccount) where.bankAccount = { contains: bankAccount }
  if (amountMin || amountMax) {
    where.amount = {}
    if (amountMin) where.amount.gte = parseFloat(amountMin)
    if (amountMax) where.amount.lte = parseFloat(amountMax)
  }

  if (dateFrom || dateTo) {
    where.date = {}
    if (dateFrom) where.date.gte = new Date(dateFrom)
    if (dateTo) where.date.lte = new Date(dateTo + "T23:59:59.999Z")
  } else if (month && year) {
    const m = parseInt(month)
    const y = parseInt(year)
    where.date = {
      gte: new Date(y, m - 1, 1),
      lt: new Date(y, m, 1),
    }
  }

  if (search) {
    const s = search
    where.OR = [
      { vendor: { contains: s } },
      { description: { contains: s } },
      { person: { contains: s } },
      { notes: { contains: s } },
      { category: { name: { contains: s } } },
    ]
  }

  const orderBy: Prisma.ExpenseOrderByWithRelationInput = {}
  const validSortFields = ["date", "amount", "vendor", "person"] as const
  const field = validSortFields.includes(sortField as typeof validSortFields[number]) ? sortField : "date"
  orderBy[field as keyof typeof orderBy] = sortDir === "asc" ? "asc" : "desc"

  const [expenses, total, totalAmountResult, distinctPersons, distinctRecurrenceTypes, distinctPaymentModes, distinctVendors, distinctSubCategories, distinctBankAccounts] = await Promise.all([
    prisma.expense.findMany({
      where,
      include: { category: true },
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.expense.count({ where }),
    prisma.expense.aggregate({ where, _sum: { amount: true } }),
    prisma.expense.findMany({
      where: { person: { not: null } },
      select: { person: true },
      distinct: ["person"],
      orderBy: { person: "asc" },
    }),
    prisma.expense.findMany({
      select: { recurrenceType: true },
      distinct: ["recurrenceType"],
      orderBy: { recurrenceType: "asc" },
    }),
    prisma.expense.findMany({
      select: { paymentMode: true },
      distinct: ["paymentMode"],
      orderBy: { paymentMode: "asc" },
    }),
    prisma.expense.findMany({
      where: { vendor: { not: null } },
      select: { vendor: true },
      distinct: ["vendor"],
      orderBy: { vendor: "asc" },
    }),
    prisma.expense.findMany({
      where: { subCategory: { not: null } },
      select: { subCategory: true },
      distinct: ["subCategory"],
      orderBy: { subCategory: "asc" },
    }),
    prisma.expense.findMany({
      where: { bankAccount: { not: null } },
      select: { bankAccount: true },
      distinct: ["bankAccount"],
      orderBy: { bankAccount: "asc" },
    }),
  ])

  return NextResponse.json({
    data: expenses,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    totalAmount: totalAmountResult._sum.amount || 0,
    distinctPersons: distinctPersons.map((p) => p.person).filter(Boolean),
    distinctRecurrenceTypes: distinctRecurrenceTypes.map((r) => r.recurrenceType).filter(Boolean),
    distinctPaymentModes: distinctPaymentModes.map((p) => p.paymentMode).filter(Boolean),
    distinctVendors: distinctVendors.map((v) => v.vendor).filter(Boolean),
    distinctSubCategories: distinctSubCategories.map((s) => s.subCategory).filter(Boolean),
    distinctBankAccounts: distinctBankAccounts.map((b) => b.bankAccount).filter(Boolean),
  })
}

export async function POST(req: Request) {
  const { data: body, error } = await validateBody(req, ExpenseCreateSchema)
  if (error) return error

  let categoryId = body.categoryId
  if (!categoryId && body.categoryName) {
    const cat = await prisma.category.findFirst({ where: { name: body.categoryName } })
    if (cat) {
      categoryId = cat.id
    } else {
      const newCat = await prisma.category.create({
        data: { name: body.categoryName, type: "expense" },
      })
      categoryId = newCat.id
    }
  }

  const expense = await prisma.expense.create({
    data: {
      date: new Date(body.date),
      amount: body.amount,
      categoryId: categoryId,
      vendor: body.vendor || null,
      description: body.description || null,
      paymentMode: body.paymentMode || "UPI",
      subCategory: body.subCategory || null,
      person: body.person || null,
      recurrenceType: body.recurrenceType || "onetime",
      tags: body.tags || null,
      notes: body.notes || null,
    },
    include: { category: true },
  })

  return NextResponse.json(expense, { status: 201 })
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  await prisma.expense.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
