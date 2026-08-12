import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { driveDownloadRaw, refreshAccessToken } from "@/lib/oauth"
import { parseGpayTakeoutHtml } from "@/shared/gpay-parser"

export async function POST(req: Request) {
  let profileId: number
  let userId: number
  try {
    const ctx = await getAuthContext()
    profileId = ctx.profileId
    userId = ctx.userId
  } catch (e) {
    return handleAuthError(e)
  }

  try {
    const account = await prisma.account.findFirst({
      where: { userId, provider: "google" },
      select: { id: true, access_token: true, refresh_token: true, expires_at: true },
    })
    if (!account?.access_token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const { getAccessToken } = await import("@/lib/gmail")
    let accessToken = await getAccessToken(userId)
    const refreshToken = account.refresh_token || ""
    const { fileId } = await req.json()
    if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 })

    let downloadRes = await driveDownloadRaw(fileId, accessToken)
    if (downloadRes.status === 401 && refreshToken) {
      try {
        const refreshed = await refreshAccessToken(refreshToken)
        accessToken = refreshed.access_token
        await prisma.account.update({
          where: { id: account.id },
          data: { access_token: refreshed.access_token },
        })
        downloadRes = await driveDownloadRaw(fileId, accessToken)
      } catch {
        return NextResponse.json({ error: "Session expired", needsReauth: true }, { status: 401 })
      }
    }
    if (!downloadRes.ok || !downloadRes.buffer) {
      return NextResponse.json({ error: "Download failed", errorDetail: `HTTP ${downloadRes.status}: ${downloadRes.body}` }, { status: 500 })
    }

    const buffer = Buffer.from(downloadRes.buffer)
    let imported = 0, skipped = 0, total = 0

    try {
      const AdmZip = (await import("adm-zip")).default
      const zip = new AdmZip(buffer)
      const allEntries = zip.getEntries() as Array<{ entryName: string; getData: () => Buffer }>
      const htmlEntry = allEntries.find((e) => e.entryName.replaceAll('\\', "/").toLowerCase().includes("my activity"))
      if (htmlEntry) {
        const content = htmlEntry.getData().toString("utf-8")
        let htmlTxns = parseGpayTakeoutHtml(content)
        const maxDate = await prisma.expense.aggregate({ where: { profileId }, _max: { date: true } }).then((r) => r._max.date)
        if (maxDate) htmlTxns = htmlTxns.filter((t) => t.date >= maxDate)
        for (const txn of htmlTxns) {
          total++; const catId = await autoCategorize(txn.vendor)
          const existing = await prisma.expense.findFirst({ where: { date: txn.date, amount: txn.amount, vendor: txn.vendor || null, profileId, ...(txn.bankAccount ? { bankAccount: txn.bankAccount } : {}) } })
          if (existing) { skipped++; continue }
          if (txn.date.getHours() !== 0 || txn.date.getMinutes() !== 0) {
            const legacyExisting = await prisma.expense.findFirst({ where: { date: new Date(txn.date.getFullYear(), txn.date.getMonth(), txn.date.getDate()), amount: txn.amount, vendor: txn.vendor || null, profileId } })
            if (legacyExisting) { skipped++; continue }
          }
          await prisma.expense.create({ data: { date: txn.date, amount: txn.amount, categoryId: catId, vendor: txn.vendor || null, description: txn.vendor || null, paymentMode: "UPI", bankAccount: txn.bankAccount || null, profileId } })
          imported++
        }
        if (imported > 0 || skipped > 0) return NextResponse.json({ success: true, imported, skipped, total, message: `Imported ${imported} GPay transactions from Drive, skipped ${skipped}` })
      }
    } catch { /* not a ZIP */ }

    try {
      const text = buffer.toString("utf-8")
      let htmlTxns = parseGpayTakeoutHtml(text)
      const maxDate = await prisma.expense.aggregate({ where: { profileId }, _max: { date: true } }).then((r) => r._max.date)
      if (maxDate) htmlTxns = htmlTxns.filter((t) => t.date >= maxDate)
      for (const txn of htmlTxns) {
        total++; const catId = await autoCategorize(txn.vendor)
        const existing = await prisma.expense.findFirst({ where: { date: txn.date, amount: txn.amount, vendor: txn.vendor || null, profileId, ...(txn.bankAccount ? { bankAccount: txn.bankAccount } : {}) } })
        if (existing) { skipped++; continue }
        if (txn.date.getHours() !== 0 || txn.date.getMinutes() !== 0) {
          const legacyExisting = await prisma.expense.findFirst({ where: { date: new Date(txn.date.getFullYear(), txn.date.getMonth(), txn.date.getDate()), amount: txn.amount, vendor: txn.vendor || null, profileId } })
          if (legacyExisting) { skipped++; continue }
        }
        await prisma.expense.create({ data: { date: txn.date, amount: txn.amount, categoryId: catId, vendor: txn.vendor || null, description: txn.vendor || null, paymentMode: "UPI", bankAccount: txn.bankAccount || null, profileId } })
        imported++
      }
      if (imported > 0 || skipped > 0) return NextResponse.json({ success: true, imported, skipped, total, message: `Imported ${imported} GPay transactions from HTML, skipped ${skipped}` })
    } catch { /* not HTML */ }

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
    if (pattern.test(v)) { const cat = await prisma.category.findFirst({ where: { name: catName } }); if (cat) return cat.id }
  }
  return await getOtherCatId()
}

async function getOtherCatId(): Promise<number> {
  const other = await prisma.category.findFirst({ where: { name: "Other" } })
  return other?.id || 13
}
