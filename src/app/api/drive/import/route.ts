import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getStoredToken } from "@/lib/token-store"
import { driveDownloadRaw, refreshAccessToken } from "@/lib/oauth"
import { storeToken } from "@/lib/token-store"

export async function POST(req: Request) {
  try {
    const token = await getStoredToken()
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { fileId } = await req.json()
    if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 })

    let downloadRes = await driveDownloadRaw(fileId, token.accessToken)

    if (downloadRes.status === 401 && token.refreshToken) {
      try {
        const refreshed = await refreshAccessToken(token.refreshToken)
        token.accessToken = refreshed.access_token
        await storeToken({ ...token, accessToken: refreshed.access_token })
        downloadRes = await driveDownloadRaw(fileId, token.accessToken)
      } catch {
        return NextResponse.json({ error: "Session expired", needsReauth: true }, { status: 401 })
      }
    }

    if (!downloadRes.ok || !downloadRes.buffer) {
      return NextResponse.json({
        error: "Download failed",
        errorDetail: `HTTP ${downloadRes.status}: ${downloadRes.body}`,
      }, { status: 500 })
    }

    const buffer = Buffer.from(downloadRes.buffer)
    let imported = 0
    let skipped = 0
    let total = 0

    // Try as ZIP
    try {
      const AdmZip = (await import("adm-zip")).default
      const zip = new AdmZip(buffer)
      const allEntries = zip.getEntries() as Array<{ entryName: string; getData: () => Buffer }>

      // First pass: find My Activity.html in GPay Takeout structure
      const htmlEntry = allEntries.find((e) =>
        e.entryName.replace(/\\/g, "/").toLowerCase().includes("my activity")
      )

      if (htmlEntry) {
        console.log("[DRIVE IMPORT] Found HTML entry:", htmlEntry.entryName)
        const content = htmlEntry.getData().toString("utf-8")
        console.log("[DRIVE IMPORT] HTML size:", content.length, "First 800 chars:", content.substring(0, 800))
        // Debug: search for transaction data in stripped text
        const stripped = content.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ")
        const paidMatch = stripped.match(/Paid|Sent|Received/gi)
        console.log("[DRIVE IMPORT] 'Paid/Sent/Received' occurrences:", paidMatch?.length || 0)
        if (paidMatch) {
          const idx = stripped.search(/Paid|Sent|Received/i)
          console.log("[DRIVE IMPORT] First occurrence around:", stripped.substring(Math.max(0, idx - 50), idx + 200))
        }
        let htmlTxns = parseGpayTakeoutHtml(content)
        // Filter to only transactions after last DB entry
        const maxDate = await prisma.expense.aggregate({ _max: { date: true } }).then((r) => r._max.date)
        if (maxDate) {
          const before = htmlTxns.length
          htmlTxns = htmlTxns.filter((t) => t.date >= maxDate)
          console.log("[DRIVE IMPORT] Date filter: max DB date:", maxDate, "kept", htmlTxns.length, "of", before)
        }
        console.log("[DRIVE IMPORT] Parsed from HTML:", htmlTxns.length)
        const driveVendors: string[] = []
        for (const txn of htmlTxns) {
          total++
          if (txn.vendor) { driveVendors.push(txn.vendor) }
          const catId = await autoCategorize(txn.vendor)
          if (txn.vendor) {
            const existing = await prisma.expense.findFirst({
              where: { date: txn.date, amount: txn.amount, vendor: txn.vendor },
            })
            if (existing) { skipped++; continue }
          }
          await prisma.expense.create({
            data: {
              date: txn.date, amount: txn.amount, categoryId: catId,
              vendor: txn.vendor || null, description: txn.vendor || null, paymentMode: "UPI",
              bankAccount: txn.bankAccount || null,
            },
          })
          imported++
        }
        // Create placeholder mappings for new vendors
        if (imported > 0 && driveVendors.length > 0) {
          const existingMappings = await prisma.merchantMapping.findMany({
            where: { merchantKey: { in: [...new Set(driveVendors.map((v) => v.toLowerCase().trim()))] } },
            select: { merchantKey: true },
          })
          const existingSet = new Set(existingMappings.map((m) => m.merchantKey))
          const newKeys = [...new Set(driveVendors.map((v) => v.toLowerCase().trim()))].filter((k) => !existingSet.has(k))
          if (newKeys.length > 0) {
            await prisma.merchantMapping.createMany({
              data: newKeys.map((key) => ({ merchantKey: key, source: "gpay-import" })),
            })
          }
        }
        if (imported > 0 || skipped > 0) {
          return NextResponse.json({ success: true, imported, skipped, total, message: `Imported ${imported} GPay transactions from Drive, skipped ${skipped}` })
        }
      }
    } catch (e) { console.log("[DRIVE IMPORT] ZIP error:", e); /* not a ZIP, try as standalone HTML */ }

    // Try as standalone HTML (not zipped)
      try {
        const text = buffer.toString("utf-8")
        let htmlTxns = parseGpayTakeoutHtml(text)
        const maxDate = await prisma.expense.aggregate({ _max: { date: true } }).then((r) => r._max.date)
        if (maxDate) htmlTxns = htmlTxns.filter((t) => t.date >= maxDate)
        for (const txn of htmlTxns) {
          total++
          const catId = await autoCategorize(txn.vendor)
          if (txn.vendor) {
            const existing = await prisma.expense.findFirst({
              where: { date: txn.date, amount: txn.amount, vendor: txn.vendor },
            })
            if (existing) { skipped++; continue }
          }
          await prisma.expense.create({
            data: {
              date: txn.date, amount: txn.amount, categoryId: catId,
              vendor: txn.vendor || null, description: txn.vendor || null, paymentMode: "UPI",
              bankAccount: txn.bankAccount || null,
            },
          })
          imported++
        }
        if (imported > 0 || skipped > 0) {
          return NextResponse.json({ success: true, imported, skipped, total, message: `Imported ${imported} GPay transactions from HTML, skipped ${skipped}` })
        }
      } catch { /* not HTML either */ }

    return NextResponse.json({ error: "File contains no recognizable GPay transaction data" }, { status: 400 })
  } catch (error) {
    console.error("Drive import error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

function parseGpayTakeoutHtml(html: string): { date: Date; amount: number; vendor: string; bankAccount: string }[] {
  const results: { date: Date; amount: number; vendor: string; bankAccount: string }[] = []
  const text = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ")
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

function parseGPayEntry(txn: Record<string, unknown>): { date: Date; amount: number; vendor: string } | null {
  const rawDate = (txn.transactionDate || txn.transactionTime || "") as string
  const amountObj = txn.amount as Record<string, unknown> | undefined
  const rawAmount = amountObj?.value ?? txn.amount
  const vendor = (txn.merchant as Record<string, unknown> | undefined)?.name as string || txn.merchantName as string || txn.description as string || ""
  const status = txn.transactionStatus as string

  if (status && status !== "SUCCESS" && status !== "COMPLETED") return null
  if (!rawDate || rawAmount === undefined || rawAmount === null) return null

      const date = new Date(String(rawDate).replace("T", " ").split("+")[0].split("Z")[0])
  if (isNaN(date.getTime())) return null

  const amount = Math.abs(Number(rawAmount))
  if (isNaN(amount) || amount === 0) return null

  let vendorName = String(vendor).trim()
  if (vendorName.startsWith("Paid to ")) vendorName = vendorName.slice(8)
  if (/^(Sent|Received|Paid|Recharge)/i.test(vendorName)) vendorName = ""
  if (vendorName === "undefined" || vendorName === "null") vendorName = ""

  return { date, amount, vendor: vendorName }
}

function extractTxns(obj: Record<string, unknown>): Record<string, unknown>[] {
  for (const key of ["transactions", "splitTransactions", "txns", "items", "entries", "data"]) {
    const arr = obj[key]
    if (Array.isArray(arr)) return arr as Record<string, unknown>[]
  }
  for (const val of Object.values(obj)) {
    if (Array.isArray(val) && val.length > 0) {
      const first = val[0] as Record<string, unknown>
      if (first?.amount || first?.merchant || first?.transactionDate) return val as Record<string, unknown>[]
    }
  }
  return []
}

async function autoCategorize(vendor: string): Promise<number> {
  if (!vendor) return await getOtherCatId()
  const v = vendor.toLowerCase()
  const rules: [RegExp, string][] = [
    [/(bigbazaar|dmart|reliance fresh|more|spar|grocery|provisions|veg|vegetable|fruit|milk|dairy)/i, "Groceries"],
    [/(zomato|swiggy|restaurant|cafe|hotel|dine|dominos|pizza|burger|mcdonald|kfc|starbucks|food)/i, "Food & Dining"],
    [/(ola|uber|rapido|metro|bus|train|fuel|petrol|diesel|indian oil|parking|toll|auto|taxi)/i, "Transportation"],
    [/(amazon|flipkart|myntra|ajio|meesho|shopping|clothing|fashion|retail|lifestyle)/i, "Shopping"],
    [/(electricity|water|gas|broadband|phone|recharge|mobile|airtel|jio|vi|bsnl|internet|wifi)/i, "Bills & Utilities"],
    [/(netflix|prime|hotstar|sony|theatre|movie|cinema|game|bookmyshow|spotify)/i, "Entertainment"],
    [/(hospital|doctor|clinic|pharmacy|medicin|chemist|health|fitness|gym|apollo|fortis)/i, "Health & Fitness"],
    [/(udemy|coursera|udacity|class|course|book|library|exam|fee|school|college|university)/i, "Education"],
    [/(makemytrip|goibibo|irctc|flight|railway|hotel|resort|travel|tour|holiday)/i, "Travel"],
    [/(rent|maintenance|society)/i, "Rent"],
    [/(sip|mutual|fund|stocks|share|nps|ppf|fd|fixed deposit|invest|demat)/i, "Investment"],
  ]
  for (const [pattern, catName] of rules) {
    if (pattern.test(v)) {
      const cat = await prisma.category.findFirst({ where: { name: catName } })
      if (cat) return cat.id
    }
  }
  return await getOtherCatId()
}

async function getOtherCatId(): Promise<number> {
  const other = await prisma.category.findFirst({ where: { name: "Other" } })
  return other?.id || 13
}
