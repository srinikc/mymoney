import { NextResponse } from "next/server"
import { join } from "node:path"
import { appendFileSync, mkdirSync } from "node:fs"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { driveDownloadRaw, refreshAccessToken } from "@/lib/oauth"
import { parseGpayTakeoutHtml } from "@/shared/gpay-parser"
import { getVendorMappingMap, getExistingVendorKeys, resetVendorKeyCache } from "@/shared/vendor-mapping"
import { titleCase } from "@/shared/title-case"

// Record the real failure to a log file so "Internal server error" is never a
// dead end — the UI can show a helpful message while the exact cause is here.
function logDriveImportError(error: unknown, fileId?: string) {
  const detail = error instanceof Error ? `${error.message}\n${error.stack || ""}` : String(error)
  try {
    const logDir = join(process.cwd(), "data")
    mkdirSync(logDir, { recursive: true })
    appendFileSync(
      join(logDir, "drive-import-errors.log"),
      `[${new Date().toISOString()}] fileId=${fileId || "-"} ${detail}\n\n`
    )
  } catch { /* logging must never break the response */ }
  console.error("Drive import error:", error)
}

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

  let fileId: string | null = null
  try {
    const account = await prisma.account.findFirst({
      where: { userId, provider: "google" },
      select: { id: true, access_token: true, refresh_token: true, expires_at: true },
    })
    if (!account?.access_token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const { getAccessToken } = await import("@/lib/gmail")
    let accessToken = await getAccessToken(userId)
    const refreshToken = account.refresh_token || ""
    const body = await req.json().catch(() => ({}))
    fileId = typeof body.fileId === "string" ? body.fileId : null
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
    let sessionId: number | null = null

    // Create an ImportSession up front so GPay Drive imports appear in the
    // sessions list (and can be filtered) like every other import source.
    try {
      const session = await prisma.importSession.create({
        data: { userId, profileId, source: "gpay-takeout-zip", status: "importing" },
      })
      sessionId = session.id
    } catch (sessionErr) {
      // If we cannot track the session we can still import, but log it.
      console.error("Failed to create ImportSession for Drive import:", sessionErr)
    }

    // Load vendor mappings once (vendorKey -> category/subCategory/person) and
    // apply them at import time, exactly like the manual upload route. New
    // vendors are auto-created in the All Mappings list below.
    const mappingMap = await getVendorMappingMap(userId)

    const importTxns = async (htmlTxns: { date: Date; amount: number; vendor: string; bankAccount: string; note?: string }[]) => {
      const maxDate = await prisma.expense.aggregate({ where: { profileId }, _max: { date: true } }).then((r) => r._max.date)
      if (maxDate) htmlTxns = htmlTxns.filter((t) => t.date >= maxDate)
      const learnedVendors = new Set<string>()
      for (const txn of htmlTxns) {
        total++
        const vendorKey = (txn.vendor || "").toLowerCase().trim()
        const mapping = vendorKey ? mappingMap.get(vendorKey) : undefined
        const catId = mapping?.category ? await getCatId(mapping.category) : await autoCategorize(txn.vendor)
        const existing = await prisma.expense.findFirst({ where: { date: txn.date, amount: txn.amount, vendor: txn.vendor || null, profileId, ...(txn.bankAccount ? { bankAccount: txn.bankAccount } : {}) } })
        if (existing) { skipped++; continue }
        if (txn.date.getHours() !== 0 || txn.date.getMinutes() !== 0) {
          const legacyExisting = await prisma.expense.findFirst({ where: { date: new Date(txn.date.getFullYear(), txn.date.getMonth(), txn.date.getDate()), amount: txn.amount, vendor: txn.vendor || null, profileId } })
          if (legacyExisting) { skipped++; continue }
        }
        await prisma.expense.create({ data: { date: txn.date, amount: txn.amount, categoryId: catId, vendor: txn.vendor || null, description: txn.note ? (txn.vendor ? `${txn.vendor} — ${txn.note}` : txn.note) : (txn.vendor || null), paymentMode: "UPI", bankAccount: txn.bankAccount || null, subCategory: mapping?.subCategory || null, person: mapping?.person || null, importSessionId: sessionId, profileId } })
        imported++
        if (vendorKey) learnedVendors.add(vendorKey)
      }
      // Auto-create mappings for brand-new vendors so they appear in the All
      // Mappings page (empty category/sub/person until the user maps them).
      if (learnedVendors.size > 0) await autoCreateMappings([...learnedVendors], userId)
      if (imported > 0 || skipped > 0) {
        if (sessionId) {
          await prisma.importSession.update({ where: { id: sessionId }, data: { totalRows: htmlTxns.length, autoMapped: imported, skipped, status: imported > 0 ? "completed" : "skipped" } })
        }
        return NextResponse.json({ success: true, imported, skipped, total, importSessionId: sessionId, message: `Imported ${imported} GPay transactions from Drive, skipped ${skipped}` })
      }
      return null
    }

    // Extract the "My Activity" HTML from the Takeout ZIP (or accept a raw HTML
    // upload). Only format-level failures (invalid zip / no HTML) are treated
    // as "not a zip/html" — any error during actual importing propagates so it
    // is never misreported as "no recognizable data".
    let htmlContent: string | null = null
    try {
      const AdmZip = (await import("adm-zip")).default
      const zip = new AdmZip(buffer)
      const allEntries = zip.getEntries() as Array<{ entryName: string; getData: () => Buffer }>
      const htmlEntry = allEntries.find((e) => e.entryName.replaceAll('\\', "/").toLowerCase().includes("my activity"))
      if (htmlEntry) htmlContent = htmlEntry.getData().toString("utf-8")
    } catch { /* not a ZIP */ }

    if (!htmlContent) {
      const text = buffer.toString("utf-8")
      // Only use the raw text as an HTML source if it actually parses — feeding
      // binary zip bytes through the parser yields 0 rows and a bogus message.
      if (/<html[\s>]/i.test(text) && parseGpayTakeoutHtml(text).length > 0) {
        htmlContent = text
      }
    }

    if (htmlContent) {
      const htmlTxns = parseGpayTakeoutHtml(htmlContent)
      const result = await importTxns(htmlTxns)
      if (result) return result
      if (htmlTxns.length > 0) {
        if (sessionId) {
          await prisma.importSession.update({ where: { id: sessionId }, data: { totalRows: htmlTxns.length, skipped: htmlTxns.length, status: "skipped" } })
        }
        return NextResponse.json({ success: true, imported: 0, skipped: 0, total: htmlTxns.length, message: "No new GPay transactions to import (all already in your budget)" }, { status: 200 })
      }
    }

    if (sessionId) {
      await prisma.importSession.update({ where: { id: sessionId }, data: { status: "failed" } })
    }
    return NextResponse.json({ error: "File contains no recognizable GPay transaction data" }, { status: 400 })
  } catch (error) {
    logDriveImportError(error, fileId || undefined)
    return NextResponse.json({ error: "Internal server error", errorDetail: error instanceof Error ? error.message : "Unknown error" }, { status: 500 })
  }
}

