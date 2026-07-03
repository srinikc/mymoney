import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"
import { shouldAutoMap, getExistingMappingKeys, resetMappingCache } from "@/shared/merchant-mapping"
import { parseGpayTakeoutEntry, parseGpayTakeoutJson, parseGpayTakeoutHtml } from "@/shared/gpay-parser"

// Cache categories to avoid N+1 queries
let catCache: Map<string, number> | null = null
let otherCatIdCache: number | null = null

async function getCatId(name: string): Promise<number> {
  if (!catCache) {
    const cats = await prisma.category.findMany()
    catCache = new Map(cats.map((c) => [c.name.toLowerCase(), c.id]))
    otherCatIdCache = catCache.get("other") || 13
  }
  return catCache.get(name.toLowerCase()) || otherCatIdCache!
}

async function getMaxExpenseDate(): Promise<Date | null> {
  const result = await prisma.expense.aggregate({ _max: { date: true } })
  return result._max.date || null
}

// Load existing merchant mappings as a lookup map: key -> { person, subCategory }
let mappingsCache: Map<string, { person: string | null; subCategory: string | null }> | null = null

async function getMappingsLookup(): Promise<Map<string, { person: string | null; subCategory: string | null }>> {
  if (mappingsCache) return mappingsCache
  const mappings = await prisma.merchantMapping.findMany({
    where: { OR: [{ person: { not: null } }, { subCategory: { not: null } }] },
    select: { merchantKey: true, person: true, subCategory: true },
  })
  mappingsCache = new Map(mappings.map((m) => [m.merchantKey, { person: m.person, subCategory: m.subCategory }]))
  return mappingsCache
}

function resetMappingsCache() { mappingsCache = null }

// Helper: insert expense, flag if duplicate
async function upsertExpense(date: Date, amount: number, vendor: string, categoryId: number, importSessionId?: number, extra?: { person?: string; subCategory?: string; bankAccount?: string }): Promise<{ flagged: boolean }> {
  let flagged = false
  if (vendor) {
    const existing = await prisma.expense.findFirst({
      where: { date, amount, vendor },
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
      flagged,
    },
  })
  return { flagged }
}

