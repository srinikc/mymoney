import type { BankCsvRow } from "./bank-csv-parser"

type BankPdfFormat = "hdfc" | "icici" | "sbi" | "yesbank" | "axis" | "unknown"

function detectBankFormat(text: string): BankPdfFormat {
  // Search first 80 lines for bank identifiers (many PDFs have multi-page headers)
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  const searchChunk = lines.slice(0, 80).join(" ").toLowerCase()

  // 1. Explicit bank name keywords (highest confidence)
  if (searchChunk.includes("yes bank") || searchChunk.includes("yesbank")) {
    return "yesbank"
  }
  if (searchChunk.includes("axis bank") || searchChunk.includes("axisbank")) {
    return "axis"
  }
  if (searchChunk.includes("hdfc bank") || (searchChunk.includes("hdfc") && searchChunk.includes("statement"))) {
    return "hdfc"
  }
  if (searchChunk.includes("icici bank") || (searchChunk.includes("icici") && searchChunk.includes("statement"))) {
    return "icici"
  }
  if (searchChunk.includes("state bank of india") || searchChunk.includes("sbi") || (searchChunk.includes("sbi") && searchChunk.includes("statement"))) {
    return "sbi"
  }

  // 2. Pattern-based detection from transaction text (fallback)
  //    Check a larger sample for distinctive date/narration patterns
  const sampleText = lines.slice(0, 200).join(" ")

  // Yes Bank: DD-Mon-YYYY dates (02-Jan-2026) + to:vpa UPI pattern
  if (/\d{2}-[A-Za-z]{3}-\d{4}/.test(sampleText) && /to:[^\s/]+@/i.test(sampleText)) {
    return "yesbank"
  }
  // Yes Bank: DD-Mon-YYYY dates alone are a strong signal
  if (/\d{2}-[A-Za-z]{3}-\d{4}/.test(sampleText)) {
    return "yesbank"
  }

  // Axis: UPI/P2A/... pattern with slash-separated segments
  if (/upi\/p2[am]\//i.test(sampleText)) {
    return "axis"
  }

  // HDFC: UPI-merchant-context (dash-separated) pattern
  if (/upi-[a-z]/i.test(sampleText) && /\bchq\b|\bref\b|\bnarration\b/i.test(sampleText)) {
    return "hdfc"
  }

  // SBI: UPI/DR/ref/merchant pattern
  if (/upi\/dr\/[\d.]+\/[a-z]/i.test(sampleText)) {
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

  // Try DD-Mon-YYYY (Yes Bank format: 02-Jan-2026)
  const monthMap: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  }
  const dmyMon = raw.match(/(\d{2})-([A-Za-z]{3})-(\d{4})/)
  if (dmyMon) {
    const mm = monthMap[dmyMon[2].toLowerCase()]
    if (mm) return `${dmyMon[3]}-${mm}-${dmyMon[1]}`
  }

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


/**
 * Parse Yes Bank PDF statement text.
 * Yes Bank PDFs have:
 * - DD-Mon-YYYY dates (02-Jan-2026)
 * - Multi-line UPI/IMPS/ACH narrations
 * - Amounts at end of each transaction block: [Withdrawal] [Deposit] Balance
 *   (typically only one of withdrawal/deposit is non-zero, so 2 amounts appear)
 * - Reference codes like AXI...OUT, PLUTUS...OUT
 *
 * Also handles common variants:
 * - Single-date lines (no value date)
 * - DD/MM/YYYY or DD-MM-YYYY date formats
 * - Amounts with or without commas
 * - Lines where amounts appear mid-line (not just at end)
 */
function parseYesBankPdfText(text: string): BankCsvRow[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  const result: BankCsvRow[] = []

  // Flexible date pattern: DD-Mon-YYYY, DD/MM/YYYY, DD-MM-YYYY, Mon DD YYYY
  const datePatterns = [
    /(\d{2}-[A-Za-z]{3}-\d{4})/,   // 02-Jan-2026
    /((?:\d{2}\/){2}\d{4})/,        // 02/01/2026
    /((?:\d{2}-){2}\d{4})/,         // 02-01-2026
  ]

  function extractDate(line: string): { date: string; rest: string } | null {
    for (const pat of datePatterns) {
      const m = line.match(pat)
      if (m) {
        const date = parseDateStr(m[1])
        const rest = line.slice(m.index! + m[0].length).trim()
        return { date, rest }
      }
    }
    return null
  }

  // Primary: DD-Mon-YYYY with two dates (original format)
  const txnStartRe = /^(\d{2}-[A-Za-z]{3}-\d{4})\s+\d{2}-[A-Za-z]{3}-\d{4}\s+/
  // Secondary: single date at line start in any format
  const singleDateRe = /^(\d{2}[-/][A-Za-z\d]{2,}[-/]\d{4}|(?:\d{2}\/){2}\d{4})\s+/
  // Amount pattern: two numbers at end (amount + balance, or withdrawal + deposit)
  const amountsEndRe = /([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s*$/
  // Amount pattern: three numbers at end (withdrawal + deposit + balance)
  const amounts3EndRe = /([\d,]+\.\d{2}|-)\s+([\d,]+\.\d{2}|-)\s+([\d,]+\.\d{2}|-)\s*$/

  let prevBalance = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Try primary pattern first, then secondary
    const isTxnStart = txnStartRe.test(line) || singleDateRe.test(line)
    if (!isTxnStart) continue

    const blockLines: string[] = [line]
    let foundAmounts = amountsEndRe.test(line) || amounts3EndRe.test(line)

    while (!foundAmounts && i + 1 < lines.length) {
      const next = lines[i + 1]
      // Stop if next line is also a transaction start
      if (txnStartRe.test(next) || singleDateRe.test(next)) break
      i++
      blockLines.push(next)
      foundAmounts = amountsEndRe.test(next) || amounts3EndRe.test(next)
    }

    if (!foundAmounts) continue

    const fullBlock = blockLines.join(" ")

    function cleanDesc(raw: string): string {
      return raw
        // Strip dates anywhere: DD-Mon-YYYY, DD/MM/YYYY, DD-MM-YYYY
        .replace(/\d{2}[-/][A-Za-z\d]{2,}[-/]\d{4}/g, "")
        .replace(/(?:\d{2}\/){2}\d{4}/g, "")
        // Strip reference codes like AXIf31aed..., PLUTUS..., UPI ref strings (anywhere)
        .replace(/\b[A-Z]{3}[\dA-Za-z]{8,}\b/g, "")
        // Strip UPI/DR/... or UPI/CR/... prefix
        .replace(/^UPI\/(?:DR|CR)\/[\d.]+\/\s*/i, "")
        // Strip IMPS/... prefix
        .replace(/^IMPS\/[\w]+\/[\d.]+\/\s*/i, "")
        // Strip leading/trailing whitespace
        .replace(/\s{2,}/g, " ")
        .trim()
    }

    // Try 3-amount pattern first, then 2-amount
    let amountsMatch = fullBlock.match(amounts3EndRe)
    let amt1: number, amt2: number, amt3: number
    let description: string

    if (amountsMatch) {
      amt1 = parseAmountStr(amountsMatch[1])
      amt2 = parseAmountStr(amountsMatch[2])
      amt3 = parseAmountStr(amountsMatch[3])
      const descPortion = fullBlock.slice(0, fullBlock.length - amountsMatch[0].length).trim()
      description = cleanDesc(descPortion)
    } else {
      amountsMatch = fullBlock.match(amountsEndRe)
      if (!amountsMatch) continue
      amt1 = parseAmountStr(amountsMatch[1])
      amt2 = parseAmountStr(amountsMatch[2])
      amt3 = 0
      const descPortion = fullBlock.slice(0, fullBlock.length - amountsMatch[0].length).trim()
      description = cleanDesc(descPortion)
    }

    // Extract date from first line of block
    const dateInfo = extractDate(blockLines[0])
    const date = dateInfo?.date ?? ""

    // Determine amounts
    let balance: number
    let amount: number

    if (amt3 > 0) {
      // 3-amount format: [withdrawal, deposit, balance]
      if (amt1 > 0 && amt2 === 0) {
        // withdrawal + balance
        amount = amt1
        balance = amt3 || amt2
      } else if (amt2 > 0 && amt1 === 0) {
        // deposit + balance
        amount = amt2
        balance = amt3 || amt1
      } else {
        // All three present: amt1=withdrawal, amt2=deposit, amt3=balance
        amount = amt1 > 0 ? amt1 : amt2
        balance = amt3
      }
    } else {
      // 2-amount format: amount + balance
      amount = amt1
      balance = amt2
    }

    // Detect credit/debit from text
    const refMatch = fullBlock.match(/[A-Z]{3}[\dA-Za-z]{10,}(OUT|IN)/)
    const refOut = refMatch?.[1] === "OUT"

    const isCreditKeyword = /\bcr\b|\/cr|neft\s+cr|credit|deposit|cash\s*credit/i.test(fullBlock)
    const isDebitKeyword = /\bdr\b|\/dr|ach\s+dr|debit|withdrawal|atm|upi|imps|neft\s*dr|transfer\s*out/i.test(fullBlock)

    let type: "debit" | "credit"
    if (refOut || isDebitKeyword) {
      type = "debit"
    } else if (isCreditKeyword) {
      type = "credit"
    } else if (prevBalance > 0 && balance > 0) {
      type = balance > prevBalance ? "credit" : "debit"
    } else {
      // Default: if amount looks like a round number and no clues, try balance comparison
      type = "debit"
    }

    prevBalance = balance

    if (amount > 0) {
      result.push({ date, description, amount, type, balance })
    }
  }

  return result
}

/**
 * Parse Axis Bank PDF statement text.
 * Axis PDF format is similar to HDFC. Reusing HDFC parser as a starting point.
 */
function parseAxisPdfText(text: string): BankCsvRow[] {
  return parseHdfcPdfText(text)
}

/**
 * Generic fallback parser: tries to find any transaction-like lines in the text.
 * Looks for lines with a date and at least one amount. Used when bank-specific
 * parsers fail to extract any rows.
 */
function parseGenericPdfText(text: string): BankCsvRow[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  const result: BankCsvRow[] = []

  // Flexible date patterns
  const dateRe = /(\d{2}[\/-]\d{2}[\/-]\d{4}|\d{2}-[A-Za-z]{3}-\d{4})/
  // Amount pattern: number with optional commas and decimal
  const amountRe = /([\d,]+\.\d{2})/

  for (const line of lines) {
    const dateMatch = line.match(dateRe)
    if (!dateMatch) continue

    const date = parseDateStr(dateMatch[1])
    // Skip lines that look like headers or summary text
    if (!date || date === dateMatch[1]) continue

    // Find all amounts in the line
    const amounts: number[] = []
    let m: RegExpExecArray | null
    const amtGlobal = new RegExp(amountRe.source, "g")
    while ((m = amtGlobal.exec(line)) !== null) {
      const val = parseAmountStr(m[1])
      if (val > 0) amounts.push(val)
    }

    if (amounts.length === 0) continue

    // Extract description: text between date and first amount
    const afterDate = line.slice(line.indexOf(dateMatch[0]) + dateMatch[0].length)
    const firstAmtIdx = afterDate.search(amountRe)
    const description = firstAmtIdx > 0
      ? afterDate.slice(0, firstAmtIdx).trim()
      : afterDate.trim()

    // Skip very short descriptions (likely headers/footers)
    if (description.length < 2 && amounts.length < 2) continue

    let amount: number
    let balance: number
    let type: "debit" | "credit"

    if (amounts.length >= 3) {
      // Likely: withdrawal, deposit, balance
      const [a, b, c] = amounts
      if (a > 0 && b === 0) {
        amount = a; balance = c; type = "debit"
      } else if (b > 0 && a === 0) {
        amount = b; balance = c; type = "credit"
      } else {
        amount = a > 0 ? a : b; balance = c; type = "debit"
      }
    } else if (amounts.length === 2) {
      // amount + balance
      amount = amounts[0]
      balance = amounts[1]
      type = "debit"
    } else {
      amount = amounts[0]
      balance = 0
      type = "debit"
    }

    // Try to detect credit/debit from description
    const descLower = (description + " " + line).toLowerCase()
    if (/\bcr\b|credit|deposit|neft.*cr/i.test(descLower)) {
      type = "credit"
    } else if (/\bdr\b|debit|withdrawal|atm|upi|imps|transfer.*out/i.test(descLower)) {
      type = "debit"
    }

    result.push({ date, description, amount, type, balance })
  }

  return result
}

export async function parseBankPdf(buffer: Buffer, bankHint?: string): Promise<{
  format: BankPdfFormat
  rows: BankCsvRow[]
  rawText: string
}> {
  const { extractPdfText } = await import("@/shared/pdf-utils")
  const text = await extractPdfText(buffer)

  // If user explicitly chose a bank, use that; otherwise auto-detect
  const detectedFormat = detectBankFormat(text)
  const format: BankPdfFormat = (bankHint && bankHint !== "generic" && bankHint !== "unknown")
    ? bankHint as BankPdfFormat
    : detectedFormat
  console.log("[bank-pdf] detected:", detectedFormat, "using:", format, "textLen:", text.length)

  function parseWithFormat(f: BankPdfFormat): BankCsvRow[] {
    switch (f) {
      case "yesbank": return parseYesBankPdfText(text)
      case "axis": return parseAxisPdfText(text)
      case "hdfc": return parseHdfcPdfText(text)
      case "icici": return parseIciciPdfText(text)
      case "sbi": return parseSbiPdfText(text)
      default: return []
    }
  }

  let rows = parseWithFormat(format)

  // If the chosen parser got 0 rows, try the other parsers as fallback
  if (rows.length === 0) {
    console.log("[bank-pdf] primary parser got 0 rows, trying fallbacks")
    const allFormats: BankPdfFormat[] = ["yesbank", "axis", "hdfc", "icici", "sbi"]
    for (const f of allFormats) {
      if (f === format) continue
      const fallback = parseWithFormat(f)
      if (fallback.length > rows.length) {
        rows = fallback
        console.log("[bank-pdf] fallback", f, "got", fallback.length, "rows")
      }
    }
    // Last resort: generic parser
    if (rows.length === 0) {
      rows = parseGenericPdfText(text)
      console.log("[bank-pdf] generic fallback got", rows.length, "rows")
    }
  }

  console.log("[bank-pdf] rows:", rows.length)
  return { format, rows, rawText: text }
}
