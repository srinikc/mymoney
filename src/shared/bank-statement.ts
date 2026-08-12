import { autoDetectAndParse, type BankCsvRow } from "@/shared/bank-csv-parser"

// Bank names we can run enrichment for. Mirrors run_pipeline_v43.py:48-55.
export type BankName = "yesbank" | "axis" | "hdfc" | "icici" | "sbi" | "generic" | "unknown"

export interface LoadedStatement {
  bank: BankName
  rows: BankCsvRow[] // debit + credit rows; enrichment only uses debit
  fileName: string
  notes?: string
}

// Last-4 → bank routing, same as BANK_MAP (run_pipeline_v43.py:48-55).
export const BANK_MAP: Record<string, BankName> = {
  "1444": "yesbank",
  "3895": "sbi",
  "1655": "hdfc",
  "5158": "axis",
  "5801": "axis",
  "1580": "axis",
}

export function last4FromBankAccount(account?: string | null): string | null {
  if (!account) return null
  const m = account.match(/(\d{4})\s*$/i)
  return m ? m[1] : null
}

export function bankFromAccount(account?: string | null): BankName | null {
  const last4 = last4FromBankAccount(account)
  return last4 ? BANK_MAP[last4] ?? null : null
}

function fixSci(text: string): string {
  return String(text).replaceAll(/\d+\.\d+[Ee][+-]\d+/g, (m) => {
    const n = Number(m)
    return Number.isFinite(n) ? String(Math.trunc(n)) : m
  })
}

