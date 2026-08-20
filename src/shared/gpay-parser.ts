// Sometimes the vendor capture includes the transaction's date/time stamp (e.g.
// "ONE8 Jul 8, 2026, 9:02:53 PM") when the export interleaves the merchant name
// with the rest of the cell. Strip any trailing timestamp + boilerplate so the
// stored vendor is a clean merchant name (matching the mapping table).
export function cleanGpayVendor(vendor: string): string {
  return String(vendor)
    .replaceAll('&emsp;', " ")
    .replaceAll(/\s+\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b[^]*$/gi, "")
    .replaceAll(/\s+\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}\b[^]*$/gi, "")
    .replaceAll(/\bist\s+products\b[^]*$/gi, "")
    .replaceAll(/\bgoogle\s+pay\s+details\b[^]*$/gi, "")
    .replaceAll(/\bads\s+displayed\b[^]*$/gi, "")
    .replaceAll(/\bfrom\s+google\s+ads\b[^]*$/gi, "")
    .replaceAll(/\s+/g, " ")
    .replaceAll(/^[\s,:;-]+|[\s,:;-]+$/g, "")
    .trim()
}

export function parseGpayTakeoutEntry(txn: Record<string, unknown>): { date: Date; amount: number; vendor: string; note?: string } | null {
  const status = String(txn.status || txn.transactionStatus || "")
  if (status && !["success", "completed", "settled"].includes(status.toLowerCase())) return null

  const amountObj = txn.amount as Record<string, unknown> | undefined
  const merchant = txn.merchant as Record<string, unknown> | undefined
  const merchantName = txn.merchantName as string | undefined
  const rawDescription = txn.description as string | undefined

  let rawDate = txn.transactionDate || txn.transactionTime || txn.date
  let rawAmount = amountObj?.value ?? txn.amount
  if (typeof rawAmount === "string") rawAmount = Number.parseFloat(rawAmount)
  let vendor = merchant?.name as string | undefined || merchantName || rawDescription || ""

  if (typeof rawDate === "string") {
    rawDate = rawDate.replace("T", " ").split("+")[0].split("Z")[0]
  }

  if (!rawDate || rawAmount === undefined || rawAmount === null) return null

  let date: Date
  if (typeof rawDate === "number") {
    const excelEpoch = new Date(1899, 11, 30)
    date = new Date(excelEpoch.getTime() + rawDate * 86_400_000)
  } else {
    date = new Date(String(rawDate))
  }
  if (isNaN(date.getTime())) return null

  const amount = Math.abs(Number(rawAmount))
  if (isNaN(amount) || amount === 0) return null

  vendor = String(vendor).trim()
  // Money received (credit) is income, not an expense — never import it.
  if (/^received\b/i.test(vendor)) return null
  if (vendor.startsWith("Paid to ")) vendor = vendor.slice(8)
  if (vendor.startsWith("Paid via ")) vendor = ""
  if (/^(sent|paid|recharge)/i.test(vendor)) vendor = ""
  vendor = cleanGpayVendor(vendor)

  // GPay Takeout omits the note field, so keep the raw description text as the
  // note when it differs from the vendor (fallback: vendor itself).
  let note: string | undefined
  if (rawDescription) {
    const trimmed = String(rawDescription).trim()
    if (trimmed && trimmed !== vendor) note = trimmed
  }

  return { date, amount, vendor, note }
}

export function parseGpayTakeoutJson(json: Record<string, unknown>): Record<string, unknown>[] {
  const txnKeys = ["transactions", "splitTransactions", "txns", "items", "entries", "data"]
  for (const key of txnKeys) {
    const arr = json[key]
    if (Array.isArray(arr) && arr.length > 0) return arr as Record<string, unknown>[]
  }
  for (const val of Object.values(json)) {
    if (Array.isArray(val) && val.length > 0) {
      const first = val[0] as Record<string, unknown>
      if (first?.amount || first?.merchant || first?.merchantName || first?.transactionDate) {
        return val as Record<string, unknown>[]
      }
    }
  }
  return []
}

