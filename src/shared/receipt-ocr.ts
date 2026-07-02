export interface ReceiptItem {
  name: string
  price: number
}

export interface ReceiptData {
  merchant: string
  date: string | null
  total: number | null
  items: ReceiptItem[]
  tax: number | null
  confidence: number // 0-100
}

/**
 * Parse amount from text, looking for ₹, Rs., INR patterns.
 */
function extractAmount(text: string): number | null {
  // ₹1,234.56 or Rs 1,234.56 or INR 1,234.56
  const patterns = [
    /(?:total|amount|due|balance)\s*[.:]?\s*(?:₹|rs\.?|inr)\s*([\d,]+\.?\d*)/i,
    /(?:₹|Rs\.?|INR)\s*([\d,]+\.?\d*)/,
    /(?:total|amount|due|balance)\s*[.:]?\s*([\d,]+\.\d{2})\b/i,
    /([\d,]+\.\d{2})\s*$/, // Last number with cents
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const n = Number.parseFloat(match[1].replaceAll(',', ""))
      if (!Number.isNaN(n) && n > 0) return n
    }
  }

  return null
}

/**
 * Extract date from text, trying multiple formats.
 */
function extractDate(text: string): string | null {
  // DD/MM/YYYY
  const dmy = text.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2]}-${dmy[1]}`)
    if (!Number.isNaN(d.getTime())) return d.toISOString().split("T")[0]
  }

  // YYYY-MM-DD
  const ymd = text.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (ymd) {
    const d = new Date(`${ymd[1]}-${ymd[2]}-${ymd[3]}`)
    if (!Number.isNaN(d.getTime())) return d.toISOString().split("T")[0]
  }

  // DD-MM-YYYY
  const dmy2 = text.match(/(\d{2})-(\d{2})-(\d{4})/)
  if (dmy2) {
    const d = new Date(`${dmy2[3]}-${dmy2[2]}-${dmy2[1]}`)
    if (!Number.isNaN(d.getTime())) return d.toISOString().split("T")[0]
  }

  // MMM DD, YYYY or DD MMM YYYY
  const mdy = text.match(/(\w{3,9})\s+(\d{1,2}),?\s+(\d{4})/)
  if (mdy) {
    const d = new Date(`${mdy[1]} ${mdy[2]}, ${mdy[3]}`)
    if (!Number.isNaN(d.getTime())) return d.toISOString().split("T")[0]
  }

  return null
}

/**
 * Extract merchant name from receipt text.
 * Usually the first non-trivial line that looks like a business name.
 */
function extractMerchant(text: string): string {
  const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 2)

  // Skip lines that look like headers
  const skipPatterns = [
    /^\d/, // starts with number
    /^(receipt|invoice|bill|order|payment|tax|gst|total|date|time|phone|email|web|www)/i,
    /^(cash|credit|debit|card|upi|net banking)/i,
    /^[\d,]+\.\d{2}\s*$/, // just a number
    /^(thank you|thanks|visit|store|item|qty|rate|amount)/i,
    /^[\s-]+$/, // dashes
  ]

  for (const line of lines) {
    const trimmed = line.replaceAll(/["#'*]/g, "").trim()
    if (trimmed.length < 3) continue
    if (trimmed.length > 50) continue // too long for a merchant name
    if (skipPatterns.some((p) => p.test(trimmed))) continue
    // Should have at least one letter
    if (!/[A-Za-z]/.test(trimmed) && !/[ऀ-ॿ]/.test(trimmed)) continue
    return trimmed
  }

  return ""
}

/**
 * Extract line items from receipt text.
 * Looks for patterns like: "Item Name  Qty  Rate  Amount"
 */
function extractItems(text: string, _total: number | null): ReceiptItem[] {
  const items: ReceiptItem[] = []
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)

  // Find the transaction lines (skip header/footer)
  let inItems = false
  for (const line of lines) {
    const lower = line.toLowerCase()

    // Detect start of items
    if (
      /^(item|product|description|qty|quantity|rate|particulars)/i.test(lower) ||
      /^-+\s+-+\s+-+/i.test(line)
    ) {
      inItems = true
      continue
    }

    // Detect end of items
    if (
      /^(total|subtotal|tax|gst|amount|payment|change)/i.test(lower)
    ) {
      inItems = false
      continue
    }

    if (!inItems) continue

    // Try to match: Item Name  ₹Price or Item Name  Price
    const priceMatch = line.match(/^(.+?)\s+(?:₹|Rs\.?)?\s*([\d,]+\.?\d*)\s*$/)
    if (priceMatch) {
      const name = priceMatch[1].trim()
      const price = Number.parseFloat(priceMatch[2].replaceAll(',', ""))
      if (name && !Number.isNaN(price) && price > 0 && name.length < 100) {
        items.push({ name, price })
      }
    }
  }

  // If no items found but we have amounts, try a simpler approach
  if (items.length === 0) {
    for (const line of lines) {
      const priceMatch = line.match(/^(.+?)\s+(?:₹|Rs\.?)?\s*([\d,]+\.\d{2})\s*$/)
      if (priceMatch) {
        const name = priceMatch[1].trim()
        const price = Number.parseFloat(priceMatch[2].replaceAll(',', ""))
        if (name && !Number.isNaN(price) && price > 0 && name.length < 100 && !/^\d+$/.test(name)) {
          items.push({ name, price })
        }
      }
    }
  }

  return items
}

/**
 * Extract tax amount from receipt text.
 */
function extractTax(text: string): number | null {
  const patterns = [
    /(?:tax|gst|vat|service tax)\s*[.:]?\s*(?:₹|rs\.?)?\s*([\d,]+\.?\d*)/i,
    /(?:tax|gst)\s+amount\s*[.:]?\s*(?:₹|rs\.?)?\s*([\d,]+\.?\d*)/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const n = Number.parseFloat(match[1].replaceAll(',', ""))
      if (!Number.isNaN(n) && n > 0) return n
    }
  }

  return null
}

/**
 * Main function: Run OCR on image buffer and extract receipt data.
 */
export async function extractReceiptData(imageBuffer: Buffer, _imageMime: string): Promise<ReceiptData> {
  // Only process images (not PDFs)
  const Tesseract = await import("tesseract.js")
  const { data } = await Tesseract.recognize(imageBuffer, "eng+hin", {
    logger: () => {},
  })

  const text = data.text
  const confidence = Math.round(data.confidence)

  const total = extractAmount(text)
  const date = extractDate(text)
  const merchant = extractMerchant(text)
  const items = extractItems(text, total)
  const tax = extractTax(text)

  return {
    merchant,
    date,
    total,
    items,
    tax,
    confidence,
  }
}

/**
 * Extract text from receipt image without full parsing.
 */
export async function extractReceiptText(imageBuffer: Buffer): Promise<string> {
  const Tesseract = await import("tesseract.js")
  const { data } = await Tesseract.recognize(imageBuffer, "eng", {
    logger: () => {},
  })
  return data.text
}