// Cache categories to avoid N+1 queries.
let catCache: Map<string, number> | null = null
let otherCatIdCache: number | null = null

async function getCatId(name: string): Promise<number> {
  if (!catCache) {
    const cats = await prisma.category.findMany()
    catCache = new Map(cats.map((c) => [c.name.toLowerCase(), c.id]))
    otherCatIdCache = await getOtherCatId()
  }
  const id = catCache.get(name.toLowerCase())
  if (id) return id
  return otherCatIdCache!
}

// Find-or-create a real "Other" category. The old hardcoded `13` fallback was a
// bug: id 13 happened to be the user's "house-monthly" category, so every
// unmapped GPay transaction silently landed there.
async function getOtherCatId(): Promise<number> {
  if (otherCatIdCache) return otherCatIdCache
  const existing = await prisma.category.findFirst({ where: { name: { equals: "Other", mode: "insensitive" } } })
  if (existing) { otherCatIdCache = existing.id; return existing.id }
  const created = await prisma.category.create({ data: { name: "Other", type: "expense", icon: "more-horizontal", color: "#a1a1aa" } })
  otherCatIdCache = created.id
  return created.id
}

// Mirror of the manual import route: create a VendorMapping row (empty category)
// for each brand-new vendor so it appears in the All Mappings page.
async function autoCreateMappings(vendorKeys: string[], userId: number): Promise<number> {
  const existingKeys = await getExistingVendorKeys(userId)
  const deduped = new Map<string, string>()
  for (const v of vendorKeys) {
    if (!v) continue
    const display = titleCase(v)
    const key = display.toLowerCase().trim()
    if (!existingKeys.has(key) && !deduped.has(key)) deduped.set(key, display)
  }
  if (deduped.size === 0) return 0
  const data = [...deduped.entries()].map(([key, original]) => ({
    userId,
    vendorKey: key,
    description: original,
    category: "",
    subCategory: "",
    person: "",
    source: "gpay-import",
  }))
  await prisma.vendorMapping.createMany({ data })
  resetVendorKeyCache(userId)
  return data.length
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
    if (pattern.test(v)) { const id = await getCatId(catName); if (id) return id }
  }
  return await getOtherCatId()
}
