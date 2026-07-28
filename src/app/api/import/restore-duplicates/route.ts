import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"

function parseDate(raw: unknown): Date | null {
  if (!raw) return null
  if (typeof raw === "number") {
    return new Date(new Date(1899, 11, 30).getTime() + raw * 86_400_000)
  }
  const str = String(raw).trim()
  let d = new Date(str)
  if (!isNaN(d.getTime())) return d
  const parts = str.split(/[/-]/)
  if (parts.length === 3) {
    d = new Date(`${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

function parseAmount(raw: unknown): number | null {
  if (!raw) return null
  if (typeof raw === "number") return Math.abs(raw)
  const cleaned = String(raw).replaceAll(/[^\d.-]/g, "")
  const n = Number.parseFloat(cleaned)
  return isNaN(n) ? null : Math.abs(n)
}

function normalizeCategory(cat: string): string {
  const c = String(cat).trim().toLowerCase()
  const map: Record<string, string> = {
    food: "food", "food & dining": "food",
    medical: "medical", "health & fitness": "medical",
    travel: "travel", transportation: "travel",
    shopping: "shopping",
    groceries: "groceries",
    "bills & utilities": "bills-utilities", electricity: "bills-utilities",
    rent: "rent",
    education: "education",
    entertainment: "entertainment",
    investment: "investment",
    "petrol/diesel": "petrol-diesel", petrol: "petrol-diesel",
    flower: "flower",
    "vehicle-expense": "vehicle-expense",
    pooja: "pooja",
    clothes: "clothes",
    "marutinagarbld": "marutinagarbld",
    "house-monthly expense": "house-monthly",
    "house-repair-enhancements": "house-repair",
    "trip-vacation": "trip-vacation",
    stationary: "stationary",
    "mobile-telephone": "mobile-telephone",
    jewelery: "jewelery",
    festival: "festival",
    donation: "donation",
    purchase: "purchase",
    misc: "misc",
    insurance: "insurance",
    "sukanya-samrudhi": "sukanya-samrudhi",
    zameen: "zameen",
    lended: "lended",
    functions: "functions",
  }
  return map[c] || c
}

const PERSON_MAP: Record<string, string> = {
  family: "Family", "fam'": "Family",
  seenu: "Seenu",
  father: "Father", mother: "Mother",
  vinutha: "Vinutha",
  kishan: "Kishan", smitha: "Smitha",
  others: "Others",
  friends: "Friends",
}

function normalizePerson(p: string): string {
  const trimmed = String(p).trim()
  const lower = trimmed.toLowerCase()
  for (const [key, val] of Object.entries(PERSON_MAP)) {
    if (lower === key.toLowerCase()) return val
  }
  if (lower.includes("smitha") && lower.includes("vinutha")) return "Smitha/Vinutha"
  if (lower.includes("smitha") && lower.includes("kishan")) return "Smitha/Kishan"
  if (lower.includes("vinutha") && lower.includes("smitha")) return "Vinutha/Smitha"
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames.find(
      (s) => s.toLowerCase().includes("expense-list") || s.toLowerCase().includes("expense")
    ) || workbook.SheetNames[0]

    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

    if (rows.length < 2) {
      return NextResponse.json({ error: "Sheet is empty" }, { status: 400 })
    }

    // Find header row (same logic as kcexpenses import)
    let headerRow = -1
    let dateCol = -1, typeCol = -1, subCol = -1, personCol = -1
    let descCol = -1, amountCol = -1, paidCol = -1, bankCol = -1, commentsCol = -1

    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const row = rows[i] || []
      const rowText = row.map((c) => String(c || "").toLowerCase()).join(" ")
      if (rowText.includes("date") && rowText.includes("expense type") && rowText.includes("amount")) {
        headerRow = i
        const headers = row.map((c) => String(c || "").toLowerCase().trim())
        dateCol = headers.findIndex((h) => h.includes("date"))
        typeCol = headers.findIndex((h) => h.includes("expense type"))
        subCol = headers.findIndex((h) => /sub cat|subcategory/.test(h))
        personCol = headers.findIndex((h) => h.includes("person"))
        descCol = headers.findIndex((h) => h.includes("description"))
        amountCol = headers.findIndex((h) => /expense amount|amount/.test(h))
        paidCol = headers.findIndex((h) => /paid through|cash|credit card|gpay/.test(h))
        bankCol = headers.findIndex((h) => h.includes("bank"))
        commentsCol = headers.findIndex((h) => h.includes("comments"))
        break
      }
    }

    if (headerRow === -1 || dateCol === -1 || amountCol === -1) {
      return NextResponse.json({
        error: "Could not identify header row. Expected columns: Date, Expense Type, Expense Amount",
      }, { status: 400 })
    }

    // Parse rows
    interface RestoreRow {
      date: Date
      amount: number
      expenseType: string
      subCategory: string
      person: string
      description: string
      paidThrough: string
      bank: string
      comments: string
      vendor: string
    }

    const parsed: RestoreRow[] = []

    for (let i = headerRow + 1; i < rows.length; i++) {
      const row = rows[i] || []
      if (!row[dateCol] && !row[amountCol]) continue

      const date = parseDate(row[dateCol])
      const amount = parseAmount(row[amountCol])
      if (!date || !amount) continue

      const expenseType = normalizeCategory(String(row[typeCol] || ""))
      const subCategory = String(row[subCol] || "").trim().toLowerCase()
      const person = normalizePerson(String(row[personCol] || ""))
      const description = String(row[descCol] || "").trim()

      let vendor = ""
      if (description) {
        const descStr = description.split(" - ")[0].trim()
        if (descStr && descStr.toLowerCase() !== "nan" && descStr !== "") {
          vendor = descStr
        }
      }

      parsed.push({
        date, amount, expenseType, subCategory,
        person, description,
        paidThrough: String(row[paidCol] || "").trim(),
        bank: String(row[bankCol] || "").trim(),
        comments: String(row[commentsCol] || "").trim(),
        vendor,
      })
    }

    if (parsed.length === 0) {
      return NextResponse.json({ error: "No valid expense rows found" }, { status: 400 })
    }

    // Load existing DB keys
    const dbExpenses = await prisma.expense.findMany({
      select: { date: true, amount: true, vendor: true, description: true },
    })
    const dbKeys = new Set(
      dbExpenses.map((e) => `${e.date.toISOString().split("T")[0]}|${e.amount}|${e.vendor ?? ""}|${e.description ?? ""}`)
    )

    // Find records whose key already exists in DB (these are the duplicates)
    const toRestore = parsed.filter((p) => {
      const key = `${p.date.toISOString().split("T")[0]}|${p.amount}|${p.vendor ?? ""}|${p.description ?? ""}`
      return dbKeys.has(key)
    })

    if (toRestore.length === 0) {
      return NextResponse.json({
        success: true,
        restored: 0,
        message: "No duplicate records found to restore. All spreadsheet records are unique in the database.",
      })
    }

    // Map expense type to category
    const allCategories = await prisma.category.findMany()
    const catMap = new Map<string, number>()
    for (const c of allCategories) {
      catMap.set(c.name.toLowerCase(), c.id)
    }
    const uniqueTypes = [...new Set(toRestore.map((e) => e.expenseType))]
    for (const t of uniqueTypes) {
      if (!catMap.has(t)) {
        const cat = await prisma.category.create({ data: { name: t, type: "expense" } })
        catMap.set(t, cat.id)
      }
    }

    // Batch create flagged expenses
    const expenseData = toRestore.map((expense) => ({
      date: expense.date,
      amount: expense.amount,
      categoryId: catMap.get(expense.expenseType) || 1,
      subCategory: expense.subCategory || null,
      person: expense.person || null,
      vendor: expense.vendor || null,
      description: expense.description || null,
      paymentMode: expense.paidThrough?.includes("cash") ? "Cash" : "UPI",
      paidThrough: expense.paidThrough || null,
      bankAccount: expense.bank || null,
      notes: expense.comments || null,
      flagged: true,
    }))

    // Insert in batches to avoid SQL limits
    const BATCH_SIZE = 500
    let totalRestored = 0
    for (let i = 0; i < expenseData.length; i += BATCH_SIZE) {
      const batch = expenseData.slice(i, i + BATCH_SIZE)
      await prisma.expense.createMany({ data: batch })
      totalRestored += batch.length
    }

    return NextResponse.json({
      success: true,
      restored: totalRestored,
      message: `Restored ${totalRestored} duplicate records as flagged for review.`,
    })
  } catch (error) {
    console.error("Restore duplicates error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
