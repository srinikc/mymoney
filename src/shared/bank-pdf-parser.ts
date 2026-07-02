import type { BankCsvRow } from "./bank-csv-parser"

type BankPdfFormat = "hdfc" | "icici" | "sbi" | "unknown"

function detectBankFormat(text: string): BankPdfFormat {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  const firstFew = lines.slice(0, 20).join(" ").toLowerCase()

  if (firstFew.includes("hdfc bank") || (firstFew.includes("hdfc") && firstFew.includes("statement"))) {
    return "hdfc"
  }
  if (firstFew.includes("icici bank") || (firstFew.includes("icici") && firstFew.includes("statement"))) {
    return "icici"
  }
  if (firstFew.includes("state bank of india") || firstFew.includes("sbi") || (firstFew.includes("sbi") && firstFew.includes("statement"))) {
    return "sbi"
  }

  return "unknown"
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

  // Try MMM DD YYYY or DD MMM YYYY
  const mdy = raw.match(/(\d{1,2})\s+(\w{3,9})\s+(\d{4})/)
  if (mdy) {
    const d = new Date(`${mdy[2]} ${mdy[1]}, ${mdy[3]}`)
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

/**
 * Parse HDFC Bank PDF statement text.
 * HDFC PDFs typically have transaction lines like:
 * "DD/MM/YYYY  NARRATION TEXT  CHQ/REF  DD/MM/YYYY  WITHDRAWAL  DEPOSIT  BALANCE"
 */
function parseHdfcPdfText(text: string): BankCsvRow[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  const result: BankCsvRow[] = []

  for (const line of lines) {
    // Look for date pattern at start of line: DD/MM/YYYY
    const dateMatch = line.match(/^((?:\d{2}\/){2}\d{4})\s+(.+)/)
    if (!dateMatch) {
      continue
    }

    const dateStr = dateMatch[1]
    const rest = dateMatch[2]

    // Try to extract: description, withdrawal, deposit, balance
    // Pattern: ... WITHDRAWAL_AMT  DEPOSIT_AMT  BALANCE
    const amtMatch = rest.match(/([\d,]+\.\d{2})\s+([\d,]+\.\d{2}|-)\s+([\d,]+\.\d{2}|-)$/)
    if (!amtMatch) {
      // Maybe just deposit and balance
      const altMatch = rest.match(/([\d,]+\.\d{2}|-)\s+([\d,]+\.\d{2}|-)\s*$/)
      if (altMatch) {
        const deposit = parseAmountStr(altMatch[1])
        const balance = parseAmountStr(altMatch[2])
        const description = rest.slice(0, rest.length - altMatch[0].length).trim()

        const date = parseDateStr(dateStr)

        if (deposit > 0) {
          result.push({ date, description, amount: deposit, type: "credit", balance, reference: undefined })
        }
      }
      continue
    }

    const withdrawal = parseAmountStr(amtMatch[1])
    const deposit = parseAmountStr(amtMatch[2])
    const balance = parseAmountStr(amtMatch[3])
    const description = rest.slice(0, rest.length - amtMatch[0].length).trim()

    const date = parseDateStr(dateStr)

    if (withdrawal > 0) {
      result.push({ date, description, amount: withdrawal, type: "debit", balance })
    } else if (deposit > 0) {
      result.push({ date, description, amount: deposit, type: "credit", balance })
    }
  }

  return result
}

/**
 * Parse ICICI Bank PDF statement text.
 * ICICI PDFs have transaction lines with:
 * "DD/MM/YYYY  DESCRIPTION  REF  DEBIT  CREDIT  BALANCE"
 */
function parseIciciPdfText(text: string): BankCsvRow[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  const result: BankCsvRow[] = []

  for (const line of lines) {
    const dateMatch = line.match(/^((?:\d{2}\/){2}\d{4})\s+(.+)/)
    if (!dateMatch) continue

    const dateStr = dateMatch[1]
    const rest = dateMatch[2]

    // Try to extract: debit, credit, balance at end
    const amtMatch = rest.match(/([\d,]+\.\d{2}|-)\s+([\d,]+\.\d{2}|-)\s+([\d,]+\.\d{2}|-)\s*$/)
    if (!amtMatch) continue

    const debit = parseAmountStr(amtMatch[1])
    const credit = parseAmountStr(amtMatch[2])
    const balance = parseAmountStr(amtMatch[3])
    const description = rest.slice(0, rest.length - amtMatch[0].length).trim()

    const date = parseDateStr(dateStr)

    if (debit > 0) {
      result.push({ date, description, amount: debit, type: "debit", balance })
    } else if (credit > 0) {
      result.push({ date, description, amount: credit, type: "credit", balance })
    }
  }

  return result
}

/**
 * Parse SBI Bank PDF statement text.
 * SBI PDFs have transaction lines with:
 * "DD/MM/YYYY  DESCRIPTION  REF  DEBIT  CREDIT  BALANCE"
 */
function parseSbiPdfText(text: string): BankCsvRow[] {
  // SBI format is similar to ICICI for most statements
  return parseIciciPdfText(text)
}

export async function parseBankPdf(buffer: Buffer): Promise<{
  format: BankPdfFormat
  rows: BankCsvRow[]
  rawText: string
}> {
  const { extractPdfText } = await import("@/shared/pdf-utils")
  const text = await extractPdfText(buffer)

  const format = detectBankFormat(text)

  let rows: BankCsvRow[]
  switch (format) {
    case "hdfc": {
      rows = parseHdfcPdfText(text)
      break
    }
    case "icici": {
      rows = parseIciciPdfText(text)
      break
    }
    case "sbi": {
      rows = parseSbiPdfText(text)
      break
    }
    default: {
      // Try all parsers and pick the best
      const hdfc = parseHdfcPdfText(text)
      const icici = parseIciciPdfText(text)
      const sbi = parseSbiPdfText(text)
      const all = [hdfc, icici, sbi].sort((a, b) => b.length - a.length)
      rows = all[0]
      break
    }
  }

  return { format, rows, rawText: text }
}
