export function parseGpayTakeoutEntry(txn: Record<string, unknown>): { date: Date; amount: number; vendor: string } | null {
  const status = String(txn.status || txn.transactionStatus || "")
  if (status && !["success", "completed", "settled"].includes(status.toLowerCase())) return null

  const amountObj = txn.amount as Record<string, unknown> | undefined
  const merchant = txn.merchant as Record<string, unknown> | undefined
  const merchantName = txn.merchantName as string | undefined

  let rawDate = txn.transactionDate || txn.transactionTime || txn.date
  let rawAmount = amountObj?.value ?? txn.amount
  if (typeof rawAmount === "string") rawAmount = parseFloat(rawAmount)
  let vendor = merchant?.name as string | undefined || merchantName || txn.description as string || ""

  if (typeof rawDate === "string") {
    rawDate = rawDate.replace("T", " ").split("+")[0].split("Z")[0]
  }

  if (!rawDate || rawAmount === undefined || rawAmount === null) return null

  let date: Date
  if (typeof rawDate === "number") {
    const excelEpoch = new Date(1899, 11, 30)
    date = new Date(excelEpoch.getTime() + rawDate * 86400000)
  } else {
    date = new Date(String(rawDate))
  }
  if (isNaN(date.getTime())) return null

  const amount = Math.abs(Number(rawAmount))
  if (isNaN(amount) || amount === 0) return null

  vendor = String(vendor).trim()
  if (vendor.startsWith("Paid to ")) vendor = vendor.slice(8)
  if (vendor.startsWith("Paid via ")) vendor = ""
  if (/^(Sent|Received|Paid|Recharge)/i.test(vendor)) vendor = ""

  return { date, amount, vendor }
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

export function parseGpayTakeoutHtml(html: string): { date: Date; amount: number; vendor: string; bankAccount: string }[] {
  const results: { date: Date; amount: number; vendor: string; bankAccount: string }[] = []

  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ")

  // Match with or without merchant name:
  // "Paid ₹300 to Merchant using Bank Account ... Completed"
  // "Paid ₹300 using Bank Account ... Completed"
  const txnRegex = /(Paid|Sent|Received)\s+₹([\d,]+\.?\d*)\s+(?:(?:to|from)\s+(.+?)\s+)?using\s+(bank account\s*x+\d+)\s+(.*?)(?=\s+(?:Paid|Sent|Received)\b|\s*$)/gi
  let match: RegExpExecArray | null

  while ((match = txnRegex.exec(text)) !== null) {
    const amount = parseFloat(match[2].replace(/,/g, ""))
    const vendor = match[3] ? match[3].trim() : ""
    const bankAccount = match[4]
    const remainder = match[5]

    const dateMatch = remainder.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i)
    const date = dateMatch ? new Date(dateMatch[0]) : null

    const isCompleted = /\bCompleted\b/i.test(remainder)

    if (date && !isNaN(date.getTime()) && amount > 0 && isCompleted) {
      results.push({ date, amount, vendor, bankAccount })
    }
  }

  return results
}
