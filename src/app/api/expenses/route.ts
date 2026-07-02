import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateBody } from "@/shared/validate"
import { ExpenseCreateSchema } from "@/shared/validation"
import type { Prisma } from "@prisma/client"

/**
 * Build a Prisma filter condition for a multi-select field.
 * Supports comma-separated values, `__blank__` for null/empty, and mode (contains/not-contains).
 */
function buildMultiSelectFilter(
  field: keyof Prisma.ExpenseWhereInput,
  value: string | null,
  mode: "contains" | "not-contains" = "contains"
): Prisma.ExpenseWhereInput | null {
  if (!value) return null

  const values = value.split(",").filter(Boolean)
  if (values.length === 0) return null

  const actualValues = values.filter((v) => v !== "__blank__")
  const hasBlank = values.includes("__blank__")

  const conditions: Prisma.ExpenseWhereInput[] = []

  if (actualValues.length > 0) {
    if (mode === "not-contains") {
      conditions.push({ [field]: { notIn: actualValues } } as Prisma.ExpenseWhereInput)
    } else {
      conditions.push({ [field]: { in: actualValues } } as Prisma.ExpenseWhereInput)
    }
  }

  if (hasBlank) {
    if (mode === "not-contains") {
      // Exclude nulls (show only non-null values)
      conditions.push({ [field]: { not: null } } as Prisma.ExpenseWhereInput)
    } else {
      // Include nulls
      conditions.push({ [field]: null } as Prisma.ExpenseWhereInput)
    }
  }

  if (conditions.length === 0) return null
  if (conditions.length === 1) return conditions[0]
  // When combining different conditions for the same field (e.g., in + null),
  // use OR — match any of the conditions
  return { OR: conditions }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)

  // Single-value params (kept for backward compatibility)
  const categoryId = searchParams.get("categoryId")
  const month = searchParams.get("month")
  const year = searchParams.get("year")
  const importSessionId = searchParams.get("importSessionId")
  const person = searchParams.get("person")
  const recurrenceType = searchParams.get("recurrenceType")
  const paymentMode = searchParams.get("paymentMode")
  const vendor = searchParams.get("vendor")
  const subCategory = searchParams.get("subCategory")
  const bankAccount = searchParams.get("bankAccount")

  // Multi-value params (new — comma-separated)
  const categoryIds = searchParams.get("categoryIds")
  const persons = searchParams.get("persons")
  const recurrenceTypes = searchParams.get("recurrenceTypes")
  const paymentModes = searchParams.get("paymentModes")
  const vendors = searchParams.get("vendors")
  const subCategories = searchParams.get("subCategories")
  const bankAccounts = searchParams.get("bankAccounts")

  // Filter modes for text-based fields (P3.6)
  const vendorMode = (searchParams.get("vendorMode") as "contains" | "not-contains") || "contains"
  const subCategoryMode = (searchParams.get("subCategoryMode") as "contains" | "not-contains") || "contains"

  const search = searchParams.get("search")
  const dateFrom = searchParams.get("dateFrom")
  const dateTo = searchParams.get("dateTo")
  const amountMin = searchParams.get("amountMin")
  const amountMax = searchParams.get("amountMax")
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"))
  const pageSize = Math.max(1, Math.min(200, Number.parseInt(searchParams.get("pageSize") || "100")))
  const sortField = searchParams.get("sortField") || "date"
  const sortDir = searchParams.get("sortDir") || "desc"

  // Build filter conditions using AND array to support multiple filter types
  const andConditions: Prisma.ExpenseWhereInput[] = []

  // --- Backward compat single-value filters ---
  if (categoryId) {
    // If categoryIds is also present, we'll use that instead
    andConditions.push({ categoryId: Number.parseInt(categoryId) })
  }

  if (importSessionId) {
    andConditions.push({ importSessionId: Number.parseInt(importSessionId) })
  }

  // --- Multi-value filters ---

  // Category IDs
  if (categoryIds) {
    const ids = categoryIds.split(",").filter(Boolean).map(Number).filter((n) => !isNaN(n))
    if (ids.length > 0) {
      // Remove the single categoryId condition if both are present
      const filter: Prisma.ExpenseWhereInput = { categoryId: { in: ids } }
      andConditions.push(filter)
    }
  }

  // Persons
  const personFilter = buildMultiSelectFilter("person", persons || person)
  if (personFilter) andConditions.push(personFilter)

  // Recurrence types
  const recurrenceFilter = buildMultiSelectFilter("recurrenceType", recurrenceTypes || recurrenceType)
  if (recurrenceFilter) andConditions.push(recurrenceFilter)

  // Payment modes
  const paymentModeFilter = buildMultiSelectFilter("paymentMode", paymentModes || paymentMode)
  if (paymentModeFilter) andConditions.push(paymentModeFilter)

  // Vendors (with mode toggle)
  const vendorFilter = buildMultiSelectFilter("vendor", vendors || vendor, vendorMode)
  if (vendorFilter) andConditions.push(vendorFilter)

  // SubCategories (with mode toggle)
  const subCategoryFilter = buildMultiSelectFilter("subCategory", subCategories || subCategory, subCategoryMode)
  if (subCategoryFilter) andConditions.push(subCategoryFilter)

  // Bank accounts
  const bankAccountFilter = buildMultiSelectFilter("bankAccount", bankAccounts || bankAccount)
  if (bankAccountFilter) andConditions.push(bankAccountFilter)

  // Amount range
  if (amountMin || amountMax) {
    const amountFilter: Prisma.FloatFilter<"Expense"> = {} as Prisma.FloatFilter<"Expense">
    if (amountMin) amountFilter.gte = Number.parseFloat(amountMin)
    if (amountMax) amountFilter.lte = Number.parseFloat(amountMax)
    andConditions.push({ amount: amountFilter })
  }

  // Date range
  if (dateFrom || dateTo) {
    const dateFilter: Prisma.DateTimeFilter<"Expense"> = {} as Prisma.DateTimeFilter<"Expense">
    if (dateFrom) dateFilter.gte = new Date(dateFrom)
    if (dateTo) dateFilter.lte = new Date(dateTo + "T23:59:59.999Z")
    andConditions.push({ date: dateFilter })
  } else if (month && year && !dateFrom && !dateTo) {
    const m = Number.parseInt(month)
    const y = Number.parseInt(year)
    andConditions.push({
      date: {
        gte: new Date(y, m - 1, 1),
        lt: new Date(y, m, 1),
      },
    })
  }

  // Global search (creates its own OR)
  if (search) {
    const s = search
    andConditions.push({
      OR: [
        { vendor: { contains: s } },
        { description: { contains: s } },
        { person: { contains: s } },
        { notes: { contains: s } },
        { category: { name: { contains: s } } },
      ],
    })
  }

  // Build final where clause
  const where: Prisma.ExpenseWhereInput =
    andConditions.length === 0
      ? {}
      : (andConditions.length === 1
        ? andConditions[0]
        : { AND: andConditions })

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
  await prisma.expense.delete({ where: { id: Number.parseInt(id) } })
  return NextResponse.json({ success: true })
}
