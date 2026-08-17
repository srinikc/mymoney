import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"
import { getExistingVendorKeys, resetVendorKeyCache } from "@/shared/vendor-mapping"
import { parseGpayTakeoutEntry, parseGpayTakeoutJson, parseGpayTakeoutHtml } from "@/shared/gpay-parser"
import { titleCase } from "@/shared/title-case"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"

// Combine vendor + note into the description so both fields are sortable and
// nothing is lost (matches the spreadsheet importer's behavior).
function buildDescription(vendor: string, note?: string): string {
  const v = String(vendor || "").trim()
  const n = String(note || "").trim()
  if (v && n && n !== v) return `${v} â€” ${n}`
  if (n) return n
  return v
}

// Cache categories to avoid N+1 queries
let catCache: Map<string, number> | null = null
let otherCatIdCache: number | null = null

// Find-or-create a real "Other" category. The old `|| 13` fallback was a bug:
// id 13 could be a user category (e.g. "house-monthly"), so unmapped imports
// silently landed there.
async function getOtherCatId(): Promise<number> {
  if (otherCatIdCache) return otherCatIdCache
  const existing = await prisma.category.findFirst({ where: { name: { equals: "Other", mode: "insensitive" } } })
  if (existing) { otherCatIdCache = existing.id; return existing.id }
  const created = await prisma.category.create({ data: { name: "Other", type: "expense", icon: "more-horizontal", color: "#a1a1aa" } })
  otherCatIdCache = created.id
  return created.id
}

async function getCatId(name: string): Promise<number> {
  if (!catCache) {
    const cats = await prisma.category.findMany()
    catCache = new Map(cats.map((c) => [c.name.toLowerCase(), c.id]))
    otherCatIdCache = await getOtherCatId()
  }
  return catCache.get(name.toLowerCase()) || otherCatIdCache!
}

async function getMaxExpenseDate(profileId: number): Promise<Date | null> {
  const result = await prisma.expense.aggregate({
    where: { profileId },
    _max: { date: true },
  })
  return result._max.date || null
}

// Load existing vendor mappings as a lookup map: key -> { person, subCategory }
const lookupCacheByUser = new Map<number, Map<string, { person: string | null; subCategory: string | null }>>()

async function getMappingsLookup(userId: number): Promise<Map<string, { person: string | null; subCategory: string | null }>> {
  const cached = lookupCacheByUser.get(userId)
  if (cached) return cached
  const mappings = await prisma.vendorMapping.findMany({
    where: { userId, OR: [{ person: { not: null } }, { subCategory: { not: null } }] },
    select: { vendorKey: true, person: true, subCategory: true },
  })
  const map = new Map(mappings.map((m) => [m.vendorKey, { person: m.person, subCategory: m.subCategory }]))
  lookupCacheByUser.set(userId, map)
  return map
}

