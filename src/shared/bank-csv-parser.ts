export interface BankCsvRow {
  date: string
  description: string
  amount: number
  type: "debit" | "credit"
  balance: number | null
  category?: string
  reference?: string
}

export interface ColumnMapping {
  date: string
  description: string
  debit: string
  credit: string
  balance?: string
  reference?: string
}

type BankFormat = "hdfc" | "icici" | "sbi" | "generic"

function detectBankFormat(headers: string[]): BankFormat {
  const h = headers.map((x) => x.toLowerCase().trim())

  // HDFC: Date, Narration, Chq/Ref Number, Value Dt, Withdrawal Amt, Deposit Amt, Closing Balance
  if (
    h.some((x) => x.includes("narration")) &&
    h.some((x) => /withdrawal/i.test(x)) &&
    h.some((x) => /deposit/i.test(x)) &&
    h.some((x) => /closing balance/i.test(x))
  ) {
    return "hdfc"
  }

  // ICICI / SBI: Date, Value Date, Description, Ref No., Debit, Credit, Balance
  if (
    h.some((x) => /txn date|transaction date/i.test(x) || x === "date") &&
    h.some((x) => /value date/i.test(x)) &&
    h.some((x) => /description|narration/i.test(x)) &&
    h.some((x) => /ref/i.test(x)) &&
    h.some((x) => /debit/i.test(x)) &&
    h.some((x) => /credit/i.test(x)) &&
    h.some((x) => /balance/i.test(x))
  ) {
    // SBI uses "Txn Date", ICICI uses "Date"
    if (h.some((x) => /txn date|transaction date/i.test(x))) {
      return "sbi"
    }
    return "icici"
  }

  return "generic"
}

