import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

const QuerySchema = z.object({
  profileId: z.coerce.number().optional(),
})

function getColor(score: number): [number, number, number] {
  if (score < 40) return [239, 68, 68]
  if (score < 70) return [245, 158, 11]
  return [34, 197, 94]
}

function getLabel(score: number): string {
  if (score < 40) return "Needs Attention"
  if (score < 70) return "Fair"
  return "Good"
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = QuerySchema.safeParse({ profileId: searchParams.get("profileId") ?? undefined })
    if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 })

    const { profileId } = parsed.data
    const pf = profileId ? { profileId } : {}
    const now = new Date()
    const cy = now.getFullYear()
    const cm = now.getMonth() + 1
    const tma = new Date(now.getFullYear(), now.getMonth() - 2, 1)

    const incAgg = await prisma.expense.aggregate({ where: { ...pf, date: { gte: tma }, amount: { lt: 0 } }, _sum: { amount: true } })
    const expAgg = await prisma.expense.aggregate({ where: { ...pf, date: { gte: tma }, amount: { gt: 0 } }, _sum: { amount: true } })
    const mi = Math.abs(incAgg._sum.amount || 0) / 3
    const me = (expAgg._sum.amount || 0) / 3
    const sr = mi > 0 ? ((mi - me) / mi) * 100 : 0

    const budgets = await prisma.budget.findMany({ where: { ...pf, month: cm, year: cy } })
    const investments = await prisma.investment.findMany({ where: { ...pf, status: "active" } })
    const totalIv = investments.reduce((s, i) => s + i.currentValue, 0)
    const totalInv = investments.reduce((s, i) => s + i.amount, 0)
    const assets = await prisma.asset.findMany({ where: { ...pf } })
    const totalA = assets.reduce((s, a) => s + a.currentValue, 0)
    const liabilities = await prisma.liability.findMany({ where: { ...pf } })
    const totalD = liabilities.reduce((s, l) => s + l.amount, 0)
    const categories = await prisma.category.findMany({ where: { type: "expense" } })

    const catRaw = await Promise.all(categories.map(async (cat) => {
      const a = await prisma.expense.aggregate({ where: { ...pf, categoryId: cat.id, amount: { gt: 0 } }, _sum: { amount: true } })
      return { name: cat.name, amount: a._sum.amount || 0 }
    }))
    const catExps = catRaw.filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount)

    const goals = await prisma.goal.findMany({ where: { ...pf, status: "active" } })

    const srScore = Math.min(100, Math.max(0, Math.round((sr / 20) * 100)))
    const ba = budgets.length > 0 ? 80 : 50
    const moc = me > 0 ? (totalIv + totalA) / me : 0
    const efScore = Math.min(100, Math.max(0, Math.round((moc / 6) * 100)))
    const emi = totalD * 0.02
    const dti = mi > 0 ? (emi / mi) * 100 : 0
    let dtiS = 100
    if (dti > 30) dtiS = dti <= 50 ? 50 + 50 * ((50 - dti) / 20) : Math.max(0, 50 * (1 - (dti - 50) / 50))
    const dtiScore = Math.min(100, Math.max(0, Math.round(dtiS)))
    const ir = mi > 0 ? (totalInv / (mi * 12)) * 100 : 0
    const irScore = Math.min(100, Math.max(0, Math.round((ir / 20) * 100)))
    const div = Math.min(100, Math.max(0, Math.round(Math.min(100, catExps.length * 15))))
    const overall = Math.round(srScore * 0.2 + ba * 0.2 + div * 0.15 + efScore * 0.2 + dtiScore * 0.15 + irScore * 0.1)

    const doc = new jsPDF({ format: "a4" })
    const pw = doc.internal.pageSize.getWidth()
    const ph = doc.internal.pageSize.getHeight()
    const m = 20
    const cw = pw - 2 * m
    const color = getColor(overall)

    // Cover page
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, pw, 120, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(28)
    doc.setFont("helvetica", "bold")
    doc.text("MyMoney", m, 45)
    doc.setFontSize(16)
    doc.setFont("helvetica", "normal")
    doc.text("Monthly Financial Health Report", m, 58)

    const mn = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    doc.setFontSize(11)
    doc.setTextColor(148, 163, 184)
    doc.text(`${mn[cm - 1]} ${cy}`, m, 70)

    const cx = pw / 2
    const cy2 = 165
    doc.setDrawColor(...color)
    doc.setLineWidth(6)
    doc.circle(cx, cy2, 35, "S")
    doc.setTextColor(...color)
    doc.setFontSize(36)
    doc.setFont("helvetica", "bold")
    doc.text(overall.toString(), cx, cy2 - 2, { align: "center" })
    doc.setFontSize(11)
    doc.setTextColor(100, 116, 139)
    doc.text("out of 100", cx, cy2 + 8, { align: "center" })
    doc.setTextColor(...color)
    doc.setFontSize(14)
    doc.text(getLabel(overall).toUpperCase(), cx, cy2 + 25, { align: "center" })

    // Page 2 — Components
    doc.addPage()
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, pw, 40, "F")
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("Score Components", m, 28)

    let y = 55
    doc.setFontSize(10)
    const comps = [
      { label: "Savings Rate", score: srScore, value: `${sr.toFixed(1)}%`, target: "20%" },
      { label: "Budget Adherence", score: ba, value: budgets.length > 0 ? "80%" : "N/A", target: "80%" },
      { label: "Diversification", score: div, value: `${catExps.length} categories`, target: "6+" },
      { label: "Emergency Fund", score: efScore, value: `${moc.toFixed(1)} months`, target: "6 months" },
      { label: "Debt-to-Income", score: dtiScore, value: `${dti.toFixed(1)}%`, target: "<30%" },
      { label: "Investment Ratio", score: irScore, value: `${ir.toFixed(1)}%`, target: "20%" },
    ]
    for (const comp of comps) {
      const cc = getColor(comp.score)
      const bw = cw * (comp.score / 100)
      doc.setTextColor(55, 65, 81)
      doc.setFont("helvetica", "bold")
      doc.text(comp.label, m, y)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 116, 139)
      doc.text(`${comp.value} (target: ${comp.target})`, m + 70, y)
      doc.setTextColor(...cc)
      doc.text(`${comp.score}/100`, m + cw - 20, y, { align: "right" })
      doc.setFillColor(226, 232, 240)
      doc.roundedRect(m, y + 3, cw, 6, 2, 2, "F")
      doc.setFillColor(...cc)
      if (bw > 0) doc.roundedRect(m, y + 3, bw, 6, 2, 2, "F")
      y += 18
    }

    // Recommendations
    y += 10
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("Recommendations", m, y)
    y += 10

    const recs = [
      ...(sr < 20 ? [`Increase savings from ${sr.toFixed(1)}% to 20%. Save ₹${((mi * 20) / 100).toFixed(0)}/month.`] : []),
      ...(moc < 6 ? [`Build emergency fund to 6 months (₹${(me * 6).toFixed(0)}). Currently: ${moc.toFixed(1)} months.`] : []),
      ...(dti > 30 ? [`Reduce DTI from ${dti.toFixed(1)}% to under 30%.`] : []),
      ...(ir < 20 ? [`Increase investments to 20% of income.`] : []),
      "Review insurance coverage (term life 10x income, health ₹5L).",
      "Optimize tax under Section 80C (max ₹1.5L with ELSS/PPF).",
    ]
    doc.setFontSize(9)
    for (const r of recs) {
      doc.setTextColor(55, 65, 81)
      doc.text(`\u2022 ${r}`, m + 5, y)
      y += 7
      if (y > ph - 40) { doc.addPage(); y = 30 }
    }

    // Category summary
    y += 10
    if (y > ph - 60) { doc.addPage(); y = 30 }
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(14)
    doc.text("Category Summary", m, y)
    y += 8

    const ct = catExps.slice(0, 10).map((c) => [c.name, `\u20B9${c.amount.toLocaleString("en-IN")}`])
    const gt = catExps.reduce((s, c) => s + c.amount, 0)
    if (ct.length > 0) ct.push(["Total", `\u20B9${gt.toLocaleString("en-IN")}`])

    autoTable(doc, {
      startY: y, margin: { left: m, right: m },
      head: [["Category", "Amount"]], body: ct,
      theme: "grid",
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
      bodyStyles: { textColor: [55, 65, 81] },
      tableLineColor: [226, 232, 240],
    })

    // Goals
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15
    if (y > ph - 60) { doc.addPage(); y = 30 }
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(14)
    doc.text("Active Goals", m, y)
    y += 8
    if (goals.length > 0) {
      autoTable(doc, {
        startY: y, margin: { left: m, right: m },
        head: [["Goal", "Saved", "Target", "Progress", "Deadline"]],
        body: goals.map((g) => [g.name, `\u20B9${g.currentAmount.toLocaleString("en-IN")}`, `\u20B9${g.targetAmount.toLocaleString("en-IN")}`, `${g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0}%`, g.deadline ? new Date(g.deadline).toLocaleDateString("en-IN") : "—"]),
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
        bodyStyles: { textColor: [55, 65, 81] },
        tableLineColor: [226, 232, 240],
      })
    } else {
      doc.text("No active goals.", m, y + 5)
    }

    // Risk profile
    const eqPct = totalInv > 0 ? (investments.filter((i) => ["equity", "stock", "mutual fund"].includes(i.type.toLowerCase())).reduce((s, i) => s + i.amount, 0) / totalInv) * 100 : 0
    const riskLbl = eqPct > 60 ? "Aggressive" : (eqPct > 30 ? "Moderate" : "Conservative")
    y = Math.max(y + 20, (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY + 15 || y + 20)
    if (y > ph - 50) { doc.addPage(); y = 30 }
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(14)
    doc.text("Risk Profile", m, y)
    y += 8
    doc.setFontSize(10)
    doc.setTextColor(55, 65, 81)
    doc.text(`Estimated Profile: ${riskLbl} (${eqPct.toFixed(0)}% equity)`, m + 5, y)
    y += 6
    doc.setTextColor(100, 116, 139)
    doc.text("Take the full SEBI questionnaire in the app.", m + 5, y)

    // Footer
    doc.setFontSize(8)
    doc.setTextColor(148, 163, 184)
    doc.text(`Generated by MyMoney on ${now.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}`, m, ph - 10)

    const buf = Buffer.from(doc.output("arraybuffer"))
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="mymoney-health-report-${mn[cm - 1]}-${cy}.pdf"`,
        "Content-Length": buf.length.toString(),
      },
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
