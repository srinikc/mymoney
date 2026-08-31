export const maxDuration = 300

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"
import { getVendorMappingMap, shouldAutoMap, resetVendorKeyCache, BUSINESS } from "@/shared/vendor-mapping"
import { titleCase } from "@/shared/title-case"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

const PERSON_MAP: Record<string, string> = {
  family: "Family", Family: "Family", "fam'": "Family",
  seenu: "Seenu", Seenu: "Seenu",
  father: "Father", mother: "Mother",
  vinutha: "Vinutha", Vinutha: "Vinutha",
  kishan: "Kishan", smitha: "Smitha", Smitha: "Smitha",
  others: "Others", Others: "Others",
  friends: "Friends", Friends: "Friends",
  "vinutha/smitha": "Vinutha/Smitha",
  "smitha/vinutha": "Smitha/Vinutha",
  "smitha/kishan": "Smitha/Kishan",
}

function normalizePerson(p: string): string {
  const trimmed = String(p).trim().toLowerCase()
  const lower = trimmed.toLowerCase()
  for (const [key, val] of Object.entries(PERSON_MAP)) {
    if (lower === key.toLowerCase()) return val
  }
  if (lower.includes("smitha") && lower.includes("vinutha")) return "Smitha/Vinutha"
  if (lower.includes("smitha") && lower.includes("kishan")) return "Smitha/Kishan"
  if (lower.includes("vinutha") && lower.includes("smitha")) return "Vinutha/Smitha"
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

function parseDate(raw: unknown): Date | null {
  if (!raw) return null
  if (typeof raw === "number") {
    const excelEpoch = new Date(1899, 11, 30)
    return new Date(excelEpoch.getTime() + raw * 86_400_000)
  }
  const str = String(raw).trim()

  // Try YYYY-MM-DD
  let d = new Date(str)
  if (!isNaN(d.getTime())) return d

  // Try DD/MM/YYYY
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

// Words that describe a category/item rather than a merchant. When a description
// derives to one of these, the expense gets no vendor so it lands under
// "Unmapped" and is never auto-learned as a vendor mapping.
const GENERIC_VENDOR_WORDS = new Set([
  "milk", "vegetables", "veg", "veggies", "fruits", "fruit", "groceries", "grocery",
  "breakfast", "lunch", "dinner", "snacks", "snack", "flowers", "flower",
  "petrol", "diesel", "auto", "chicken", "medicines", "medicine", "yelnir",
  "tiffin", "tea", "coffee", "juice", "fish", "mutton", "egg", "eggs",
  "curd", "shopping", "groceries", "misc", "expenses", "expense", "bills", "bill",
])

function isGenericVendor(candidate: string): boolean {
  const first = candidate.toLowerCase().split(/\s+/)[0]
  return GENERIC_VENDOR_WORDS.has(first)
}

// Deterministically extract a merchant (vendor) from a free-text description.
// Handles the patterns found in KCExpenses workbooks:
//   - "Sreedhar Medicals"                        -> "Sreedhar Medicals"
//   - "MOHANAN M O using Bank Account XXXXXX1655" -> "MOHANAN M O"
//   - "Q883610501 - Vegetables"                  -> "Vegetables" (then dropped as generic)
//   - "Mangalya ... 4.430g - Manju ravi jewellers" -> "Manju ravi jewellers"
//   - "Vinutha K - April Home Expenses"          -> "Vinutha K"
function deriveVendor(description: string): string {
  let d = String(description).replaceAll(/\s+/g, " ").trim()
  if (!d) return ""

  // Strip trailing bank-account suffix: "X using Bank Account XXXXXX1655"
  d = d.replace(/\s+using\s+bank\s+account.*$/i, "").trim()

  // Strip leading Q-codes / ref numbers: "Q883610501 - X", "12345 - X"
  d = d.replace(/^(?:q\d{3,}|\d{5,})\s*[:-]\s*/i, "").trim()

  // Masked-QR / net-banking narrations carry no identifiable merchant
  // (e.g. "IMPS OUTWARD ORG UPI To qXXXX0053@ybl, REF NO - ..." or
  // "NET APP INDIA P BANGALORE IN"). Drop them so no junk vendor is learned.
  if (/^(imps|neft|rtgs)\s+(outward|inward|org)/i.test(d)) return ""
  if (/^net\s+app\b/i.test(d)) return ""

  if (!d) return ""

  let candidate = ""
  const parts = d.split(" - ").map((s) => s.trim()).filter(Boolean)
  if (parts.length === 1) {
    candidate = parts[0]
  } else {
    // Prefer the last segment when it contains a business keyword (the jeweller
    // case), otherwise the first segment is the merchant / person.
    const last = parts.at(-1) ?? ""
    if (BUSINESS.test(last) && last.split(" ").length <= 5) candidate = last
    else candidate = parts[0]
  }

  candidate = candidate
    .replace(/^(paid|payment|contribution|transfer|fund\s*transfer|by\s*transfer|neft|imps|rtgs|upi)\s+(?:to|for|by|via|towards)\s+/i, "")
    .replace(/^(to|for|at|from|towards|purchased?\s+at|spent\s+at|debited\s+to|credited\s+to|dr\s+to|cr\s+to)\s+/i, "")
    .replace(/^(upi|pos|atm|cheque|chq|card|tran|ref|txn)[\s/:]*/i, "")
    .replace(/^[\d#a-z]{0,6}\s*[:-]\s*/i, "")
    .trim()
  candidate = candidate.replaceAll(/\s+/g, " ").trim()

  if (!candidate || candidate.toLowerCase() === "nan" || candidate.length > 60) return ""
  if (isGenericVendor(candidate)) return ""
  return candidate
}

interface ParsedExpense {
  date: Date
  amount: number
  expenseType: string
  subCategory: string
  person: string
  description: string
  paidThrough: string
  bank: string
  comments: string
  type: string
  otherType: string
  vendor: string
  isDuplicate?: boolean
}

export async function POST(req: Request) {
  let userId: number
  let profileId: number
  try {
    const ctx = await getAuthContext()
    userId = ctx.userId
    profileId = ctx.profileId
  } catch (e) {
    return handleAuthError(e)
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const confirm = formData.get("confirm") === "true"

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

    // Find header row
    let headerRow = -1
    let dateCol = -1, typeCol = -1, subCol = -1, personCol = -1
    let descCol = -1, amountCol = -1, paidCol = -1, bankCol = -1
    let commentsCol = -1, recTypeCol = -1, otherTypeCol = -1, vendorCol = -1

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
        recTypeCol = headers.findIndex((h) => /^type$/.test(h.trim()) && !h.includes("other"))
        otherTypeCol = headers.findIndex((h) => h.includes("othertype") || h.includes("other type"))
        vendorCol = headers.findIndex((h) => /^(vendor|merchant|payee|party)$/.test(h.trim()))
        break
      }
    }

    if (headerRow === -1 || dateCol === -1 || amountCol === -1) {
      return NextResponse.json({
        error: "Could not identify header row. Expected columns: Date, Expense Type, Expense Amount",
      }, { status: 400 })
    }

    // Parse rows
    const parsed: ParsedExpense[] = []
    const vendorSet = new Set<string>()

    // Load the user's existing vendor catalog (uploaded via the Vendors page)
    // so we can apply catalog precedence for category/subcat/person.
    const vendorMappingMap = await getVendorMappingMap(userId)
    const existingVendorKeys = new Set(vendorMappingMap.keys())

    for (let i = headerRow + 1; i < rows.length; i++) {
      const row = rows[i] || []
      if (!row[dateCol] && !row[amountCol]) continue

      const date = parseDate(row[dateCol])
      const amount = parseAmount(row[amountCol])
      if (!date || !amount) continue

      const expenseType = normalizeCategory(String(row[typeCol] || ""))
      const subCategory = titleCase(String(row[subCol] || ""))
      const person = normalizePerson(String(row[personCol] || ""))
      const description = String(row[descCol] || "").trim()

      // Extract vendor: prefer an explicit Vendor/Merchant/Payee column; only
      // derive from the description when no vendor column exists (or it's blank).
      let vendor = ""
      const explicitVendor = vendorCol >= 0 ? String(row[vendorCol] || "").trim() : ""
      if (explicitVendor && explicitVendor.toLowerCase() !== "nan") {
        vendor = titleCase(explicitVendor)
      } else if (description) {
        vendor = titleCase(deriveVendor(description))
      }

      let finalExpenseType = expenseType
      let finalSubCategory = subCategory
      let finalPerson = person

      if (vendor) {
        vendorSet.add(vendor)
        // Catalog precedence: if the vendor already has a mapping for this user
        // (uploaded via the Vendors page), use its category/subcat/person.
        const catalog = vendorMappingMap.get(vendor.toLowerCase().trim())
        if (catalog) {
          if (catalog.category) finalExpenseType = normalizeCategory(catalog.category)
          if (catalog.subCategory) finalSubCategory = titleCase(catalog.subCategory)
          if (catalog.person) finalPerson = normalizePerson(catalog.person)
        }
      }

      parsed.push({
        date, amount, expenseType: finalExpenseType, subCategory: finalSubCategory,
        person: finalPerson, description,
        paidThrough: String(row[paidCol] || "").trim(),
        bank: String(row[bankCol] || "").trim(),
        comments: String(row[commentsCol] || "").trim(),
        type: String(row[recTypeCol] || "").trim().toLowerCase(),
        otherType: String(row[otherTypeCol || recTypeCol] || "").trim(),
        vendor,
      })
    }

    if (parsed.length === 0) {
      return NextResponse.json({ error: "No valid expense rows found" }, { status: 400 })
    }

    // Distinct vendors being learned in this sheet (that aren't mapped yet)
    const newVendorCount = [...new Set(parsed.map((p) => p.vendor.toLowerCase().trim()).filter(Boolean))]
      .filter((k) => {
        if (existingVendorKeys.has(k)) return false
        const sample = parsed.find((p) => p.vendor.toLowerCase().trim() === k)
        return sample ? shouldAutoMap(sample.vendor, sample.description || "", existingVendorKeys) : false
      }).length

    // If preview mode, return summary without importing
    if (!confirm) {
      const types = new Set(parsed.map((p) => p.expenseType))
      const persons = new Set(parsed.map((p) => p.person))
      const years = new Set(parsed.map((p) => p.date.getFullYear()))
      const totalAmount = parsed.reduce((s, p) => s + p.amount, 0)

      return NextResponse.json({
        preview: true,
        sheetName,
        total: parsed.length,
        dateRange: {
          from: parsed[0].date.toISOString().split("T")[0],
          to: parsed.at(-1)?.date.toISOString().split("T")[0] ?? parsed[0].date.toISOString().split("T")[0],
        },
        totalAmount: Math.round(totalAmount),
        uniqueTypes: types.size,
        uniquePersons: persons.size,
        years: [...years].sort(),
        newVendorCount,
        sample: parsed.slice(0, 5).map((p) => ({
          date: p.date.toISOString().split("T")[0],
          vendor: p.vendor,
          expenseType: p.expenseType,
          subCategory: p.subCategory,
          person: p.person,
          paidThrough: p.paidThrough,
          bank: p.bank,
          description: p.description.slice(0, 40),
          amount: p.amount,
        })),
        totalVendors: vendorSet.size,
      })
    }

    // Load existing DB keys for this profile (for cross-import dedup)
    const existingExpenses = await prisma.expense.findMany({
      where: { profileId, deletedAt: null },
      select: { date: true, amount: true, vendor: true, description: true },
    })
    const existingExpenseKeys = new Set(
      existingExpenses.map((e) => `${e.date.toISOString().split("T")[0]}|${e.amount}|${e.vendor ?? ""}|${e.description ?? ""}`)
    )

    // Count intra-spreadsheet key frequency to detect spreadsheet-level duplicates
    const keyCount = new Map<string, number>()
    for (const p of parsed) {
      const key = `${p.date.toISOString().split("T")[0]}|${p.amount}|${p.vendor ?? ""}|${p.description ?? ""}`
      keyCount.set(key, (keyCount.get(key) || 0) + 1)
    }

    const seenKeys = new Set<string>()
    const toImport: ParsedExpense[] = []

    for (const p of parsed) {
      const key = `${p.date.toISOString().split("T")[0]}|${p.amount}|${p.vendor ?? ""}|${p.description ?? ""}`

      // Skip if already exists in DB (cross-import dedup)
      if (existingExpenseKeys.has(key)) continue

      // Track intra-spreadsheet duplicates
      const isFirstOccurrence = !seenKeys.has(key)
      seenKeys.add(key)

      toImport.push({ ...p, isDuplicate: !isFirstOccurrence })
    }

    let imported = 0
    const skipped = parsed.length - toImport.length
    let flagged = 0
    let newMappings = 0

    // Nothing new to add — return early WITHOUT creating an import session,
    // so duplicate/repeated uploads never leave empty "skipped" sessions.
    if (toImport.length === 0) {
      return NextResponse.json({
        success: true, imported: 0, skipped, newMappings: 0, total: parsed.length,
        message: `All ${skipped} expenses were already imported. Nothing new to add.`,
      })
    }

    // Confirm mode — actually import (session created only when rows remain)
    const session = await prisma.importSession.create({
      data: { userId, profileId, source: "spreadsheet", fileName: file.name, totalRows: parsed.length, status: "importing" },
    })

    // Map expense type to category
    const allCategories = await prisma.category.findMany()
    const catMap = new Map(allCategories.map((c) => [c.name.toLowerCase(), c.id]))
    const uniqueTypes = [...new Set(toImport.map((e) => e.expenseType))]
    for (const t of uniqueTypes) {
      if (!catMap.has(t)) {
        const cat = await prisma.category.create({ data: { name: t, type: "expense" } })
        catMap.set(t, cat.id)
      }
    }

    // Batch create expenses (duplicates get flagged=true)
    const expenseData = toImport.map((expense) => {
      if (expense.isDuplicate) flagged++
      return {
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
        recurrenceType: expense.type || "onetime",
        otherType: expense.otherType || null,
        importSessionId: session.id,
        profileId,
        flagged: expense.isDuplicate,
      }
    })
    await prisma.expense.createMany({ data: expenseData })
    imported = expenseData.length

    // Auto-learn vendors (always on): group expenses by vendor key and store
    // the most common category/subCategory/person for each. Dedup per user.
    const vendorGroups = new Map<string, ParsedExpense[]>()
    for (const p of toImport) {
      if (!p.vendor) continue
      const key = p.vendor.toLowerCase().trim()
      if (!vendorGroups.has(key)) vendorGroups.set(key, [])
      vendorGroups.get(key)!.push(p)
    }

    const vendorData: {
      userId: number; vendorKey: string; description: string; category: string
      subCategory: string; person: string; source: string
    }[] = []

    for (const [key, vendorExpenses] of vendorGroups) {
      if (existingVendorKeys.has(key)) continue

      // Only auto-learn vendors that look like real merchants (business keyword
      // in the name) — never generic words or free-text notes.
      const sample = vendorExpenses[0]
      if (!shouldAutoMap(sample.vendor, sample.description || "", existingVendorKeys)) continue

      const typeCount = new Map<string, number>()
      const personCount = new Map<string, number>()
      const subCount = new Map<string, number>()
      for (const ve of vendorExpenses) {
        typeCount.set(ve.expenseType, (typeCount.get(ve.expenseType) || 0) + 1)
        personCount.set(ve.person, (personCount.get(ve.person) || 0) + 1)
        if (ve.subCategory) subCount.set(ve.subCategory, (subCount.get(ve.subCategory) || 0) + 1)
      }

      vendorData.push({
        userId,
        vendorKey: key,
        description: vendorExpenses[0].vendor,
        category: [...typeCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "",
        subCategory: [...subCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "",
        person: [...personCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "",
        source: "spreadsheet",
      })
    }

    if (vendorData.length > 0) {
      await prisma.vendorMapping.createMany({ data: vendorData })
      newMappings = vendorData.length
      resetVendorKeyCache(userId)
    }

    // Update session
    await prisma.importSession.update({
      where: { id: session.id },
      data: {
        status: "imported",
        autoMapped: imported,
        skipped,
        newMerchants: newMappings,
      },
    })

    const parts = [`Imported ${imported} expenses from spreadsheet`]
    if (flagged > 0) parts.push(`${flagged} flagged as potential duplicates`)
    if (skipped > 0) parts.push(`${skipped} were already in the system`)
    if (newMappings > 0) parts.push(`learned ${newMappings} new vendors`)

    return NextResponse.json({
      success: true,
      imported,
      flagged,
      skipped,
      newMappings,
      total: parsed.length,
      importSessionId: session.id,
      message: parts.join(", ") + ".",
    })
  } catch (error) {
    console.error("Spreadsheet import error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
