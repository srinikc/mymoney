import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"

/**
 * Groww Integration
 *
 * Groww does not provide a public API. Users must manually download their
 * data from Groww's web/app and import via CSV/XLSX.
 *
 * Available exports from Groww:
 * - Holdings CSV: Scheme, Folio, Units, NAV, Value, etc.
 * - Transaction History CSV: Date, Type, Scheme, Amount, NAV, Units
 * - SIP CSV: Scheme, Amount, Date, Frequency
 */

interface GrowwHoldingRow {
  scheme: string
  folio: string
  units: number
  nav: number
  value: number
  amc?: string
}

function parseGrowwHoldingsSheet(rows: Record<string, unknown>[]): GrowwHoldingRow[] {
  const result: GrowwHoldingRow[] = []

  for (const row of rows) {
    const scheme = String(row.scheme || row.Scheme || row["Scheme Name"] || row.schemeName || "").trim()
    const folio = String(row.folio || row.Folio || row["Folio Number"] || "").trim()
    const units = Number.parseFloat(String(row.units || row.Units || row["Units"] || "0").replaceAll(',', ""))
    const nav = Number.parseFloat(String(row.nav || row.NAV || row["Nav"] || "0").replaceAll(',', ""))
    const value = Number.parseFloat(String(row.value || row.Value || row["Market Value"] || row["Current Value"] || "0").replaceAll(',', ""))
    const amc = String(row.amc || row.AMC || row["AMC"] || "").trim()

    if (!scheme || Number.isNaN(units) || units === 0) continue

    result.push({ scheme, folio, units, nav, value, amc })
  }

  return result
}

function parseGrowwTransactionSheet(rows: Record<string, unknown>[]): {
  date: string
  type: string
  scheme: string
  amount: number
  nav: number
  units: number
}[] {
  const result: {
    date: string
    type: string
    scheme: string
    amount: number
    nav: number
    units: number
  }[] = []

  for (const row of rows) {
    const date = String(row.date || row.Date || row["Transaction Date"] || "").trim()
    const type = String(row.type || row.Type || row["Transaction Type"] || "").trim().toLowerCase()
    const scheme = String(row.scheme || row.Scheme || row["Scheme Name"] || "").trim()
    const amount = Number.parseFloat(String(row.amount || row.Amount || "0").replaceAll(/[^\d.-]/g, ""))
    const nav = Number.parseFloat(String(row.nav || row.NAV || "0").replaceAll(',', ""))
    const units = Number.parseFloat(String(row.units || row.Units || "0").replaceAll(',', ""))

    if (!scheme || Number.isNaN(amount) || amount === 0) continue

    result.push({ date, type, scheme, amount, nav, units })
  }

  return result
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || ""
    if (!["csv", "xlsx", "xls"].includes(ext)) {
      return NextResponse.json({ error: "Only CSV, XLSX, XLS files are supported. Download your data from Groww > Portfolio > Export." }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: "buffer" })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[]

    if (rows.length === 0) {
      return NextResponse.json({ error: "Sheet is empty" }, { status: 400 })
    }

    const confirm = formData.get("confirm") === "true"
    const importType = String(formData.get("type") || "holdings").toLowerCase()

    // Auto-detect import type
    const headers = Object.keys(rows[0]).map((h) => h.toLowerCase())
    const detectedType = headers.some((h) => /folio|units|nav/i.test(h)) ? "holdings" : "transactions"

    const actualType = importType === "auto" ? detectedType : importType

    if (!confirm) {
      if (actualType === "holdings") {
        const parsed = parseGrowwHoldingsSheet(rows)
        const totalValue = parsed.reduce((s, r) => s + r.value, 0)

        return NextResponse.json({
          preview: true,
          type: "holdings",
          total: parsed.length,
          totalValue: Math.round(totalValue * 100) / 100,
          sample: parsed.slice(0, 10).map((r) => ({
            scheme: r.scheme,
            folio: r.folio,
            units: r.units,
            nav: r.nav,
            value: r.value,
          })),
          detectedHeaders: headers,
        })
      } else {
        const parsed = parseGrowwTransactionSheet(rows)

        return NextResponse.json({
          preview: true,
          type: "transactions",
          total: parsed.length,
          sample: parsed.slice(0, 10).map((r) => ({
            date: r.date,
            type: r.type,
            scheme: r.scheme,
            amount: r.amount,
            nav: r.nav,
            units: r.units,
          })),
          detectedHeaders: headers,
        })
      }
    }

    // Import mode
    let imported = 0

    if (actualType === "holdings") {
      const parsed = parseGrowwHoldingsSheet(rows)

      for (const h of parsed) {
        const investmentName = `${h.scheme}${h.folio ? ` (${h.folio})` : ""}`

        const existing = await prisma.investment.findFirst({
          where: { name: investmentName, type: "mutual_fund" },
        })

        await (existing ? prisma.investment.update({
            where: { id: existing.id },
            data: {
              amount: h.units * h.nav,
              currentValue: h.value,
              returnRate: h.nav > 0 ? ((h.value / (h.units * h.nav)) - 1) * 100 : 0,
              notes: `Folio: ${h.folio} | Units: ${h.units} | NAV: ${h.nav}${h.amc ? ` | AMC: ${h.amc}` : ""}`,
              status: "active",
            },
          }) : prisma.investment.create({
            data: {
              type: "mutual_fund",
              name: investmentName,
              amount: h.units * h.nav,
              currentValue: h.value,
              purchaseDate: new Date(),
              returnRate: 0,
              notes: `Folio: ${h.folio} | Units: ${h.units} | NAV: ${h.nav}${h.amc ? ` | AMC: ${h.amc}` : ""}`,
              status: "active",
            },
          }));
        imported++
      }
    } else {
      const parsed = parseGrowwTransactionSheet(rows)

      for (const t of parsed) {
        let dateObj: Date
        if (typeof t.date === "string") {
          dateObj = new Date(t.date)
          if (Number.isNaN(dateObj.getTime())) {
            // Try DD/MM/YYYY
            const parts = t.date.split(/[/-]/)
            if (parts.length === 3) {
              dateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`)
            }
          }
        } else {
          dateObj = new Date()
        }

        if (Number.isNaN(dateObj.getTime())) continue

        const investmentName = t.scheme
        const isPurchase = t.type.includes("purchase") || t.type.includes("buy") || t.type.includes("sip")

        const existing = await prisma.investment.findFirst({
          where: { name: investmentName, type: "mutual_fund" },
        })

        await (existing ? prisma.investment.update({
            where: { id: existing.id },
            data: {
              amount: { increment: isPurchase ? t.amount : -t.amount },
              currentValue: existing.currentValue + (isPurchase ? t.amount : -t.amount),
              notes: existing.notes
                ? `${existing.notes} | ${t.date}: ${t.type} ${t.amount}`
                : `${t.date}: ${t.type} ${t.amount}`,
            },
          }) : prisma.investment.create({
            data: {
              type: "mutual_fund",
              name: investmentName,
              amount: isPurchase ? t.amount : -t.amount,
              currentValue: isPurchase ? t.amount : -t.amount,
              purchaseDate: dateObj,
              returnRate: 0,
              notes: `${t.date}: ${t.type} ${t.amount} at NAV ${t.nav}`,
              status: "active",
            },
          }));
        imported++
      }
    }

    return NextResponse.json({
      success: true,
      imported,
      total: rows.length,
      message: `Imported ${imported} ${actualType} from Groww export`,
    })
  } catch (error) {
    console.error("Groww import error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