// GPay Takeout appends boilerplate after the transaction: "IST Products: Google
// Pay Details: <ref>" (a UPI reference) plus "Ads Displayed Google Pay ads ..."
// and "From Google Ads ..." tracking blocks. The user's real note (if any) is
// NOT exported by GPay, so this trailing text is junk — strip it so the
// description shows only the vendor and any genuine note.
function cleanGpayNote(note: string): string | undefined {
  const n = String(note)
    .replaceAll('&emsp;', " ")
    .replaceAll(/\bist\s+products\b[^]*?google\s+pay\s+details\s*:\s*\S+/gi, " ")
    .replaceAll(/\bproducts\s*:\s*google\s+pay\s+details\s*:\s*\S+/gi, " ")
    .replaceAll(/\bgoogle\s+pay\s+details\s*:\s*\S+/gi, " ")
    .replaceAll(/\bads\s+displayed\s+google\s+pay\s+ads\b[^]*?(?=google\s+pay\b|$)/gi, " ")
    .replaceAll(/\bfrom\s+google\s+ads\b[^]*?(?=google\s+pay\b|$)/gi, " ")
    .replaceAll(/\bgoogle\s+pay\b/gi, " ")
    .replaceAll(/\s+/g, " ")
    .replaceAll(/^[\s,:;-]+|[\s,:;-]+$/g, "")
    .trim()
  return n || undefined
}

export function parseGpayTakeoutHtml(html: string): { date: Date; amount: number; vendor: string; bankAccount: string; note?: string }[] {
  const results: { date: Date; amount: number; vendor: string; bankAccount: string; note?: string }[] = []

  const text = html.replaceAll(/<[^>]+>/g, " ").replaceAll('&nbsp;', " ").replaceAll('&amp;', "&").replaceAll(/\s+/g, " ")

  // Match with or without merchant name:
  // "Paid ₹300 to Merchant using Bank Account ... Completed"
  // "Paid ₹300 using Bank Account ... Completed"
  const txnRegex = /(paid|sent|received)\s+₹([\d,]+\.?\d*)\s+(?:(?:to|from)\s+(.+?)\s+)?using\s+(bank account\s*x+\d+)\s+(.*?)(?=\s+(?:paid|sent|received)\b|\s*$)/gi
  let match: RegExpExecArray | null

  while ((match = txnRegex.exec(text)) !== null) {
    // Money received (credit) is income, not an expense — never import it.
    if (/^received\b/i.test(match[1])) continue

    const amount = Number.parseFloat(match[2].replaceAll(',', ""))
    const vendor = cleanGpayVendor(match[3] ? match[3].trim() : "")
    const bankAccount = match[4]
    const remainder = match[5]

    const dateMatch = remainder.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i)
    const timeMatch = remainder.match(/\b(\d{1,2}(?::\d{2}){1,2}\s*(?:am|pm))\b/i)
    const date = dateMatch
      ? timeMatch
        ? new Date(`${dateMatch[0]} ${timeMatch[1]}`)
        : new Date(dateMatch[0])
      : null

    const isCompleted = /\bcompleted\b/i.test(remainder)

    if (date && !isNaN(date.getTime()) && amount > 0 && isCompleted) {
      // Note is the trailing text after the bank account (before the date/time
      // + "Completed" markers). GPay Takeout omits the real note and instead
      // appends boilerplate (IST Products / Google Pay Details / ads tracking),
      // which cleanGpayNote strips so only genuine text remains.
      let note: string | undefined
      if (remainder) {
        const cleaned = remainder
          .replace(dateMatch?.[0] || "", " ")
          .replace(timeMatch?.[1] || "", " ")
          .replaceAll(/\bcompleted\b/gi, "")
          .replaceAll(/\s+/g, " ")
          .trim()
        if (cleaned && cleaned.toLowerCase() !== "completed") {
          const clean = cleanGpayNote(cleaned)
          if (clean) note = clean
        }
      }
      results.push({ date, amount, vendor, bankAccount, note })
    }
  }

  return results
}