// Helper: insert expense, flag if duplicate
async function upsertExpense(date: Date, amount: number, vendor: string, categoryId: number, importSessionId?: number, extra?: { person?: string; subCategory?: string; bankAccount?: string; profileId?: number }): Promise<{ flagged: boolean }> {
  let flagged = false
  vendor = titleCase(String(vendor || "").trim())
  if (vendor) {
    const existing = await prisma.expense.findFirst({
      where: { date, amount, vendor, profileId: extra?.profileId ?? null },
    })
    flagged = !!existing
  }
  await prisma.expense.create({
    data: {
      date, amount, categoryId,
      vendor: vendor || null,
      description: vendor || null,
      paymentMode: "UPI",
      person: extra?.person || null,
      subCategory: extra?.subCategory || null,
      bankAccount: extra?.bankAccount || null,
      importSessionId: importSessionId ?? null,
      profileId: extra?.profileId ?? null,
      flagged,
    },
  })
  return { flagged }
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

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name.toLowerCase()

    const session = await prisma.importSession.create({
      data: {
        userId,
        profileId,
        source: fileName.endsWith(".json") ? "gpay-takeout" : fileName.endsWith(".zip") ? "gpay-takeout-zip" : fileName.endsWith(".html") || fileName.endsWith(".htm") ? "gpay-takeout-html" : "file-upload",
        fileName: file.name,
        status: "importing",
      },
    })

    let imported = 0
    let flagged = 0
    let skipped = 0

    if (fileName.endsWith(".json")) {
      const text = buffer.toString("utf-8")
      const json = JSON.parse(text)
      const entries = Array.isArray(json) ? json : parseGpayTakeoutJson(json)

      const validTxns = entries
        .map((e: Record<string, unknown>) => parseGpayTakeoutEntry(e))
        .filter((t): t is NonNullable<typeof t> => t !== null)

      if (validTxns.length === 0) {
        await prisma.importSession.update({
          where: { id: session.id },
          data: { totalRows: 0, autoMapped: 0, status: "failed" },
        })
        return NextResponse.json({
          error: "No valid transactions found in GPay JSON. The file format may not be supported. Try exporting as CSV/XLSX instead.",
        }, { status: 400 })
      }

      const jsonMappings = await getMappingsLookup(userId)
      for (const txn of validTxns) {
        if (txn.vendor) {
          const dupCheck = await prisma.expense.findFirst({
            where: { date: txn.date, amount: txn.amount, vendor: txn.vendor, profileId },
          })
          if (dupCheck) { skipped++; continue }
        }
        const catId = await autoCategorize(txn.vendor)
        const mapping = jsonMappings.get(txn.vendor.toLowerCase().trim())
        await prisma.expense.create({
          data: {
            date: txn.date, amount: txn.amount, categoryId: catId,
            vendor: txn.vendor || null, description: buildDescription(txn.vendor, txn.note),
            paymentMode: "UPI",
            person: mapping?.person || null,
            subCategory: mapping?.subCategory || null,
            importSessionId: session.id,
            profileId,
          },
        })
        imported++
      }

      const gpayMappingsCount = await autoCreateMappings(validTxns.map((t) => t.vendor).filter(Boolean), userId)

      await prisma.importSession.update({
        where: { id: session.id },
        data: { totalRows: validTxns.length, autoMapped: imported, skipped, newMerchants: gpayMappingsCount, status: "completed" },
      })

      return NextResponse.json({
        success: true,
        imported,
        flagged,
        total: validTxns.length,
        importSessionId: session.id,
        message: `Imported ${imported} GPay transactions${flagged ? `, flagged ${flagged} duplicates` : ""}${gpayMappingsCount ? `, ${gpayMappingsCount} merchant mappings` : ""}`,
      })
    }

    if (fileName.endsWith(".zip")) {
      const AdmZip = (await import("adm-zip")).default
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let zip: any
      try {
        zip = new AdmZip(buffer)
      } catch {
        return NextResponse.json({ error: "Invalid ZIP file" }, { status: 400 })
      }

      const entries = zip.getEntries() as Array<{ entryName: string; getData: () => Buffer }>

      const htmlEntry = entries.find((e) =>
        e.entryName.replaceAll('\\', "/").toLowerCase().includes("my activity")
      )

      let totalParsed = 0
      const zipVendors: string[] = []
      const zipMappings = await getMappingsLookup(userId)

      if (htmlEntry) {
        const content = htmlEntry.getData().toString("utf-8")
        let htmlTxns = parseGpayTakeoutHtml(content)
        // Filter to only transactions after last DB entry
        const maxDate = await getMaxExpenseDate(profileId)
        if (maxDate) {
          htmlTxns = htmlTxns.filter((t) => t.date >= maxDate)
        }
        for (const txn of htmlTxns) {
          totalParsed++
          if (txn.vendor) zipVendors.push(txn.vendor)
          if (txn.vendor) {
            const dupCheck = await prisma.expense.findFirst({
              where: { date: txn.date, amount: txn.amount, vendor: txn.vendor, profileId },
            })
            if (dupCheck) { skipped++; continue }
          }
          const catId = await autoCategorize(txn.vendor)
          const mapping = zipMappings.get(txn.vendor.toLowerCase().trim())
          await prisma.expense.create({
            data: {
              date: txn.date, amount: txn.amount, categoryId: catId,
              vendor: txn.vendor || null, description: buildDescription(txn.vendor, txn.note),
              paymentMode: "UPI",
              person: mapping?.person || null,
              subCategory: mapping?.subCategory || null,
              bankAccount: txn.bankAccount || null,
              importSessionId: session.id,
              profileId,
            },
          })
          imported++
        }
      }

      // Second pass: fall back to JSON files for any remaining transactions
      if (totalParsed === 0) {
        const jsonEntries = entries.filter((e) =>
          e.entryName.endsWith(".json") && !e.entryName.startsWith("__")
        )
        for (const entry of jsonEntries) {
          try {
            const content = entry.getData().toString("utf-8")
            const json = JSON.parse(content)
            const txns = Array.isArray(json) ? json : parseGpayTakeoutJson(json)
            for (const txn of txns) {
              const parsed = parseGpayTakeoutEntry(txn as Record<string, unknown>)
              if (!parsed) continue
              totalParsed++
              if (parsed.vendor) zipVendors.push(parsed.vendor)
              if (parsed.vendor) {
                const dupCheck = await prisma.expense.findFirst({
                  where: { date: parsed.date, amount: parsed.amount, vendor: parsed.vendor, profileId },
                })
                if (dupCheck) { skipped++; continue }
              }
              const catId = await autoCategorize(parsed.vendor)
              const mapping = zipMappings.get(parsed.vendor.toLowerCase().trim())
              await prisma.expense.create({
                data: {
                  date: parsed.date, amount: parsed.amount, categoryId: catId,
                  vendor: parsed.vendor || null, description: buildDescription(parsed.vendor, parsed.note),
                  paymentMode: "UPI",
                  person: mapping?.person || null,
                  subCategory: mapping?.subCategory || null,
                  importSessionId: session.id,
                  profileId,
                },
              })
              imported++
            }
          } catch { /* skip unparseable entries */ }
        }
      }

      if (totalParsed === 0) {
        await prisma.importSession.update({
          where: { id: session.id },
          data: { totalRows: 0, autoMapped: 0, status: "failed" },
        })
        return NextResponse.json({
          error: "No valid transactions found in ZIP. Expected takeout_pay_archive.zip containing My Activity.html or JSON files.",
        }, { status: 400 })
      }

      const zipMappingsCount = await autoCreateMappings(zipVendors, userId)
      // Create placeholder mappings for remaining new vendors (so they don't appear in Unmapped)
      if (imported > 0) {
        const allKeys = await getExistingVendorKeys(userId)
        const newKeys = [...new Set(zipVendors.map((v) => v.toLowerCase().trim()))].filter((k) => !allKeys.has(k))
        if (newKeys.length > 0) {
          await prisma.vendorMapping.createMany({
            data: newKeys.map((key) => ({ userId, vendorKey: key, source: "gpay-import" })),
          })
          resetVendorKeyCache(userId)
        }
      }

      await prisma.importSession.update({
        where: { id: session.id },
        data: { totalRows: totalParsed, autoMapped: imported, skipped, newMerchants: zipMappingsCount, status: "completed" },
      })

      return NextResponse.json({
        success: true,
        imported,
        flagged,
        total: totalParsed,
        importSessionId: session.id,
        message: `Imported ${imported} GPay transactions from ZIP${flagged ? `, flagged ${flagged} duplicates` : ""}${zipMappingsCount ? `, ${zipMappingsCount} merchant mappings` : ""}`,
      })
    }

    if (fileName.endsWith(".html") || fileName.endsWith(".htm")) {
      const text = buffer.toString("utf-8")
      let htmlTxns = parseGpayTakeoutHtml(text)
      const maxDate = await getMaxExpenseDate(profileId)
      if (maxDate) {
        const before = htmlTxns.length
        htmlTxns = htmlTxns.filter((t) => t.date >= maxDate)
        console.warn("[HTML IMPORT] Date filter: max DB date:", maxDate, "kept", htmlTxns.length, "of", before)
      }

      if (htmlTxns.length === 0) {
        await prisma.importSession.update({
          where: { id: session.id },
          data: { totalRows: 0, autoMapped: 0, status: "failed" },
        })
        return NextResponse.json({
          error: "No valid transactions found in HTML file. Try exporting as CSV/XLSX instead.",
        }, { status: 400 })
      }

      const htmlMappingsLookup = await getMappingsLookup(userId)
      for (const txn of htmlTxns) {
        if (txn.vendor) {
          const dupCheck = await prisma.expense.findFirst({
            where: { date: txn.date, amount: txn.amount, vendor: txn.vendor, profileId },
          })
          if (dupCheck) { skipped++; continue }
        }
        const catId = await autoCategorize(txn.vendor)
        const mapping = htmlMappingsLookup.get(txn.vendor.toLowerCase().trim())
        await prisma.expense.create({
          data: {
            date: txn.date, amount: txn.amount, categoryId: catId,
            vendor: txn.vendor || null, description: buildDescription(txn.vendor, txn.note),
            paymentMode: "UPI",
            person: mapping?.person || null,
            subCategory: mapping?.subCategory || null,
            bankAccount: txn.bankAccount || null,
            importSessionId: session.id,
            profileId,
          },
        })
        imported++
      }

      const htmlMappings = await autoCreateMappings(htmlTxns.map((t) => t.vendor).filter(Boolean), userId)
      if (imported > 0) {
        const allKeys = await getExistingVendorKeys(userId)
        const htmlVendorKeys = [...new Set(htmlTxns.map((t) => t.vendor.toLowerCase().trim()).filter(Boolean))]
        const newKeys = htmlVendorKeys.filter((k) => !allKeys.has(k))
        if (newKeys.length > 0) {
          await prisma.vendorMapping.createMany({
            data: newKeys.map((key) => ({ userId, vendorKey: key, source: "gpay-import" })),
          })
          resetVendorKeyCache(userId)
        }
      }

      await prisma.importSession.update({
        where: { id: session.id },
        data: { totalRows: htmlTxns.length, autoMapped: imported, skipped, newMerchants: htmlMappings, status: "completed" },
      })

      return NextResponse.json({
        success: true,
        imported,
        flagged,
        total: htmlTxns.length,
        importSessionId: session.id,
        message: `Imported ${imported} GPay transactions${flagged ? `, flagged ${flagged} duplicates` : ""}${htmlMappings ? `, ${htmlMappings} merchant mappings` : ""}`,
      })
    }

    // XLSX / CSV fallback
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[]

    if (rows.length === 0) {
      return NextResponse.json({ error: "Sheet is empty" }, { status: 400 })
    }

    const headers = Object.keys(rows[0])
    const dateKey = headers.find((h) => /date|transaction date|trxn date/i.test(h))
    const amountKey = headers.find((h) => /amount|debit|withdrawal/i.test(h))
    const vendorKey = headers.find((h) => /vendor|merchant|description|particulars|name|narrative|payee/i.test(h))
    const categoryKey = headers.find((h) => /category|type|mode/i.test(h))

    if (!dateKey || !amountKey) {
      return NextResponse.json({
        error: "Could not identify required columns. Found: " + headers.join(", "),
        headers,
      }, { status: 400 })
    }

    for (const row of rows) {
      const rawDate = row[dateKey]
      const rawAmount = row[amountKey]
      const vendor = vendorKey ? String(row[vendorKey] || "").trim() : ""
      const categoryName = categoryKey ? String(row[categoryKey] || "").trim() : ""

      if (!rawDate || !rawAmount) { skipped++; continue }

      let date: Date
      if (typeof rawDate === "number") {
        const excelEpoch = new Date(1899, 11, 30)
        date = new Date(excelEpoch.getTime() + rawDate * 86_400_000)
      } else if (typeof rawDate === "string") {
        date = new Date(rawDate)
      } else if (rawDate instanceof Date) {
        date = rawDate
      } else { skipped++; continue }

      if (isNaN(date.getTime())) { skipped++; continue }

      const amount: number = typeof rawAmount === "number" ? Math.abs(rawAmount) : Math.abs(Number.parseFloat(String(rawAmount).replaceAll(/[^\d.-]/g, "")));
      if (isNaN(amount) || amount === 0) { skipped++; continue }

      const categoryId = (await autoCategorizeByExact(categoryName)) || (await autoCategorize(vendor))
      const result = await upsertExpense(date, amount, vendor, categoryId, session.id, { profileId })
      if (result.flagged) flagged++; else imported++
    }

    await prisma.importSession.update({
      where: { id: session.id },
      data: { totalRows: rows.length, autoMapped: imported, skipped, newMerchants: 0, status: "completed" },
    })

    return NextResponse.json({
      success: true, imported, flagged, skipped,
      total: rows.length,
      importSessionId: session.id,
      message: `Imported ${imported} expenses${flagged ? `, flagged ${flagged} duplicates` : ""}`,
    })
  } catch (error) {
    console.error("Import error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function autoCreateMappings(vendors: string[], userId: number): Promise<number> {
  const existingKeys = await getExistingVendorKeys(userId)
  const deduped = new Map<string, string>()
  for (const v of vendors) {
    if (!v) continue
    const display = titleCase(v.trim())
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
    source: "gpay-takeout",
  }))
  await prisma.vendorMapping.createMany({ data })
  resetVendorKeyCache(userId)
  return data.length
}

