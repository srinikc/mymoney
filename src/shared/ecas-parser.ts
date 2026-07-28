export interface EcasEntry {
  isin: string
  company: string
  quantity: number
  marketValue: number
  costValue?: number
  gainLoss?: number
  gainLossPercent?: number
  folio?: string
  depository?: "CDSL" | "NSDL"
}

export interface EcasDocument {
  holderName: string
  pan: string
  depository: "CDSL" | "NSDL"
  statementDate: string
  entries: EcasEntry[]
  totalValue: number
}

/**
 * Parse CDSL/NSDL eCAS PDF text.
 *
 * eCAS (Electronic CAS) from CDSL/NSDL contains:
 * - Holder details: Name, PAN, Address
 * - For each holding: ISIN, Company Name, Quantity, Market Value
 * - Summary: Total Market Value
 */
export function parseEcasText(text: string): EcasDocument {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)

  // Detect depository
  const depository: "CDSL" | "NSDL" = text.toLowerCase().includes("cdsl") ? "CDSL" : "NSDL"

  // Extract PAN
  const panMatch = text.match(/[A-Z]{5}\d{4}[A-Z]/)
  const pan = panMatch ? panMatch[0] : ""

  // Extract holder name
  let holderName = ""
  const nameMatch = text.match(/(?:name|holder|client)\s*:\s*(.+)/i)
  if (nameMatch) {
    holderName = nameMatch[1].trim()
  } else {
    // Try first few lines
    for (const line of lines.slice(0, 10)) {
      if (/^[\sA-Z]+$/.test(line) && line.length > 5 && line.length < 50) {
        holderName = line.trim()
        break
      }
    }
  }

  // Extract statement date
  let statementDate = ""
  const dateMatch = text.match(/statement\s+(?:date|as\s+on|for\s+the)\s*:?\s*(.+)/i)
  if (dateMatch) {
    statementDate = dateMatch[1].trim()
  }

  const entries: EcasEntry[] = []

  // CDSL format: ISIN | Company | Quantity | Market Value
  if (depository === "CDSL") {
    // Look for table with ISIN and Company names
    let inTable = false

    for (const line of lines) {
      const lower = line.toLowerCase()

      // Detect table start
      if (
        lower.includes("isin") &&
        (lower.includes("company") || lower.includes("security") || lower.includes("name")) &&
        (lower.includes("quantity") || lower.includes("qty")) &&
        (lower.includes("value") || lower.includes("amount"))
      ) {
        inTable = true
        continue
      }

      if (!inTable) continue

      // Check for end of table
      if (
        lower.includes("total") ||
        lower.includes("grand total") ||
        lower.includes("summary") ||
        lower.includes("disclaimer")
      ) {
        inTable = false
        continue
      }

      // ISIN pattern: 2 letters + 10 alphanumeric
      const isinMatch = line.match(/([A-Z]{2}[\dA-Z]{10})\s+(.+)/)
      if (isinMatch) {
        const isin = isinMatch[1].trim()
        const rest = isinMatch[2]

        // Extract quantity and value
        const numbers = rest.match(/([\d,]+\.?\d*)/g)
        if (numbers && numbers.length >= 2) {
          const companyMatch = rest.match(/^(.+?)\s{2,}/)
          const company = companyMatch ? companyMatch[1].trim() : rest.replaceAll(/\s+/g, " ").trim()
          const lastTwo = numbers.at(-2)
          const lastOne = numbers.at(-1)
          const quantity = lastTwo ? Number.parseFloat(lastTwo.replaceAll(',', "")) : 0
          const marketValue = lastOne ? Number.parseFloat(lastOne.replaceAll(',', "")) : 0

          if (!Number.isNaN(quantity) && !Number.isNaN(marketValue)) {
            entries.push({
              isin,
              company,
              quantity,
              marketValue,
              depository: "CDSL",
            })
          }
        }
      }
    }
  } else {
    // NSDL format: ISIN, Company, Quantity, Market Value
    let inTable = false

    for (const line of lines) {
      const lower = line.toLowerCase()

      // Detect table start
      if (
        lower.includes("isin") &&
        (lower.includes("instrument") || lower.includes("security") || lower.includes("company")) &&
        (lower.includes("balance") || lower.includes("quantity") || lower.includes("holding"))
      ) {
        inTable = true
        continue
      }

      if (!inTable) continue

      // End of table
      if (
        lower.includes("total") ||
        lower.includes("grand total") ||
        lower.includes("summary") ||
        lower.includes("disclaimer")
      ) {
        inTable = false
        continue
      }

      // Try ISIN match
      const isinMatch = line.match(/([A-Z]{2}[\dA-Z]{10})/)
      if (isinMatch) {
        const isin = isinMatch[1].trim()
        // Find company name before ISIN or after
        const beforeIsin = line.slice(0, line.indexOf(isin)).trim()
        const afterIsin = line.slice(line.indexOf(isin) + isin.length).trim()

        const numbers = (afterIsin + " " + beforeIsin).match(/([\d,]+\.?\d*)/g)
        const company = beforeIsin || afterIsin.replaceAll(/[\d\s,.]+/g, "").trim()

        if (numbers && numbers.length >= 2) {
          const lastTwo = numbers.at(-2)
          const lastOne = numbers.at(-1)
          const quantity = lastTwo ? Number.parseFloat(lastTwo.replaceAll(',', "")) : 0
          const marketValue = lastOne ? Number.parseFloat(lastOne.replaceAll(',', "")) : 0

          if (!Number.isNaN(quantity) && !Number.isNaN(marketValue)) {
            entries.push({
              isin,
              company: company || isin,
              quantity,
              marketValue,
              depository: "NSDL",
            })
          }
        }
      }
    }
  }

  const totalValue = entries.reduce((s, e) => s + e.marketValue, 0)

  return {
    holderName,
    pan,
    depository,
    statementDate,
    entries,
    totalValue,
  }
}

/**
 * Parse eCAS PDF buffer.
 */
export async function parseEcasPdf(buffer: Buffer): Promise<EcasDocument> {
  const { extractPdfText } = await import("@/shared/pdf-utils")
  const text = await extractPdfText(buffer)
  return parseEcasText(text)
}

/**
 * Map eCAS entries to Asset records suitable for DB insertion.
 */
export function ecasEntriesToAssets(
  entries: EcasEntry[],
  depository: string
): Array<{
  name: string
  type: string
  amount: number
  notes: string
}> {
  return entries.map((entry) => ({
    name: `${entry.company} (${entry.isin})`,
    type: "stock",
    amount: entry.marketValue,
    notes: `ISIN: ${entry.isin} | Qty: ${entry.quantity}${entry.folio ? ` | Folio: ${entry.folio}` : ""} | Depository: ${depository}${entry.costValue ? ` | Cost: ${entry.costValue}` : ""}${entry.gainLoss ? ` | P&L: ${entry.gainLoss}` : ""}`,
  }))
}
