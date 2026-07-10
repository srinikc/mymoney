import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { autoDetectAndParse } from "@/shared/bank-csv-parser"
import { z } from "zod"

const ImportRequestSchema = z.object({
  confirm: z.boolean().optional().default(false),
  bankAccount: z.string().optional().default(""),
})

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = (formData as any).get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ error: "Only CSV files are supported" }, { status: 400 })
    }

    const csvText = await file.text()
    const parsed = autoDetectAndParse(csvText)

    if (parsed.rows.length === 0) {
      return NextResponse.json({
        error: "No transactions found in CSV. Ensure the file has a header row with Date, Narration, Amount, etc.",
        detectedHeaders: parsed.headers,
      }, { status: 400 })
    }

    // Parse confirm and bankAccount from form
    const confirm = formData.get("confirm") === "true"
    const bankAccount = String(formData.get("bankAccount") || "").trim()

    // If preview mode, return parsed rows without importing
    if (!confirm) {
      const totalDebit = parsed.rows.filter((r) => r.type === "debit").reduce((s, r) => s + r.amount, 0)
      const totalCredit = parsed.rows.filter((r) => r.type === "credit").reduce((s, r) => s + r.amount, 0)

      return NextResponse.json({
        preview: true,
        format: parsed.format,
        bankAccount: bankAccount || null,
        total: parsed.rows.length,
        totalDebit: Math.round(totalDebit * 100) / 100,
        totalCredit: Math.round(totalCredit * 100) / 100,
        dateRange: {
          from: parsed.rows[0].date,
          to: parsed.rows.at(-1).date,
        },
        sample: parsed.rows.slice(0, 10).map((r) => ({
          date: r.date,
          description: r.description.slice(0, 60),
          amount: r.amount,
          type: r.type,
          balance: r.balance,
          reference: r.reference,
        })),
      })
    }

    // Import mode — save to DB
    const session = await prisma.importSession.create({
      data: {
        source: `bank-csv-${parsed.format}`,
        fileName: file.name,
        totalRows: parsed.rows.length,
        status: "importing",
      },
    })

    let imported = 0
    let skipped = 0

    for (const row of parsed.rows) {
      const date = new Date(row.date)
      if (isNaN(date.getTime())) {
        skipped++
        continue
      }

      // Only import debit transactions as expenses
      if (row.type !== "debit") {
        skipped++
        continue
      }

      // Check for duplicates
      const existing = await prisma.expense.findFirst({
        where: {
          date,
          amount: row.amount,
          vendor: row.description.slice(0, 200),
        },
      })

      if (existing) {
        skipped++
        continue
      }

      // Auto-categorize based on description
      const categoryId = await autoCategorize(row.description)

      await prisma.expense.create({
        data: {
          date,
          amount: row.amount,
          categoryId,
          vendor: row.description.slice(0, 200) || null,
          description: row.description.slice(0, 500) || null,
          paymentMode: "Bank Transfer",
          bankAccount: bankAccount || null,
          importSessionId: session.id,
          flagged: false,
        },
      })
      imported++
    }

    await prisma.importSession.update({
      where: { id: session.id },
      data: {
        status: imported > 0 ? "completed" : "skipped",
        autoMapped: imported,
        skipped,
      },
    })

    return NextResponse.json({
      success: true,
      imported,
      skipped,
      total: parsed.rows.length,
      importSessionId: session.id,
      message: `Imported ${imported} bank transactions${skipped > 0 ? `, skipped ${skipped}` : ""}`,
    })
  } catch (error) {
    console.error("Bank CSV import error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

async function autoCategorize(description: string): Promise<number> {
  if (!description) return 13 // "other"

  const d = description.toLowerCase()

  const rules: [RegExp, string][] = [
    [/(bigbazaar|dmart|reliance fresh|more supermarket|spar|grocery|veg|vegetable|fruit|milk|dairy)/i, "Groceries"],
    [/(zomato|swiggy|restaurant|cafe|hotel|dine|dominos|pizza|burger|mcdonald|kfc|starbucks|food|dhaba|tiffin|mess)/i, "Food & Dining"],
    [/(ola|uber|rapido|metro|bus|train|fuel|petrol|diesel|indian oil|parking|toll|auto|taxi|cab)/i, "Transportation"],
    [/(amazon|flipkart|myntra|ajio|shopping|clothing|apparel|retail|lifestyle)/i, "Shopping"],
    [/(electricity|water bill|gas bill|broadband|phone|recharge|mobile|airtel|jio|vi|bsnl|internet|dth|wifi)/i, "Bills & Utilities"],
    [/(netflix|prime video|hotstar|theatre|movie|cinema|game|gaming|bookmyshow|spotify)/i, "Entertainment"],
    [/(hospital|doctor|clinic|pharmacy|medicin|chemist|health|fitness|gym|apollo|fortis)/i, "Health & Fitness"],
    [/(rent|maintenance|society)/i, "Rent"],
    [/(salary|credit|refund|interest)/i, "Income"],
    [/(mutual fund|sip|stocks|share|nps|ppf|fd|fixed deposit|invest)/i, "Investment"],
  ]

  const allCategories = await prisma.category.findMany()
  const catMap = new Map(allCategories.map((c) => [c.name.toLowerCase(), c.id]))

  for (const [pattern, catName] of rules) {
    if (pattern.test(d)) {
      const id = catMap.get(catName.toLowerCase())
      if (id) return id
    }
  }

  return 13 // "other"
}