export async function POST(req: Request) {
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

      const jsonMappings = await getMappingsLookup()
      for (const txn of validTxns) {
        if (txn.vendor) {
          const dupCheck = await prisma.expense.findFirst({
            where: { date: txn.date, amount: txn.amount, vendor: txn.vendor },
          })
          if (dupCheck) { skipped++; continue }
        }
        const catId = await autoCategorize(txn.vendor)
        const mapping = jsonMappings.get(txn.vendor.toLowerCase().trim())
        await prisma.expense.create({
          data: {
            date: txn.date, amount: txn.amount, categoryId: catId,
            vendor: txn.vendor || null, description: txn.vendor || null,
            paymentMode: "UPI",
            person: mapping?.person || null,
            subCategory: mapping?.subCategory || null,
            importSessionId: session.id,
          },
        })
        imported++
      }

      const gpayMappingsCount = await autoCreateMappings(validTxns.map((t) => t.vendor).filter(Boolean))

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

      // Debug: list ZIP contents
      console.log("[ZIP IMPORT] File:", file.name)
      console.log("[ZIP IMPORT] Entries:", entries.map((e) => e.entryName).slice(0, 20))

      // First pass: find and parse My Activity.html from GPay Takeout structure
      const htmlEntry = entries.find((e) =>
        e.entryName.replaceAll('\\', "/").toLowerCase().includes("my activity")
      )
      console.log("[ZIP IMPORT] Found HTML entry:", htmlEntry?.entryName || "NONE")

      let totalParsed = 0
      const zipVendors: string[] = []
      const zipMappings = await getMappingsLookup()

      if (htmlEntry) {
        const content = htmlEntry.getData().toString("utf-8")
        console.log("[ZIP IMPORT] HTML content length:", content.length)
        console.log("[ZIP IMPORT] HTML first 800 chars:", content.slice(0, 800))
        let htmlTxns = parseGpayTakeoutHtml(content)
        // Filter to only transactions after last DB entry
        const maxDate = await getMaxExpenseDate()
        if (maxDate) {
          const before = htmlTxns.length
          htmlTxns = htmlTxns.filter((t) => t.date >= maxDate)
          console.log("[ZIP IMPORT] Date filter: max DB date:", maxDate, "kept", htmlTxns.length, "of", before)
        }
        console.log("[ZIP IMPORT] Parsed transactions from HTML:", htmlTxns.length)
        for (const txn of htmlTxns) {
          totalParsed++
          if (txn.vendor) zipVendors.push(txn.vendor)
          if (txn.vendor) {
            const dupCheck = await prisma.expense.findFirst({
              where: { date: txn.date, amount: txn.amount, vendor: txn.vendor },
            })
            if (dupCheck) { skipped++; continue }
          }
          const catId = await autoCategorize(txn.vendor)
          const mapping = zipMappings.get(txn.vendor.toLowerCase().trim())
          await prisma.expense.create({
            data: {
              date: txn.date, amount: txn.amount, categoryId: catId,
              vendor: txn.vendor || null, description: txn.vendor || null,
              paymentMode: "UPI",
              person: mapping?.person || null,
              subCategory: mapping?.subCategory || null,
              bankAccount: txn.bankAccount || null,
              importSessionId: session.id,
            },
          })
          imported++
        }
      }

      // Second pass: fall back to JSON files for any remaining transactions
      if (totalParsed === 0) {
        console.log("[ZIP IMPORT] No HTML transactions, trying JSON files...")
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
                  where: { date: parsed.date, amount: parsed.amount, vendor: parsed.vendor },
                })
                if (dupCheck) { skipped++; continue }
              }
              const catId = await autoCategorize(parsed.vendor)
              const mapping = zipMappings.get(parsed.vendor.toLowerCase().trim())
              await prisma.expense.create({
                data: {
                  date: parsed.date, amount: parsed.amount, categoryId: catId,
                  vendor: parsed.vendor || null, description: parsed.vendor || null,
                  paymentMode: "UPI",
                  person: mapping?.person || null,
                  subCategory: mapping?.subCategory || null,
                  importSessionId: session.id,
                },
              })
              imported++
            }
          } catch { /* skip unparseable entries */ }
        }
      }

      console.log("[ZIP IMPORT] Total parsed:", totalParsed, "Imported:", imported)

      if (totalParsed === 0) {
        console.log("[ZIP IMPORT] No transactions found, returning error")
        await prisma.importSession.update({
          where: { id: session.id },
          data: { totalRows: 0, autoMapped: 0, status: "failed" },
        })
        return NextResponse.json({
          error: "No valid transactions found in ZIP. Expected takeout_pay_archive.zip containing My Activity.html or JSON files.",
        }, { status: 400 })
      }

      const zipMappingsCount = await autoCreateMappings(zipVendors)
      // Create placeholder mappings for remaining new vendors (so they don't appear in Unmapped)
      if (imported > 0) {
        const allKeys = await getExistingMappingKeys()
        const newKeys = [...new Set(zipVendors.map((v) => v.toLowerCase().trim()))].filter((k) => !allKeys.has(k))
        if (newKeys.length > 0) {
          await prisma.merchantMapping.createMany({
            data: newKeys.map((key) => ({ merchantKey: key, source: "gpay-import" })),
          })
          resetMappingCache()
        }
      }

      console.log("[ZIP IMPORT] Success - imported:", imported, "total:", totalParsed)
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
      const maxDate = await getMaxExpenseDate()
      if (maxDate) {
        const before = htmlTxns.length
        htmlTxns = htmlTxns.filter((t) => t.date >= maxDate)
        console.log("[HTML IMPORT] Date filter: max DB date:", maxDate, "kept", htmlTxns.length, "of", before)
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

      const htmlMappingsLookup = await getMappingsLookup()
      for (const txn of htmlTxns) {
        if (txn.vendor) {
          const dupCheck = await prisma.expense.findFirst({
            where: { date: txn.date, amount: txn.amount, vendor: txn.vendor },
          })
          if (dupCheck) { skipped++; continue }
        }
        const catId = await autoCategorize(txn.vendor)
        const mapping = htmlMappingsLookup.get(txn.vendor.toLowerCase().trim())
        await prisma.expense.create({
          data: {
            date: txn.date, amount: txn.amount, categoryId: catId,
            vendor: txn.vendor || null, description: txn.vendor || null,
            paymentMode: "UPI",
            person: mapping?.person || null,
            subCategory: mapping?.subCategory || null,
            bankAccount: txn.bankAccount || null,
            importSessionId: session.id,
          },
        })
        imported++
      }

      const htmlMappings = await autoCreateMappings(htmlTxns.map((t) => t.vendor).filter(Boolean))
      if (imported > 0) {
        const allKeys = await getExistingMappingKeys()
        const htmlVendorKeys = [...new Set(htmlTxns.map((t) => t.vendor.toLowerCase().trim()).filter(Boolean))]
        const newKeys = htmlVendorKeys.filter((k) => !allKeys.has(k))
        if (newKeys.length > 0) {
          await prisma.merchantMapping.createMany({
            data: newKeys.map((key) => ({ merchantKey: key, source: "gpay-import" })),
          })
          resetMappingCache()
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

      let amount: number
      amount = typeof rawAmount === "number" ? Math.abs(rawAmount) : Math.abs(Number.parseFloat(String(rawAmount).replaceAll(/[^\d.-]/g, "")));
      if (isNaN(amount) || amount === 0) { skipped++; continue }

      const categoryId = (await autoCategorizeByExact(categoryName)) || (await autoCategorize(vendor))
      const result = await upsertExpense(date, amount, vendor, categoryId, session.id)
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
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

async function autoCreateMappings(vendors: string[]): Promise<number> {
  const existingKeys = await getExistingMappingKeys()
  const deduped = new Map<string, string>()
  for (const v of vendors) {
    if (!v) continue
    if (!shouldAutoMap(v, v, existingKeys)) continue
    const key = v.toLowerCase().trim()
    if (!existingKeys.has(key) && !deduped.has(key)) deduped.set(key, v)
  }
  if (deduped.size === 0) return 0
  const data = [...deduped.entries()].map(([key, original]) => ({
    merchantKey: key,
    description: original,
    expenseType: "",
    subCategory: "",
    person: "",
    source: "gpay-takeout",
  }))
  await prisma.merchantMapping.createMany({ data })
  resetMappingCache()
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
