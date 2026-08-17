import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateBody } from "@/shared/validate"
import { ExpenseCreateSchema } from "@/shared/validation"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import type { Prisma } from "@prisma/client"

/**
 * Build a Prisma filter condition for a multi-select field.
 * Supports comma-separated values, `__blank__` for null/empty, and mode (contains/not-contains).
 * Matching is case-insensitive (Prisma `in`/`notIn` don't support `mode`, so each
 * value becomes an `equals`/`not` with `mode: "insensitive"`).
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
      // Exclude rows whose field matches ANY selected value (case-insensitive)
      conditions.push({
        AND: actualValues.map((v) => ({ [field]: { not: { equals: v, mode: "insensitive" } } }) as Prisma.ExpenseWhereInput),
      })
    } else {
      // Include rows whose field matches ANY selected value (case-insensitive)
      conditions.push({
        OR: actualValues.map((v) => ({ [field]: { equals: v, mode: "insensitive" } }) as Prisma.ExpenseWhereInput),
      })
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
  let profileId: number
  try {
    const ctx = await getAuthContext()
    profileId = ctx.profileId
  } catch (e) {
    return handleAuthError(e)
  }

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
  const notes = searchParams.get("notes")
  const description = searchParams.get("description")
  const otherType = searchParams.get("otherType")
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1"))
  const pageSize = Math.max(1, Math.min(200, Number.parseInt(searchParams.get("pageSize") || "100")))
  const sortField = searchParams.get("sortField") || "date"
  const sortDir = searchParams.get("sortDir") || "desc"

  // Build filter conditions using AND array to support multiple filter types
  const andConditions: Prisma.ExpenseWhereInput[] = [{ profileId }]

  // Show archived records only when ?archived=true, otherwise hide them
  const archived = searchParams.get("archived") === "true"
  if (archived) {
    andConditions.push({ deletedAt: { not: null } })
  } else {
    andConditions.push({ deletedAt: null })
  }

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

  // Notes filter
  if (notes) {
    andConditions.push({ notes: { contains: notes, mode: "insensitive" } })
  }

  // Description filter
  if (description) {
    andConditions.push({ description: { contains: description, mode: "insensitive" } })
  }

  // Other type filter
  if (otherType) {
    andConditions.push({ otherType: { contains: otherType, mode: "insensitive" } })
  }

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
        { vendor: { contains: s, mode: "insensitive" } },
        { description: { contains: s, mode: "insensitive" } },
        { person: { contains: s, mode: "insensitive" } },
        { notes: { contains: s, mode: "insensitive" } },
        { category: { name: { contains: s, mode: "insensitive" } } },
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
  const validSortFields = ["date", "amount", "vendor", "person", "paymentMode", "bankAccount"] as const
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
      where: { person: { not: null }, deletedAt: null, profileId },
      select: { person: true },
      distinct: ["person"],
      orderBy: { person: "asc" },
    }),
    prisma.expense.findMany({
      where: { deletedAt: null, profileId },
      select: { recurrenceType: true },
      distinct: ["recurrenceType"],
      orderBy: { recurrenceType: "asc" },
    }),
    prisma.expense.findMany({
      where: { deletedAt: null, profileId },
      select: { paymentMode: true },
      distinct: ["paymentMode"],
      orderBy: { paymentMode: "asc" },
    }),
    prisma.expense.findMany({
      where: { vendor: { not: null }, deletedAt: null, profileId },
      select: { vendor: true },
      distinct: ["vendor"],
      orderBy: { vendor: "asc" },
    }),
    prisma.expense.findMany({
      where: { subCategory: { not: null }, deletedAt: null, profileId },
      select: { subCategory: true },
      distinct: ["subCategory"],
      orderBy: { subCategory: "asc" },
    }),
    prisma.expense.findMany({
      where: { bankAccount: { not: null }, deletedAt: null, profileId },
      select: { bankAccount: true },
      distinct: ["bankAccount"],
      orderBy: { bankAccount: "asc" },
    }),
  ])

  // Collapse values that differ only by case (e.g. "Ice cream" vs "ice cream")
  // keeping the first-seen spelling, so filter dropdowns show one canonical item.
  const dedupeInsensitive = (values: (string | null)[]): string[] => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const v of values) {
      if (!v) continue
      const k = v.toLowerCase().trim()
      if (seen.has(k)) continue
      seen.add(k)
      out.push(v)
    }
    return out
  }

  return NextResponse.json({
    data: expenses,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
    totalAmount: totalAmountResult._sum.amount || 0,
    distinctPersons: dedupeInsensitive(distinctPersons.map((p) => p.person)),
    distinctRecurrenceTypes: dedupeInsensitive(distinctRecurrenceTypes.map((r) => r.recurrenceType)),
    distinctPaymentModes: dedupeInsensitive(distinctPaymentModes.map((p) => p.paymentMode)),
    distinctVendors: dedupeInsensitive(distinctVendors.map((v) => v.vendor)),
    distinctSubCategories: dedupeInsensitive(distinctSubCategories.map((s) => s.subCategory)),
    distinctBankAccounts: dedupeInsensitive(distinctBankAccounts.map((b) => b.bankAccount)),
  })
}

export async function POST(req: Request) {
  let profileId: number
  let userId: number
  try {
    const ctx = await getAuthContext()
    profileId = ctx.profileId
    userId = ctx.userId
  } catch (e) {
    return handleAuthError(e)
  }

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

  const baseData = {
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
    profileId,
  }

  // Recurring monthly batch: create one entry per month (forward or backward),
  // skipping months that already have a matching entry (same category + amount
  // + description/vendor in the same calendar month).
  const repeatCount = body.repeat?.count
  if (repeatCount && repeatCount > 1) {
    const start = new Date(body.date)
    const day = Math.min(Math.max(body.repeat?.day ?? 1, 1), 31)
    const direction = body.repeat?.direction || "forward"
    const maxCount = Math.min(Math.max(Math.round(repeatCount), 1), 120)

    let created = 0
    let skippedExisting = 0
    const createdIds: number[] = []

    for (let i = 0; i < maxCount; i++) {
      const offset = direction === "backward" ? -i : i
      const monthDate = new Date(start.getFullYear(), start.getMonth() + offset, 1)
      // Clamp the day to the last day of the month (e.g. 31 -> Feb 28/29).
      const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate()
      const entryDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), Math.min(day, lastDay))
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1)

      const desc = (body.description || "").trim()
      const ven = (body.vendor || "").trim()
      const dup = await prisma.expense.findFirst({
        where: {
          profileId,
          deletedAt: null,
          categoryId,
          amount: body.amount,
          date: { gte: monthStart, lt: monthEnd },
          ...(desc
            ? { description: { equals: desc, mode: "insensitive" } }
            : ven
              ? { vendor: { equals: ven, mode: "insensitive" } }
              : {}),
        },
        select: { id: true },
      })
      if (dup) {
        skippedExisting++
        continue
      }

      const createdExpense = await prisma.expense.create({
        data: { ...baseData, date: entryDate, recurrenceType: "recurring" },
        include: { category: true },
      })
      created++
      createdIds.push(createdExpense.id)
    }

    return NextResponse.json({ created, skippedExisting, createdIds, recurring: true }, { status: 201 })
  }

  const expense = await prisma.expense.create({
    data: baseData,
    include: { category: true },
  })

  // Auto-learn the vendor for this user (dedup)
  if (body.vendor && categoryId) {
    const key = String(body.vendor).toLowerCase().trim()
    if (key) {
      const cat = await prisma.category.findUnique({ where: { id: categoryId } })
      await prisma.vendorMapping.upsert({
        where: { userId_vendorKey: { userId, vendorKey: key } },
        update: { description: body.vendor },
        create: {
          userId,
          vendorKey: key,
          description: body.vendor,
          category: cat?.name || "",
          subCategory: body.subCategory || "",
          person: body.person || "",
          source: "manual",
        },
      })
    }
  }

  return NextResponse.json(expense, { status: 201 })
}

export async function DELETE(req: Request) {
  let profileId: number
  try {
    const ctx = await getAuthContext()
    profileId = ctx.profileId
  } catch (e) {
    return handleAuthError(e)
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  const owned = await prisma.expense.findFirst({ where: { id: Number.parseInt(id), profileId } })
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 })
  await prisma.expense.update({
    where: { id: Number.parseInt(id) },
    data: { deletedAt: new Date() },
  })
  return NextResponse.json({ success: true })
}
