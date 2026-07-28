export interface CasEntry {
  folio: string
  scheme: string
  amc: string
  nav: number
  units: number
  value: number
  date: string
}

export interface CasDocument {
  pan: string
  statementPeriod: string
  entries: CasEntry[]
  totalValue: number
}

/**
 * Parse a CAMS/KFin CAS (Consolidated Account Statement) PDF text.
 *
 * CAS PDFs have a standard format with:
 * - Header: PAN, Name, Address, Statement Period
 * - For each folio: Folio Number, AMC, Scheme Name
 * - Transaction/valuation details: Date, NAV, Units, Value
 */
export function parseCasText(text: string): CasDocument {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)

  // Extract PAN
  const panMatch = text.match(/[A-Z]{5}\d{4}[A-Z]/)
  const pan = panMatch ? panMatch[0] : ""

  // Extract statement period
  const periodMatch = text.match(/statement\s+(?:period|for\s+the)\s+.*?((?:\d{1,2}[/-]){2}\d{4}\s*(?:to|-)\s*(?:\d{1,2}[/-]){2}\d{4})/i)
  let statementPeriod = periodMatch ? periodMatch[1] : ""

  if (!statementPeriod) {
    // Try alternate: "April 2025 - March 2026"
    const altPeriod = text.match(/(\w+\s+\d{4})\s*[ot-]+\s*(\w+\s+\d{4})/i)
    if (altPeriod) {
      statementPeriod = `${altPeriod[1]} - ${altPeriod[2]}`
    }
  }

  const entries: CasEntry[] = []
  let currentFolio = ""
  let currentAmc = ""

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const lower = line.toLowerCase()

    // Detect Folio Number
    const folioMatch = line.match(/folio\s*(?:no|number)?[\s:]*([\d/a-z-]+)/i)
    if (folioMatch) {
      currentFolio = folioMatch[1].trim()
      currentAmc = ""
      continue
    }

    // Detect AMC Name
    if (lower.includes("amc") && !lower.includes("folio")) {
      const amcParts = line.split(/:\s*/)
      currentAmc = amcParts.length >= 2 ? amcParts[1].trim() : line.replace(/amc/i, "").trim();
      continue
    }

    // Detect Scheme Name and valuation data
    // Pattern: Scheme Name  ...  NAV  Units  Value
    const schemeMatch = line.match(/^(.+?)\s{2,}(\d+[\d.]*)\s{2,}([\d,]+\.?\d*)\s{2,}([\d,]+\.?\d*)\s*$/)
    if (schemeMatch && currentFolio) {
      const scheme = schemeMatch[1].trim()
      const nav = Number.parseFloat(schemeMatch[2].replaceAll(',', ""))
      const units = Number.parseFloat(schemeMatch[3].replaceAll(',', ""))
      const value = Number.parseFloat(schemeMatch[4].replaceAll(',', ""))

      if (!Number.isNaN(nav) && !Number.isNaN(units) && !Number.isNaN(value)) {
        entries.push({
          folio: currentFolio,
          scheme,
          amc: currentAmc,
          nav,
          units,
          value,
          date: "", // valuation date from context
        })
      }
      continue
    }

    // Alternative pattern: multi-line scheme info
    // "Scheme Name"
    // "NAV: X.XX  Units: XXX.XXX  Value: X,XXX.XX"
    if (currentFolio && !schemeMatch) {
      const valMatch = line.match(/(?:NAV|Nav|nav)\s*[:=]\s*([\d,]+\.?\d*)\s*(?:Units|units|UNITS)\s*[:=]\s*([\d,]+\.?\d*)\s*(?:Value|value|VALUE)\s*[:=]\s*([\d,]+\.?\d*)/)
      if (valMatch) {
        // The scheme name is on the previous line
        const prevLine = lines[i - 1] || ""
        const scheme = prevLine.replaceAll(/\s+/g, " ").trim()
        const nav = Number.parseFloat(valMatch[1].replaceAll(',', ""))
        const units = Number.parseFloat(valMatch[2].replaceAll(',', ""))
        const value = Number.parseFloat(valMatch[3].replaceAll(',', ""))

        if (!Number.isNaN(nav) && !Number.isNaN(units) && !Number.isNaN(value)) {
          entries.push({
            folio: currentFolio,
            scheme,
            amc: currentAmc,
            nav,
            units,
            value,
            date: "",
          })
        }
      }
    }
  }

  const totalValue = entries.reduce((s, e) => s + e.value, 0)

  return {
    pan,
    statementPeriod,
    entries,
    totalValue,
  }
}

/**
 * Parse CAS PDF buffer.
 */
export async function parseCasPdf(buffer: Buffer): Promise<CasDocument> {
  const { extractPdfText } = await import("@/shared/pdf-utils")
  const text = await extractPdfText(buffer)
  return parseCasText(text)
}

/**
 * Map CAS entries to Investment records suitable for DB insertion.
 */
export function casEntriesToInvestments(
  entries: CasEntry[],
  status: string = "active"
): Array<{
  type: string
  name: string
  amount: number
  currentValue: number
  purchaseDate: Date
  returnRate: number
  notes: string
  status: string
}> {
  return entries.map((entry) => {
    const amount = entry.units * entry.nav
    const returnRate = amount > 0 ? ((entry.value - amount) / amount) * 100 : 0

    return {
      type: "mutual_fund",
      name: `${entry.scheme}${entry.folio ? ` (${entry.folio})` : ""}`,
      amount,
      currentValue: entry.value,
      purchaseDate: entry.date ? new Date(entry.date) : new Date(),
      returnRate,
      notes: `Folio: ${entry.folio} | NAV: ${entry.nav} | Units: ${entry.units}${entry.amc ? ` | AMC: ${entry.amc}` : ""}`,
      status,
    }
  })
}
