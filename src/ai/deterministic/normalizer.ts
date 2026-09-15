// ── Text Normalizer ─────────────────────────────────────────────────────
// Normalizes text input: amounts, dates, currencies, multilingual numerals.
// Makes intent parsing and entity extraction more reliable.

/**
 * Normalize a text string for intent parsing.
 * - Converts Unicode numerals to ASCII
 * - Normalizes currency symbols
 * - Normalizes common abbreviations
 * - Trims whitespace
 */
export function normalizeText(text: string): string {
  let result = text.trim()

  // Convert Unicode numerals to ASCII
  result = normalizeNumerals(result)

  // Normalize currency symbols and abbreviations
  result = normalizeCurrency(result)

  // Normalize common abbreviations
  result = normalizeAbbreviations(result)

  // Normalize whitespace
  result = result.replaceAll(/\s+/g, " ").trim()

  return result
}

/**
 * Normalize Unicode numerals (Devanagari, Kannada, Tamil, etc.) to ASCII.
 */
function normalizeNumerals(text: string): string {
  let result = text

  // Devanagari digits (Hindi, Marathi, Nepali)
  result = result.replaceAll(/[\u0966-\u096F]/g, (d) =>
    String.fromCodePoint(d.codePointAt(0)! - 0x0966 + 48)
  )

  // Kannada digits
  result = result.replaceAll(/[\u0CE6-\u0CEF]/g, (d) =>
    String.fromCodePoint(d.codePointAt(0)! - 0x0CE6 + 48)
  )

  // Tamil digits
  result = result.replaceAll(/[\u0BE6-\u0BEF]/g, (d) =>
    String.fromCodePoint(d.codePointAt(0)! - 0x0BE6 + 48)
  )

  // Telugu digits
  result = result.replaceAll(/[\u0C66-\u0C6F]/g, (d) =>
    String.fromCodePoint(d.codePointAt(0)! - 0x0C66 + 48)
  )

  // Bengali digits
  result = result.replaceAll(/[\u09E6-\u09EF]/g, (d) =>
    String.fromCodePoint(d.codePointAt(0)! - 0x09E6 + 48)
  )

  // Gujarati digits
  result = result.replaceAll(/[\u0AE6-\u0AEF]/g, (d) =>
    String.fromCodePoint(d.codePointAt(0)! - 0x0AE6 + 48)
  )

  // Gurmukhi (Punjabi) digits
  result = result.replaceAll(/[\u0A66-\u0A6F]/g, (d) =>
    String.fromCodePoint(d.codePointAt(0)! - 0x0A66 + 48)
  )

  // Odia digits
  result = result.replaceAll(/[\u0B66-\u0B6F]/g, (d) =>
    String.fromCodePoint(d.codePointAt(0)! - 0x0B66 + 48)
  )

  // Malayalam digits
  result = result.replaceAll(/[\u0D66-\u0D6F]/g, (d) =>
    String.fromCodePoint(d.codePointAt(0)! - 0x0D66 + 48)
  )

  // Arabic-Indic digits (Urdu)
  result = result.replaceAll(/[\u0660-\u0669]/g, (d) =>
    String.fromCodePoint(d.codePointAt(0)! - 0x0660 + 48)
  )

  return result
}

/**
 * Normalize currency symbols and abbreviations.
 */
function normalizeCurrency(text: string): string {
  return text
    .replaceAll(/₹\s*/g, "₹") // Remove space after ₹
    .replaceAll(/rs\.?\s*/gi, "₹") // Rs. 500 -> ₹500
    .replaceAll(/inr\s*/gi, "₹") // INR 500 -> ₹500
    .replaceAll(/\$|usd/gi, "$")
    .replaceAll(/€|eur/gi, "€")
    .replaceAll(/£|gbp/gi, "£")
    .replaceAll(/k\b/gi, "000") // "5k" -> "5000"
    .replaceAll(/(\d+)\s*lakh\b/gi, "$100000") // "5 lakh" -> "500000"
    .replaceAll(/(\d+)\s*cr(?:ore)?\b/gi, "$10000000") // "5 crore" -> "50000000"
    .replaceAll(/(\d+)\s*hundred\b/gi, "$100") // "5 hundred" -> "500"
    .replaceAll(/(\d+)\s*thousand\b/gi, "$1000") // "5 thousand" -> "5000"
}

/**
 * Normalize common abbreviations.
 */
function normalizeAbbreviations(text: string): string {
  return text
    .replaceAll(/\btmrw\b/gi, "tomorrow")
    .replaceAll(/\byest\b/gi, "yesterday")
    .replaceAll(/\bprev\b/gi, "previous")
    .replaceAll(/\bcurr\b/gi, "current")
    .replaceAll(/\bexp\b/gi, "expense")
    .replaceAll(/\binc\b/gi, "income")
    .replaceAll(/\bbgt\b/gi, "budget")
    .replaceAll(/\bsub\b/gi, "subscription")
    .replaceAll(/\btxn\b/gi, "transaction")
}

/**
 * Extract amount from normalized text.
 * Returns the first numeric amount found, or undefined.
 */
export function extractAmount(text: string): number | undefined {
  // Try to find amount with currency symbol: ₹500, Rs. 500, $50
  const withCurrency = text.match(/[$£€₹]\s*(\d+(?:\.\d{1,2})?)/)
  if (withCurrency) return parseFloat(withCurrency[1])

  // Try to find amount after "for/on/at": "500 for food"
  const afterPreposition = text.match(/\b(?:for|on|at|of)\s+(\d+(?:\.\d{1,2})?)/i)
  if (afterPreposition) return parseFloat(afterPreposition[1])

  // Try to find amount with "rupees": "500 rupees"
  const withRupees = text.match(/(\d+(?:\.\d{1,2})?)\s*(?:rupees|rs)/i)
  if (withRupees) return parseFloat(withRupees[1])

  // Try to find any standalone number
  const standalone = text.match(/\b(\d+(?:\.\d{1,2})?)\b/)
  if (standalone) return parseFloat(standalone[1])

  return undefined
}

/**
 * Extract date from normalized text.
 * Returns ISO date string (YYYY-MM-DD) or undefined.
 */
export function extractDate(text: string): string | undefined {
  const today = new Date()
  const lower = text.toLowerCase()

  if (/\b(today|aaj)\b/.test(lower)) {
    return formatDate(today)
  }

  if (/\b(yesterday|kal)\b/.test(lower) && !/\btomorrow|parso/.test(lower)) {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    return formatDate(yesterday)
  }

  if (/\b(tomorrow|parso)\b/.test(lower)) {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    return formatDate(tomorrow)
  }

  // Try to parse "last month", "this month"
  if (/\blast\s+month\b/.test(lower)) {
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    return formatDate(lastMonth)
  }

  if (/\bthis\s+month\b/.test(lower)) {
    return formatDate(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  // Try to parse explicit dates: "5 jan", "jan 5", "5 january 2024"
  const explicitDate = text.match(
    /\b(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*(?:\s*(\d{4}))?\b/i
  )
  if (explicitDate) {
    const day = parseInt(explicitDate[1])
    const monthIndex = [
      "jan", "feb", "mar", "apr", "may", "jun",
      "jul", "aug", "sep", "oct", "nov", "dec",
    ].indexOf(explicitDate[2].toLowerCase().slice(0, 3))
    if (monthIndex >= 0) {
      const year = explicitDate[3] ? parseInt(explicitDate[3]) : today.getFullYear()
      return formatDate(new Date(year, monthIndex, day))
    }
  }

  return undefined
}

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0]
}
