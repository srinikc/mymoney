import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getStoredToken } from "@/lib/token-store"
import { driveDownloadRaw, refreshAccessToken } from "@/lib/oauth"
import { storeToken } from "@/lib/token-store"
import { parseGpayTakeoutHtml } from "@/shared/gpay-parser"

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
        e.entryName.replaceAll('\\', "/").toLowerCase().includes("my activity")
      )

      if (htmlEntry) {
        console.warn("[DRIVE IMPORT] Found HTML entry:", htmlEntry.entryName)
        const content = htmlEntry.getData().toString("utf-8")
        console.warn("[DRIVE IMPORT] HTML size:", content.length, "First 800 chars:", content.slice(0, 800))
        // Debug: search for transaction data in stripped text
        const stripped = content.replaceAll(/<[^>]+>/g, " ").replaceAll('&nbsp;', " ")
        const paidMatch = stripped.match(/paid|sent|received/gi)
        console.warn("[DRIVE IMPORT] 'Paid/Sent/Received' occurrences:", paidMatch?.length || 0)
        if (paidMatch) {
          const idx = stripped.search(/paid|sent|received/i)
          console.warn("[DRIVE IMPORT] First occurrence around:", stripped.substring(Math.max(0, idx - 50), idx + 200))
        }
        let htmlTxns = parseGpayTakeoutHtml(content)
        // Filter to only transactions after last DB entry
        const maxDate = await prisma.expense.aggregate({ _max: { date: true } }).then((r) => r._max.date)
        if (maxDate) {
          const before = htmlTxns.length
          htmlTxns = htmlTxns.filter((t) => t.date >= maxDate)
          console.warn("[DRIVE IMPORT] Date filter: max DB date:", maxDate, "kept", htmlTxns.length, "of", before)
        }
        console.warn("[DRIVE IMPORT] Parsed from HTML:", htmlTxns.length)
        const driveVendors: string[] = []
        for (const txn of htmlTxns) {
          total++
          if (txn.vendor) { driveVendors.push(txn.vendor) }
          const catId = await autoCategorize(txn.vendor)
          const existing = await prisma.expense.findFirst({
            where: {
              date: txn.date,
              amount: txn.amount,
              vendor: txn.vendor || null,
              ...(txn.bankAccount ? { bankAccount: txn.bankAccount } : {}),
            },
          })
          if (existing) { skipped++; continue }
          // Fallback dedup for legacy midnight-dated records (migration)
          if (txn.date.getHours() !== 0 || txn.date.getMinutes() !== 0) {
            const midnightDate = new Date(txn.date.getFullYear(), txn.date.getMonth(), txn.date.getDate())
            const legacyExisting = await prisma.expense.findFirst({
              where: {
                date: midnightDate,
                amount: txn.amount,
                vendor: txn.vendor || null,
                ...(txn.bankAccount ? { bankAccount: txn.bankAccount } : {}),
              },
            })
            if (legacyExisting) { skipped++; continue }
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
    } catch (error) { console.error("[DRIVE IMPORT] ZIP error:", error); /* not a ZIP, try as standalone HTML */ }

    // Try as standalone HTML (not zipped)
      try {
        const text = buffer.toString("utf-8")
        let htmlTxns = parseGpayTakeoutHtml(text)
        const maxDate = await prisma.expense.aggregate({ _max: { date: true } }).then((r) => r._max.date)
        if (maxDate) htmlTxns = htmlTxns.filter((t) => t.date >= maxDate)
        for (const txn of htmlTxns) {
          total++
          const catId = await autoCategorize(txn.vendor)
          const existing = await prisma.expense.findFirst({
            where: {
              date: txn.date,
              amount: txn.amount,
              vendor: txn.vendor || null,
              ...(txn.bankAccount ? { bankAccount: txn.bankAccount } : {}),
            },
          })
          if (existing) { skipped++; continue }
          // Fallback dedup for legacy midnight-dated records (migration)
          if (txn.date.getHours() !== 0 || txn.date.getMinutes() !== 0) {
            const midnightDate = new Date(txn.date.getFullYear(), txn.date.getMonth(), txn.date.getDate())
            const legacyExisting = await prisma.expense.findFirst({
              where: {
                date: midnightDate,
                amount: txn.amount,
                vendor: txn.vendor || null,
                ...(txn.bankAccount ? { bankAccount: txn.bankAccount } : {}),
              },
            })
            if (legacyExisting) { skipped++; continue }
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
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
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
