import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { parseCasPdf, casEntriesToInvestments } from "@/shared/cas-parser"

const MAX_SIZE = 15 * 1024 * 1024 // 15MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({
        error: "Only PDF files are supported. Download your Consolidated Account Statement (CAS) from camscentral.com or kfintech.com.",
      }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large. Max 15MB" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const casDocument = await parseCasPdf(buffer)

    if (casDocument.entries.length === 0) {
      return NextResponse.json({
        error: "No mutual fund entries found in the CAS PDF. Ensure it's a valid CAMS/KFin Consolidated Account Statement.",
      }, { status: 400 })
    }

    const confirm = formData.get("confirm") === "true"

    if (!confirm) {
      return NextResponse.json({
        preview: true,
        pan: casDocument.pan || null,
        statementPeriod: casDocument.statementPeriod || null,
        total: casDocument.entries.length,
        totalValue: Math.round(casDocument.totalValue * 100) / 100,
        sample: casDocument.entries.slice(0, 10).map((e) => ({
          folio: e.folio,
          scheme: e.scheme,
          amc: e.amc,
          nav: e.nav,
          units: e.units,
          value: e.value,
        })),
      })
    }

    // Import mode
    const investments = casEntriesToInvestments(casDocument.entries)
    let imported = 0

    for (const inv of investments) {
      const existing = await prisma.investment.findFirst({
        where: { name: inv.name, type: "mutual_fund" },
      })

      await (existing ? prisma.investment.update({
          where: { id: existing.id },
          data: {
            amount: inv.amount,
            currentValue: inv.currentValue,
            returnRate: inv.returnRate,
            notes: inv.notes,
            status: inv.status,
          },
        }) : prisma.investment.create({ data: inv }));
      imported++
    }

    return NextResponse.json({
      success: true,
      imported,
      total: casDocument.entries.length,
      pan: casDocument.pan || null,
      totalValue: Math.round(casDocument.totalValue * 100) / 100,
      message: `Imported ${imported} mutual fund holdings from CAS statement${casDocument.pan ? ` (PAN: ${casDocument.pan})` : ""}`,
    })
  } catch (error) {
    console.error("MF Central CAS import error:", error)
    const msg = String(error)
    if (msg.includes("pdf") || msg.includes("password") || msg.includes("encrypted")) {
      return NextResponse.json({
        error: "Could not parse this PDF. Ensure it's a valid CAMS/KFin CAS statement that is not password-protected.",
      }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