async function autoCategorizeByExact(name: string): Promise<number | null> {
  if (!name) return null
  try { return await getCatId(name) } catch { return null }
}

async function autoCategorize(vendor: string): Promise<number> {
  if (!vendor) return getCatId("other")
  const v = vendor.toLowerCase()

  const rules: [RegExp, string][] = [
    [/(bigbazaar|dmart|reliance fresh|more supermarket|spar|nature's basket|grocery|provisions|veg|vegetable|fruit|milk|dairy)/i, "Groceries"],
    [/(zomato|swiggy|restaurant|cafe|hotel|dine|dominos|pizza|burger|mcdonald|kfc|starbucks|barista|food|dhaba|tiffin|mess|eatery)/i, "Food & Dining"],
    [/(ola|uber|rapido|metro|bus|train|fuel|petrol|diesel|indian oil|hp petrol|bharat petrol|parking|toll|auto|taxi|cab)/i, "Transportation"],
    [/(amazon|flipkart|myntra|ajio|meesho|shopping|clothing|apparel|shoe|fashion|retail|lifestyle|pantaloons|westside)/i, "Shopping"],
    [/(electricity|water bill|gas bill|broadband|phone|recharge|mobile prepaid|airtel|jio|vi|bsnl|internet|dth|wifi)/i, "Bills & Utilities"],
    [/(netflix|prime video|hotstar|sony liv|theatre|movie|cinema|game|gaming|bookmyshow|spotify|youtube premium)/i, "Entertainment"],
    [/(hospital|doctor|clinic|pharmacy|medicin|chemist|health|fitness|gym|yoga|apollo|fortis|diagnostic|laboratory)/i, "Health & Fitness"],
    [/(udemy|coursera|udacity|byju|vedantu|class|course|book|library|exam|fee|school|college|university|training)/i, "Education"],
    [/(makemytrip|goibibo|irctc|flight|railway|hotel|resort|travel|tour|holiday|booking)/i, "Travel"],
    [/(rent|maintenance|society)/i, "Rent"],
    [/(mutual fund|sip|stocks|share|nps|ppf|fd|fixed deposit|invest|demath)/i, "Investment"],
  ]

  for (const [pattern, catName] of rules) {
    if (pattern.test(v)) {
      const id = await getCatId(catName)
      if (id) return id
    }
  }

  return getCatId("other")
}