function parseDateStr(raw: string): string {
  // Try DD/MM/YYYY
  const dmy = raw.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`

  // Try DD-MM-YYYY
  const dmy2 = raw.match(/(\d{2})-(\d{2})-(\d{4})/)
  if (dmy2) return `${dmy2[3]}-${dmy2[2].padStart(2, "0")}-${dmy2[1].padStart(2, "0")}`

  // Try YYYY-MM-DD
  const ymd = raw.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (ymd) return raw

  // Try MMM DD YYYY
  const mdy = raw.match(/(\w{3,9})\s+(\d{1,2}),?\s+(\d{4})/)
  if (mdy) {
    const d = new Date(mdy[0])
    if (!Number.isNaN(d.getTime())) return d.toISOString().split("T")[0]
  }

  return raw
}

function parseAmountStr(raw: string): number {
  if (!raw || raw.trim() === "" || raw.trim() === "-") return 0
  const cleaned = String(raw).replaceAll(/[^\d.-]/g, "")
  const n = Number.parseFloat(cleaned)
  return Number.isNaN(n) ? 0 : n
}

function parseCsvRows(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/)
  const rows: string[][] = []

  for (const line of lines) {
    if (!line.trim()) continue
    const cols: string[] = []
    let current = ""
    let inQuotes = false

    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === "," && !inQuotes) {
        cols.push(current.trim())
        current = ""
      } else {
        current += ch
      }
    }
    cols.push(current.trim())
    rows.push(cols)
  }

  return rows
}

function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const rowText = rows[i].join(" ").toLowerCase()
    if (
      rowText.includes("date") &&
      (rowText.includes("narration") || rowText.includes("description")) &&
      (rowText.includes("amount") || rowText.includes("debit") || rowText.includes("credit") || rowText.includes("withdrawal"))
    ) {
      return i
    }
  }
  return 0
}

function normalizeHeaders(headers: string[], format: BankFormat): ColumnMapping | null {
  const h = headers.map((x) => x.toLowerCase().trim())

  if (format === "hdfc") {
    return {
      date: h.find((x) => /^date$/.test(x)) || "date",
      description: h.find((x) => /narration/.test(x)) || "narration",
      debit: h.find((x) => /withdrawal/i.test(x)) || "withdrawal amt",
      credit: h.find((x) => /deposit/i.test(x)) || "deposit amt",
      balance: h.find((x) => /closing balance/i.test(x)) || "closing balance",
      reference: h.find((x) => /chq|ref/i.test(x)) || undefined,
    }
  }

  if (format === "icici" || format === "sbi") {
    return {
      date: h.find((x) => /txn date|transaction date|^date$/.test(x)) || "date",
      description: h.find((x) => /description|narration/i.test(x)) || "description",
      debit: h.find((x) => /debit/i.test(x)) || "debit",
      credit: h.find((x) => /credit/i.test(x)) || "credit",
      balance: h.find((x) => /^balance$/.test(x)) || "balance",
      reference: h.find((x) => /ref/i.test(x)) || undefined,
    }
  }

  return null
}

export function parseHDFCsv(csvText: string): BankCsvRow[] {
  const rows = parseCsvRows(csvText)
  if (rows.length < 2) return []

  const headerRow = findHeaderRow(rows)
  const mapping = normalizeHeaders(rows[headerRow], "hdfc")
  if (!mapping) return []

  const dateIdx = rows[headerRow].findIndex((h) => h.toLowerCase().trim() === mapping.date)
  const descIdx = rows[headerRow].findIndex((h) => h.toLowerCase().trim() === mapping.description)
  const debitIdx = rows[headerRow].findIndex((h) => h.toLowerCase().trim() === mapping.debit)
  const creditIdx = rows[headerRow].findIndex((h) => h.toLowerCase().trim() === mapping.credit)
  const balIdx = mapping.balance ? rows[headerRow].findIndex((h) => h.toLowerCase().trim() === mapping.balance) : -1
  const refIdx = mapping.reference ? rows[headerRow].findIndex((h) => h.toLowerCase().trim() === mapping.reference) : -1

  const result: BankCsvRow[] = []

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.length < 2) continue

    const date = dateIdx >= 0 && row[dateIdx] ? parseDateStr(row[dateIdx]) : ""
    const description = descIdx >= 0 && row[descIdx] ? row[descIdx] : ""
    const debit = debitIdx >= 0 ? parseAmountStr(row[debitIdx]) : 0
    const credit = creditIdx >= 0 ? parseAmountStr(row[creditIdx]) : 0
    const balance = balIdx >= 0 ? parseAmountStr(row[balIdx]) : null
    const reference = refIdx >= 0 && row[refIdx] ? row[refIdx] : undefined

    if (!date) continue

    const amount = debit > 0 ? debit : credit
    const type: "debit" | "credit" = debit > 0 ? "debit" : "credit"

    if (amount === 0 && debit === 0 && credit === 0) continue

    result.push({ date, description, amount, type, balance, reference })
  }

  return result
}

export function parseICICIcsv(csvText: string): BankCsvRow[] {
  const rows = parseCsvRows(csvText)
  if (rows.length < 2) return []

  const headerRow = findHeaderRow(rows)
  const headers = rows[headerRow]

  // ICICI: Date, Value Date, Description, Ref No./Cheque No., Debit, Credit, Balance
  const dateIdx = headers.findIndex((h) => /^date$/i.test(h.trim()))
  const descIdx = headers.findIndex((h) => /description|narration/i.test(h.trim()))
  const refIdx = headers.findIndex((h) => /ref/i.test(h.trim()))
  const debitIdx = headers.findIndex((h) => /^debit$/i.test(h.trim()))
  const creditIdx = headers.findIndex((h) => /^credit$/i.test(h.trim()))
  const balIdx = headers.findIndex((h) => /^balance$/i.test(h.trim()))

  if (dateIdx === -1 || debitIdx === -1 || creditIdx === -1) return []

  const result: BankCsvRow[] = []

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.length < 2) continue

    const date = dateIdx >= 0 && row[dateIdx] ? parseDateStr(row[dateIdx]) : ""
    const description = descIdx >= 0 && row[descIdx] ? row[descIdx] : ""
    const debit = debitIdx >= 0 ? parseAmountStr(row[debitIdx]) : 0
    const credit = creditIdx >= 0 ? parseAmountStr(row[creditIdx]) : 0
    const balance = balIdx >= 0 ? parseAmountStr(row[balIdx]) : null
    const reference = refIdx >= 0 && row[refIdx] ? row[refIdx] : undefined

    if (!date) continue

    const amount = debit > 0 ? debit : credit
    const type: "debit" | "credit" = debit > 0 ? "debit" : "credit"

    if (amount === 0 && debit === 0 && credit === 0) continue

    result.push({ date, description, amount, type, balance, reference })
  }

  return result
}

export function parseSBICsv(csvText: string): BankCsvRow[] {
  const rows = parseCsvRows(csvText)
  if (rows.length < 2) return []

  const headerRow = findHeaderRow(rows)
  const headers = rows[headerRow]

  // SBI: Txn Date, Value Date, Description, Ref No., Debit, Credit, Balance
  const dateIdx = headers.findIndex((h) => /txn date|transaction date/i.test(h.trim()))
  const descIdx = headers.findIndex((h) => /description|narration/i.test(h.trim()))
  const refIdx = headers.findIndex((h) => /ref/i.test(h.trim()))
  const debitIdx = headers.findIndex((h) => /^debit$/i.test(h.trim()))
  const creditIdx = headers.findIndex((h) => /^credit$/i.test(h.trim()))
  const balIdx = headers.findIndex((h) => /^balance$/i.test(h.trim()))

  // Fallback: if Txn Date not found, try "Date"
  const dateIdxFallback = dateIdx === -1 ? headers.findIndex((h) => /^date$/i.test(h.trim())) : dateIdx

  if ((dateIdx === -1 && dateIdxFallback === -1) || debitIdx === -1 || creditIdx === -1) return []

  const result: BankCsvRow[] = []

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.length < 2) continue

    const di = dateIdx >= 0 ? dateIdx : dateIdxFallback
    const date = di >= 0 && row[di] ? parseDateStr(row[di]) : ""
    const description = descIdx >= 0 && row[descIdx] ? row[descIdx] : ""
    const debit = debitIdx >= 0 ? parseAmountStr(row[debitIdx]) : 0
    const credit = creditIdx >= 0 ? parseAmountStr(row[creditIdx]) : 0
    const balance = balIdx >= 0 ? parseAmountStr(row[balIdx]) : null
    const reference = refIdx >= 0 && row[refIdx] ? row[refIdx] : undefined

    if (!date) continue

    const amount = debit > 0 ? debit : credit
    const type: "debit" | "credit" = debit > 0 ? "debit" : "credit"

    if (amount === 0 && debit === 0 && credit === 0) continue

    result.push({ date, description, amount, type, balance, reference })
  }

  return result
}

export function parseGenericCsv(csvText: string, mapping: ColumnMapping): BankCsvRow[] {
  const rows = parseCsvRows(csvText)
  if (rows.length < 2) return []

  const headerRow = findHeaderRow(rows)
  const headers = rows[headerRow].map((h) => h.toLowerCase().trim())

  const dateIdx = headers.indexOf(mapping.date.toLowerCase())
  const descIdx = headers.indexOf(mapping.description.toLowerCase())
  const debitIdx = headers.indexOf(mapping.debit.toLowerCase())
  const creditIdx = headers.indexOf(mapping.credit.toLowerCase())
  const balIdx = mapping.balance ? headers.indexOf(mapping.balance.toLowerCase()) : -1
  const refIdx = mapping.reference ? headers.indexOf(mapping.reference.toLowerCase()) : -1

  const result: BankCsvRow[] = []

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.length < 2) continue

    const date = dateIdx >= 0 && row[dateIdx] ? parseDateStr(row[dateIdx]) : ""
    const description = descIdx >= 0 && row[descIdx] ? row[descIdx] : ""
    const debit = debitIdx >= 0 ? parseAmountStr(row[debitIdx]) : 0
    const credit = creditIdx >= 0 ? parseAmountStr(row[creditIdx]) : 0
    const balance = balIdx >= 0 ? parseAmountStr(row[balIdx]) : null
    const reference = refIdx >= 0 && row[refIdx] ? row[refIdx] : undefined

    if (!date) continue

    const amount = debit > 0 ? debit : credit
    const type: "debit" | "credit" = debit > 0 ? "debit" : "credit"

    if (amount === 0 && debit === 0 && credit === 0) continue

    result.push({ date, description, amount, type, balance, reference })
  }

  return result
}

export function autoDetectAndParse(csvText: string): { format: BankFormat; rows: BankCsvRow[]; headers: string[] } {
  const parsed = parseCsvRows(csvText)
  if (parsed.length === 0) {
    return { format: "generic", rows: [], headers: [] }
  }

  const headerRowIdx = findHeaderRow(parsed)
  const headers = parsed[headerRowIdx]
  const format = detectBankFormat(headers)

  let rows: BankCsvRow[]
  switch (format) {
    case "hdfc": {
      rows = parseHDFCsv(csvText)
      break
    }
    case "icici": {
      rows = parseICICIcsv(csvText)
      break
    }
    case "sbi": {
      rows = parseSBICsv(csvText)
      break
    }
    default: {
      // Try each parser and pick the one with most results
      const hdfc = parseHDFCsv(csvText)
      const icici = parseICICIcsv(csvText)
      const sbi = parseSBICsv(csvText)
      const best = [hdfc, icici, sbi].sort((a, b) => b.length - a.length)[0]
      rows = best
      break
    }
  }

  return { format, rows, headers }
}
