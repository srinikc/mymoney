import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { shouldAutoMap, getExistingMappingKeys } from "@/shared/merchant-mapping"
import { parseGpayTakeoutEntry, parseGpayTakeoutJson, parseGpayTakeoutHtml } from "@/shared/gpay-parser"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileName = file.name.toLowerCase()

    let transactions: { date: Date; amount: number; vendor: string }[] = []
    let source = ""

    if (fileName.endsWith(".json")) {
      source = "gpay-takeout"
      const text = buffer.toString("utf-8")
      const json = JSON.parse(text)
      const entries = Array.isArray(json) ? json : parseGpayTakeoutJson(json)
      transactions = entries
        .map((e: Record<string, unknown>) => parseGpayTakeoutEntry(e))
        .filter((t): t is NonNullable<typeof t> => t !== null)
    } else if (fileName.endsWith(".zip")) {
      source = "gpay-takeout-zip"
      const AdmZip = (await import("adm-zip")).default
      let zip: any
      try { zip = new AdmZip(buffer) } catch {
        return NextResponse.json({ error: "Invalid ZIP file" }, { status: 400 })
      }
      const entries = zip.getEntries() as Array<{ entryName: string; getData: () => Buffer }>
      const htmlEntry = entries.find((e) =>
        e.entryName.replaceAll('\\', "/").toLowerCase().includes("my activity")
      )
      if (htmlEntry) {
        const content = htmlEntry.getData().toString("utf-8")
        let htmlTxns = parseGpayTakeoutHtml(content)
        const maxDate = await prisma.expense.aggregate({ _max: { date: true } }).then(r => r._max.date)
        if (maxDate) htmlTxns = htmlTxns.filter((t) => t.date >= maxDate)
        transactions = htmlTxns.map((t) => ({ date: t.date, amount: t.amount, vendor: t.vendor }))
      }
      if (transactions.length === 0) {
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
              if (parsed) transactions.push(parsed)
            }
          } catch { /* skip */ }
        }
      }
    } else if (fileName.endsWith(".html") || fileName.endsWith(".htm")) {
      source = "gpay-takeout-html"
      const text = buffer.toString("utf-8")
      let htmlTxns = parseGpayTakeoutHtml(text)
      const maxDate = await prisma.expense.aggregate({ _max: { date: true } }).then(r => r._max.date)
      if (maxDate) htmlTxns = htmlTxns.filter((t) => t.date >= maxDate)
      transactions = htmlTxns.map((t) => ({ date: t.date, amount: t.amount, vendor: t.vendor }))
    } else {
      return NextResponse.json({ error: "Unsupported file type. Upload JSON, ZIP, or HTML." }, { status: 400 })
    }

    if (transactions.length === 0) {
      return NextResponse.json({ error: "No valid transactions found in file." }, { status: 400 })
    }

    // Run duplicate checks and collect stats
    const vendorSet = new Set<string>()
    let willImport = 0
    let willSkip = 0
    let blankVendor = 0

    for (const txn of transactions) {
      if (!txn.vendor) { blankVendor++; willImport++; continue }
      vendorSet.add(txn.vendor.toLowerCase().trim())
      const existing = await prisma.expense.findFirst({
        where: { date: txn.date, amount: txn.amount, vendor: txn.vendor },
      })
      if (existing) willSkip++
      else willImport++
    }

    const totalVendors = vendorSet.size
    const existingKeys = await getExistingMappingKeys()
    const autoMappable = [...vendorSet].filter((k) => shouldAutoMap(k, k, existingKeys)).length

    // Build sample (first 5)
    const sample = transactions.slice(0, 5).map((t) => ({
      date: t.date.toISOString().split("T")[0],
      amount: t.amount,
      vendor: t.vendor,
    }))

    return NextResponse.json({
      preview: true,
      source,
      total: transactions.length,
      willImport,
      willSkip,
      blankVendor,
      totalVendors,
      autoMappable,
      sample,
    })
  } catch (error) {
    console.error("GPay preview error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
