import { PrismaClient } from "@prisma/client"
import * as XLSX from "xlsx"
import * as path from "node:path"

const p = new PrismaClient()

function parseDate(raw: unknown): string | null {
  if (!raw) return null
  if (typeof raw === "number") {
    const excelEpoch = new Date(1899, 11, 30)
    return new Date(excelEpoch.getTime() + raw * 86_400_000).toISOString().split("T")[0]
  }
  const str = String(raw).trim()
  let d = new Date(str)
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
  const parts = str.split(/[/-]/)
  if (parts.length === 3) {
    d = new Date(`${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`)
    if (!isNaN(d.getTime())) return d.toISOString().split("T")[0]
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

async function main() {
  const args = process.argv.slice(2)
  if (args.length === 0) {
    console.log("Usage: npx tsx scripts/find-missing.ts <path-to-spreadsheet.xlsx>")
    process.exit(1)
  }
  const filePath = path.resolve(args[0])
  console.log(`Reading spreadsheet: ${filePath}`)

  // Load spreadsheet
  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames.find(
    (s) => s.toLowerCase().includes("expense-list") || s.toLowerCase().includes("expense")
  ) || workbook.SheetNames[0]
  console.log(`Reading sheet: "${sheetName}"`)
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][]

  // Find header row — try strict first, then fallback
  function detectColumns(row: unknown[]): { dateCol: number; typeCol: number; subCol: number; personCol: number; descCol: number; amountCol: number; paidCol: number; bankCol: number; commentsCol: number } | null {
    const headers = row.map((c) => String(c || "").toLowerCase().trim())
    const dateCol = headers.findIndex((h) => /date|trxn date|transaction date|tran date/.test(h))
    const amountCol = headers.findIndex((h) => /amount|expense amount|debit|withdrawal|value/.test(h))
    if (dateCol === -1 || amountCol === -1) return null
    return {
      dateCol,
      typeCol: headers.findIndex((h) => /expense type|type of expense|category|expense category|type/.test(h)),
      subCol: headers.findIndex((h) => /sub cat|subcategory|sub category/.test(h)),
      personCol: headers.findIndex((h) => /person|name|paid by|payer/.test(h)),
      descCol: headers.findIndex((h) => /description|desc|narrative|particulars|details|note/.test(h)),
      amountCol,
      paidCol: headers.findIndex((h) => /paid through|payment mode|payment method|mode|cash|credit|gpay|upi/.test(h)),
      bankCol: headers.findIndex((h) => /bank|account/.test(h)),
      commentsCol: headers.findIndex((h) => /comments|remarks|remark|additional/.test(h)),
    }
  }

  let headerRow = -1
  let cols: ReturnType<typeof detectColumns> = null

  // Pass 1: strict — needs date + type/category + amount
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const row = rows[i] || []
    cols = detectColumns(row)
    if (cols && cols.typeCol !== -1) {
      headerRow = i
      break
    }
  }

  // Pass 2: fallback — just date + amount (typeCol will be -1)
  if (headerRow === -1) {
    for (let i = 0; i < Math.min(20, rows.length); i++) {
      const row = rows[i] || []
      cols = detectColumns(row)
      if (cols) {
        headerRow = i
        break
      }
    }
  }

  if (headerRow === -1) {
    console.log("\nCould not auto-detect header row. First 10 rows of file:")
    for (let i = 0; i < Math.min(10, rows.length); i++) {
      console.log(`  Row ${i + 1}:`, JSON.stringify(rows[i]))
    }
    console.error("\nExpected a row with columns like 'Date' and 'Amount'.")
    console.error("Please check the column names in your spreadsheet.")
    process.exit(1)
  }

  const headerNames = rows[headerRow].map((c: unknown) => String(c || ""))
  console.log(`\nHeader at row ${headerRow + 1}:`)
  headerNames.forEach((h: string, i: number) => console.log(`  Col ${i}: "${h}"`))
  console.log(`\nTotal rows in file: ${rows.length}`)
  console.log(`Detected: Date=${cols!.dateCol} Type=${cols!.typeCol} Sub=${cols!.subCol} Person=${cols!.personCol} Desc=${cols!.descCol} Amount=${cols!.amountCol} Paid=${cols!.paidCol} Bank=${cols!.bankCol} Comments=${cols!.commentsCol}`)
  const { dateCol, typeCol, subCol, personCol, descCol, amountCol, paidCol, bankCol, commentsCol } = cols!

  // Parse all rows from spreadsheet
  interface SheetRow {
    rowNum: number
    date: string | null
    amount: number | null
    vendor: string
    description: string
    expenseType: string
    subCategory: string
    person: string
    paidThrough: string
    bank: string
    comments: string
    raw: string[]
    valid: boolean
    skipReason: string
  }

  const parsed: SheetRow[] = []
  let emptyCount = 0
  let invalidCount = 0
  let validCount = 0

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i] || []
    const raw = row.map((c) => String(c ?? ""))
    const date = parseDate(row[dateCol])
    const amount = parseAmount(row[amountCol])
    const description = String(row[descCol] || "").trim()
    const expenseType = String(row[typeCol] || "").trim()
    const subCategory = String(row[subCol] || "").trim()
    const person = String(row[personCol] || "").trim()
    const paidThrough = String(row[paidCol] || "").trim()
    const bank = String(row[bankCol] || "").trim()
    const comments = String(row[commentsCol] || "").trim()

    // Extract vendor
    let vendor = ""
    if (description) {
      const descStr = description.split(" - ")[0].trim()
      if (descStr && descStr.toLowerCase() !== "nan" && descStr !== "") {
        vendor = descStr
      }
    }

    let valid = true
    let skipReason = ""

    if (!row[dateCol] && !row[amountCol]) {
      emptyCount++
      valid = false
      skipReason = "Empty row (no date, no amount)"
    } else if (!date || !amount) {
      invalidCount++
      valid = false
      skipReason = date ? "Invalid amount" : "Invalid date"
    } else {
      validCount++
    }

    parsed.push({
      rowNum: i + 1,
      date,
      amount,
      vendor,
      description,
      expenseType,
      subCategory,
      person,
      paidThrough,
      bank,
      comments,
      raw,
      valid,
      skipReason,
    })
  }

  console.log(`\nParsed: ${parsed.length} rows (${validCount} valid, ${emptyCount} empty, ${invalidCount} invalid)`)

  // Load DB keys
  const dbExpenses = await p.expense.findMany({
    select: { date: true, amount: true, vendor: true, description: true },
  })
  const dbKeys = new Set(dbExpenses.map((e) =>
    `${e.date.toISOString().split("T")[0]}|${e.amount}|${e.vendor ?? ""}|${e.description ?? ""}`
  ))
  console.log(`DB has ${dbExpenses.length} records`)

  // Find missing rows (valid rows not in DB)
  const missingRows = parsed.filter((r) => {
    if (!r.valid || !r.date || r.amount === null) return false
    const key = `${r.date}|${r.amount}|${r.vendor}|${r.description}`
    return !dbKeys.has(key)
  })

  // Find dupes in spreadsheet (valid rows whose key appears >1 in spreadsheet)
  const keyCount = new Map<string, number>()
  for (const r of parsed) {
    if (!r.valid || !r.date || r.amount === null) continue
    const key = `${r.date}|${r.amount}|${r.vendor}|${r.description}`
    keyCount.set(key, (keyCount.get(key) || 0) + 1)
  }
  const duplicateKeys = new Set([...keyCount.entries()].filter(([, c]) => c > 1).map(([k]) => k))
  const dupeRows = parsed.filter((r) => {
    if (!r.valid || !r.date || r.amount === null) return false
    const key = `${r.date}|${r.amount}|${r.vendor}|${r.description}`
    return duplicateKeys.has(key)
  })

  console.log(`\nMissing from DB (valid rows not found): ${missingRows.length}`)
  console.log(`Duplicate keys in spreadsheet: ${duplicateKeys.size}`)

  // Build output
  const outputRows: unknown[][] = []
  // Header
  outputRows.push(["Status", "Row#", "Date", "Amount", "Vendor", "Description", "Type", "SubCategory", "Person", "PaidThrough", "Bank", "Comments", "Detail"])

  // Empty/invalid rows
  for (const r of parsed) {
    if (!r.valid) {
      outputRows.push(["Skipped", r.rowNum, r.raw[dateCol] || "", r.raw[amountCol] || "", "", "", "", "", "", "", "", "", r.skipReason])
    }
  }

  // Duplicate rows (kept first, mark rest)
  const seen = new Set<string>()
  for (const r of parsed) {
    if (!r.valid || !r.date || r.amount === null) continue
    const key = `${r.date}|${r.amount}|${r.vendor}|${r.description}`
    if (seen.has(key)) {
      outputRows.push(["Duplicate", r.rowNum, r.date, r.amount, r.vendor, r.description, r.expenseType, r.subCategory, r.person, r.paidThrough, r.bank, r.comments, "Duplicate of another row (same date+amount+vendor+description)"])
    } else {
      seen.add(key)
    }
  }

  // Rows in spreadsheet but NOT in DB (not duplicated, just missing)
  const missingKeys = new Set(missingRows.map((r) => `${r.date}|${r.amount}|${r.vendor}|${r.description}`))
  const alreadySeen = new Set<string>()
  for (const r of missingRows) {
    const key = `${r.date}|${r.amount}|${r.vendor}|${r.description}`
    if (alreadySeen.has(key)) continue
    alreadySeen.add(key)
    if (!duplicateKeys.has(key)) {
      outputRows.push(["Missing", r.rowNum, r.date, r.amount, r.vendor, r.description, r.expenseType, r.subCategory, r.person, r.paidThrough, r.bank, r.comments, "In spreadsheet but not in database"])
    }
  }

  // Write output
  const outSheet = XLSX.utils.aoa_to_sheet(outputRows)
  // Set column widths
  outSheet["!cols"] = [
    { wch: 12 }, { wch: 6 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 30 },
    { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 50 },
  ]
  const outBook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(outBook, outSheet, "Missing Analysis")
  const outPath = "missing-records-analysis.xlsx"
  XLSX.writeFile(outBook, outPath)
  console.log(`\nWritten to: ${outPath}`)
  console.log(`\nSummary:`)
  console.log(`  Total rows in spreadsheet:     ${rows.length}`)
  console.log(`  Header row:                    ${headerRow + 1}`)
  console.log(`  Valid parsed rows:             ${validCount}`)
  console.log(`  Empty/invalid rows (skipped):  ${emptyCount + invalidCount}`)
  console.log(`  Duplicate keys in sheet:       ${duplicateKeys.size}`)
  console.log(`  Present in DB:                 ${dbExpenses.length}`)
  console.log(`  Missing from DB:               ${missingRows.length}`)

  await p.$disconnect().catch(() => {})
}

main().catch((error) => {
  console.error("Error:", error)
  process.exit(1)
})