export function normalizeDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = String(raw).trim()
  const dmy = s.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`
  const dmy2 = s.match(/(\d{2})-(\d{2})-(\d{4})/)
  if (dmy2) return `${dmy2[3]}-${dmy2[2].padStart(2, "0")}-${dmy2[1].padStart(2, "0")}`
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const mdy = s.match(/(\w{3,9})\s+(\d{1,2}),?\s+(\d{4})/)
  if (mdy) {
    const d = new Date(mdy[0])
    if (!Number.isNaN(d.getTime())) return d.toISOString().split("T")[0]
  }
  return null
}

export function parseAmount(raw: string | number | null | undefined): number {
  if (raw == null) return 0
  if (typeof raw === "number") return raw
  const s = String(raw).trim()
  if (s === "" || s === "-") return 0
  const cleaned = s.replaceAll(/[^\d.-]/g, "")
  const n = Number.parseFloat(cleaned)
  return Number.isNaN(n) ? 0 : n
}

export function amountMatch(a: unknown, b: unknown, tolerance = 1): boolean {
  try {
    const x = Number(String(a ?? "").replaceAll(',', ""))
    const y = Number(String(b ?? "").replaceAll(',', ""))
    if (Number.isNaN(x) || Number.isNaN(y)) return false
    return Math.abs(x - y) <= tolerance
  } catch {
    return false
  }
}

const cellText = (v: unknown): string => (v == null ? "" : String(v).trim())

function parseCsvRows(csvText: string): string[][] {
  const lines = csvText.split(/\r?\n/)
  const out: string[][] = []
  for (const line of lines) {
    if (!line.trim()) continue
    const cols: string[] = []
    let cur = ""
    let inQ = false
    for (const ch of line) {
      if (ch === '"') inQ = !inQ
      else if (ch === "," && !inQ) { cols.push(cur.trim()); cur = "" }
      else cur += ch
    }
    cols.push(cur.trim())
    out.push(cols)
  }
  return out
}

// ── Matrix → BankCsvRow (shared by CSV and XLSX) ─────────────────────────────

interface ColDeps {
  date: number
  desc: number
  debit: number
  credit: number
  bal: number
}

function detectColumns(headers: string[]): { bank: BankName | null; deps: ColDeps } | null {
  const h = headers.map((x) => x.toLowerCase().trim())

  const findCol = (pats: RegExp[]): number => {
    for (const [j, header] of headers.entries()) {
      const hl = header.toLowerCase().trim()
      if (pats.some((p) => p.test(hl))) return j
    }
    return -1
  }

  const deps: ColDeps = {
    date: findCol([/(transaction date|tran date|txn date|value date)/i, /^date$/i, /date/i]),
    desc: findCol([/narration/i, /particulars/i, /details/i, /description/i]),
    debit: findCol([/withdrawal/i, /^debit$/i, /^dr$/i]),
    credit: findCol([/deposit/i, /^credit$/i, /^cr$/i]),
    bal: findCol([/balance/i]),
  }

  if (deps.date < 0 || deps.desc < 0 || (deps.debit < 0 && deps.credit < 0)) return null

  let bank: BankName | null = null
  if (h.some((x) => /tran/i.test(x)) && h.some((x) => /particulars/i.test(x))) {
    bank = "axis"
  } else if (h.some((x) => /narration/i.test(x)) && (h.some((x) => /withdrawal/i.test(x)) || h.some((x) => /chq/i.test(x)))) {
    const hasValueDate = h.some((x) => /value date/i.test(x))
    bank = hasValueDate ? "hdfc" : "hdfc"
  } else if (h.some((x) => /txn date|transaction date/i.test(x)) && h.some((x) => /details|description/i.test(x))) {
    bank = "sbi"
  } else if (h.some((x) => /deposit/i.test(x))) {
    bank = "yesbank"
  }

  return { bank, deps }
}

function rowsFromMatrix(matrix: unknown[][]): { bank: BankName | null; rows: BankCsvRow[] } {
  if (matrix.length === 0) return { bank: null, rows: [] }

  let headerRow = 0
  for (let i = 0; i < Math.min(20, matrix.length); i++) {
    const t = matrix[i].map((c) => cellText(c)).join(" ").toLowerCase()
    if (
      (t.includes("date") || t.includes("tran") || t.includes("txn")) &&
      (t.includes("description") || t.includes("narration") || t.includes("particulars") || t.includes("details")) &&
      (t.includes("withdrawal") || t.includes("deposit") || t.includes("debit") ||
       t.includes("credit") || t.includes("dr") || t.includes("cr"))
    ) {
      headerRow = i
      break
    }
  }

  const headers = (matrix[headerRow] || []).map((c) => cellText(c))
  const detected = detectColumns(headers)
  if (!detected) return { bank: null, rows: [] }

  const { bank, deps } = detected
  const out: BankCsvRow[] = []
  for (let i = headerRow + 1; i < matrix.length; i++) {
    const r = matrix[i]
    if (!r || r.length < 2) continue
    const date = deps.date >= 0 ? normalizeDate(cellText(r[deps.date])) : null
    if (!date) continue
    const description = deps.desc >= 0 ? fixSci(cellText(r[deps.desc]).replaceAll(/\s+/g, " ").trim()) : ""
    const debit = deps.debit >= 0 ? parseAmount(cellText(r[deps.debit])) : 0
    const credit = deps.credit >= 0 ? parseAmount(cellText(r[deps.credit])) : 0
    const balance = deps.bal >= 0 ? parseAmount(cellText(r[deps.bal])) : null
    const amount = debit > 0 ? debit : credit
    const type: "debit" | "credit" = debit > 0 ? "debit" : "credit"
    if (amount === 0 && description === "") continue
    out.push({ date, description, amount, type, balance })
  }
  return { bank, rows: out }
}

// ── CSV entrypoint ───────────────────────────────────────────────────────────

export function parseStatementCsv(csvText: string, bankHint?: BankName): LoadedStatement {
  const parsed = autoDetectAndParse(csvText)
  const formatMap: Record<string, BankName> = { hdfc: "hdfc", icici: "icici", sbi: "sbi", generic: "generic" }
  const detectedBank = formatMap[parsed.format] ?? "unknown"

  if (parsed.rows.length > 0) {
    return { bank: bankHint ?? detectedBank, rows: parsed.rows, fileName: "statement.csv" }
  }

  const matrix = parseCsvRows(csvText).map((r) => r as unknown[])
  const custom = rowsFromMatrix(matrix)
  if (custom.rows.length > 0) {
    return { bank: bankHint ?? custom.bank ?? detectedBank, rows: custom.rows, fileName: "statement.csv" }
  }

  return {
    bank: bankHint ?? "unknown",
    rows: [],
    fileName: "statement.csv",
    notes: "Could not read the statement columns automatically. Try re-exporting as CSV/PDF from your bank.",
  }
}

// ── XLSX entrypoint ──────────────────────────────────────────────────────────

export async function parseStatementXlsx(buffer: Buffer, bankHint?: BankName, fileName = "statement.xlsx"): Promise<LoadedStatement> {
  const XLSX = await import("xlsx")
  const wb = XLSX.read(buffer, { type: "buffer" })
  const first = wb.SheetNames[0]
  if (!first) return { bank: bankHint ?? "unknown", rows: [], fileName, notes: "Workbook is empty." }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[first], {
    header: 1,
    raw: false,
    defval: "",
  }) as unknown[][]

  const custom = rowsFromMatrix(matrix)
  if (custom.rows.length > 0) {
    return { bank: bankHint ?? custom.bank ?? "unknown", rows: custom.rows, fileName }
  }
  return { bank: bankHint ?? "unknown", rows: [], fileName, notes: "Could not read the statement sheet columns." }
}

// ── PDF entrypoint ───────────────────────────────────────────────────────────

export async function parseStatementPdf(buffer: Buffer, bankHint?: BankName): Promise<LoadedStatement> {
  const { parseBankPdf } = await import("@/shared/bank-pdf-parser")
  const result = await parseBankPdf(buffer)
  const formatMap: Record<string, BankName> = { hdfc: "hdfc", icici: "icici", sbi: "sbi" }
  return {
    bank: bankHint ?? formatMap[result.format] ?? "unknown",
    rows: result.rows,
    fileName: "statement.pdf",
    notes: result.rows.length === 0 ? "Could not extract transactions from the PDF." : undefined,
  }
}


export {type BankCsvRow} from "@/shared/bank-csv-parser"