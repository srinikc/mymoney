export function parseGpayTakeoutEntry(txn: Record<string, unknown>): { date: Date; amount: number; vendor: string } | null {
  const status = String(txn.status || txn.transactionStatus || "")
  if (status && !["success", "completed", "settled"].includes(status.toLowerCase())) return null

  const amountObj = txn.amount as Record<string, unknown> | undefined
  const merchant = txn.merchant as Record<string, unknown> | undefined
  const merchantName = txn.merchantName as string | undefined

  let rawDate = txn.transactionDate || txn.transactionTime || txn.date
  let rawAmount = amountObj?.value ?? txn.amount
  if (typeof rawAmount === "string") rawAmount = Number.parseFloat(rawAmount)
  let vendor = merchant?.name as string | undefined || merchantName || txn.description as string || ""

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
  if (vendor.startsWith("Paid to ")) vendor = vendor.slice(8)
  if (vendor.startsWith("Paid via ")) vendor = ""
  if (/^(sent|received|paid|recharge)/i.test(vendor)) vendor = ""

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

  const text = html.replaceAll(/<[^>]+>/g, " ").replaceAll('&nbsp;', " ").replaceAll('&amp;', "&").replaceAll(/\s+/g, " ")

  // Match with or without merchant name:
  // "Paid ₹300 to Merchant using Bank Account ... Completed"
  // "Paid ₹300 using Bank Account ... Completed"
  const txnRegex = /(paid|sent|received)\s+₹([\d,]+\.?\d*)\s+(?:(?:to|from)\s+(.+?)\s+)?using\s+(bank account\s*x+\d+)\s+(.*?)(?=\s+(?:paid|sent|received)\b|\s*$)/gi
  let match: RegExpExecArray | null

  while ((match = txnRegex.exec(text)) !== null) {
    const amount = Number.parseFloat(match[2].replaceAll(',', ""))
    const vendor = match[3] ? match[3].trim() : ""
    const bankAccount = match[4]
    const remainder = match[5]

    const dateMatch = remainder.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},?\s+\d{4}\b/i)
    const timeMatch = remainder.match(/\b(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM))\b/i)
    const date = dateMatch
      ? timeMatch
        ? new Date(`${dateMatch[0]} ${timeMatch[1]}`)
        : new Date(dateMatch[0])
      : null

    const isCompleted = /\bcompleted\b/i.test(remainder)

    if (date && !isNaN(date.getTime()) && amount > 0 && isCompleted) {
      results.push({ date, amount, vendor, bankAccount })
    }
  }

  return results
}
