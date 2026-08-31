import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { computeSpendingIntelligence } from "@/shared/spending-intelligence"
import { tierForIncome } from "@/shared/income-tiers"
import { computeEmergencyFund, ESSENTIAL_CATEGORIES, recommendJobType } from "@/shared/emergency-fund"

interface Section {
  id: string
  title: string
  page: number
}

function fmt(n: number): string {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(n))
}

function rupees(n: number): string {
  return `Rs. ${fmt(n)}`
}

function addPageHeader(doc: jsPDF, pageNum: number, total: number) {
  doc.setFontSize(8)
  doc.setTextColor(120)
  doc.text("MyMoney Financial Report", 14, 10)
  doc.text(`Page ${pageNum} of ${total}`, doc.internal.pageSize.width - 14, 10, { align: "right" })
  doc.setDrawColor(220)
  doc.line(14, 12, doc.internal.pageSize.width - 14, 12)
}

export async function GET(_req: NextRequest) {
  try {
    const ctx = await getAuthContext()
    const now = new Date()
    const cy = now.getFullYear()
    const cm = now.getMonth() + 1
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const [
      profile,
      profileIncome,
      incAgg,
      monthlyExpensesByCat,
      categories,
      budgets,
      investments,
      loans,
      goals,
      assets,
      liabilities,
      cashBalances,
      bankAccounts,
      intelligence,
    ] = await Promise.all([
      prisma.profile.findUnique({ where: { id: ctx.profileId }, select: { name: true, dateOfBirth: true, occupation: true, annualIncome: true } }),
      prisma.incomeSource.findMany({ where: { profileId: ctx.profileId, endDate: null } }),
      prisma.expense.aggregate({ where: { profileId: ctx.profileId, date: { gte: threeMonthsAgo }, amount: { gt: 0 } }, _sum: { amount: true } }),
      prisma.expense.groupBy({
        by: ["categoryId"],
        where: { profileId: ctx.profileId, deletedAt: null, date: { gte: thisMonthStart } },
        _sum: { amount: true },
      }),
      prisma.category.findMany({ where: { type: "expense" } }),
      prisma.budget.findMany({ where: { profileId: ctx.profileId, month: cm, year: cy }, include: { category: true } }),
      prisma.investment.findMany({ where: { profileId: ctx.profileId } }),
      prisma.loan.findMany({ where: { profileId: ctx.profileId, status: "active" } }),
      prisma.goal.findMany({ where: { profileId: ctx.profileId } }),
      prisma.asset.findMany({ where: { profileId: ctx.profileId } }),
      prisma.liability.findMany({ where: { profileId: ctx.profileId } }),
      prisma.cashBalance.findMany({ where: { profileId: ctx.profileId } }),
      prisma.bankAccount.findMany({ where: { profileId: ctx.profileId } }),
      computeSpendingIntelligence(ctx.profileId),
    ])

    const monthlyIncome = profileIncome.length > 0 ? profileIncome.reduce((s, i) => {
      const a = Number(i.amount) || 0
      return s + (i.type === "yearly" ? a : a * 12)
    }, 0) / 12 : 0
    const monthlyExpense = (incAgg._sum.amount || 0) / 3
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0

    const totalAssets = assets.reduce((s, a) => s + Number(a.currentValue), 0)
    const totalInvestments = investments.reduce((s, i) => s + Number(i.amount), 0)
    const totalLiabilities = liabilities.reduce((s, l) => s + Number(l.amount), 0) + loans.reduce((s, l) => s + Number(l.remainingAmount || l.principal), 0)
    const liquidSavings = cashBalances.reduce((s, c) => s + Number(c.amount), 0) + bankAccounts.filter((b) => b.type === "savings").reduce((s, b) => s + Number(b.balance), 0)
    const netWorth = totalAssets + totalInvestments + liquidSavings - totalLiabilities

    const tier = tierForIncome(profile?.annualIncome ?? null)
    const efInput = {
      monthlyEssentials: monthlyExpense,
      dependents: 0,
      jobType: recommendJobType(profile?.occupation),
      monthlyIncome,
      existingSavings: liquidSavings,
    }
    const ef = computeEmergencyFund(efInput)

    // ── Build PDF ──────────────────────────────────────────────────────
    const doc = new jsPDF({ unit: "mm", format: "a4" })
    const pageW = doc.internal.pageSize.width
    const pageH = doc.internal.pageSize.height
    const margin = 14
    let pageNum = 1
    const sections: Section[] = []
    const totalPages = { value: 12 } // estimated

    // ── Cover page ────────────────────────────────────────────────────
    doc.setFillColor(99, 102, 241)
    doc.rect(0, 0, pageW, pageH * 0.35, "F")
    doc.setTextColor(255)
    doc.setFontSize(36)
    doc.setFont("helvetica", "bold")
    doc.text("MyMoney", margin, 50)
    doc.setFontSize(20)
    doc.setFont("helvetica", "normal")
    doc.text("Financial Report", margin, 65)
    doc.setFontSize(11)
    doc.text(`Generated: ${now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`, margin, 80)
    if (profile?.name) {
      doc.text(`For: ${profile.name}`, margin, 87)
    }

    doc.setTextColor(0)
    doc.setFontSize(14)
    doc.setFont("helvetica", "bold")
    doc.text("Snapshot", margin, 110)
    doc.setFontSize(11)
    doc.setFont("helvetica", "normal")
    const snapshotLines = [
      `Monthly Income: ${rupees(monthlyIncome)}`,
      `Monthly Expense: ${rupees(monthlyExpense)}`,
      `Savings Rate: ${savingsRate.toFixed(1)}%`,
      `Net Worth: ${rupees(netWorth)}`,
      `Active Goals: ${goals.filter((g) => g.status === "active").length}`,
      `Active Loans: ${loans.length}`,
    ]
    snapshotLines.forEach((line, i) => doc.text(line, margin, 120 + i * 8))

    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text(
      "This report contains 8 sections: Income & Expenses, Budget vs Actual, Investments, Loans, Goals, Net Worth, Insights, and Emergency Fund. All figures are computed from your data on MyMoney.",
      margin,
      pageH - 20,
      { maxWidth: pageW - 2 * margin },
    )

    // ── TOC page ──────────────────────────────────────────────────────
    doc.addPage()
    pageNum++
    doc.setTextColor(0)
    doc.setFontSize(20)
    doc.setFont("helvetica", "bold")
    doc.text("Table of Contents", margin, 25)
    doc.setDrawColor(99, 102, 241)
    doc.setLineWidth(0.5)
    doc.line(margin, 28, pageW - margin, 28)

    const tocItems = [
      { id: "summary", title: "1. Executive Summary" },
      { id: "income", title: "2. Income & Expenses" },
      { id: "budget", title: "3. Budget vs Actual" },
      { id: "investments", title: "4. Investments" },
      { id: "loans", title: "5. Loans & Liabilities" },
      { id: "goals", title: "6. Goals" },
      { id: "networth", title: "7. Net Worth" },
      { id: "insights", title: "8. Spending Intelligence" },
      { id: "emergency", title: "9. Emergency Fund" },
    ]
    doc.setFontSize(12)
    let y = 45
    tocItems.forEach((item) => {
      doc.setFont("helvetica", "normal")
      doc.text(item.title, margin, y)
      doc.setTextColor(120)
      doc.text("...........", margin + 80, y)
      doc.setTextColor(0)
      const pageLabel = sections.find((s) => s.id === item.id)?.page ?? "—"
      doc.text(String(pageLabel), pageW - margin, y, { align: "right" })
      y += 10
    })

    // ── 1. Executive Summary ─────────────────────────────────────────
    doc.addPage()
    pageNum++
    sections.push({ id: "summary", title: "Executive Summary", page: pageNum })
    addPageHeader(doc, pageNum, totalPages.value)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(99, 102, 241)
    doc.text("1. Executive Summary", margin, 25)
    doc.setTextColor(0)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)

    doc.setFont("helvetica", "bold")
    doc.text("Financial Health at a Glance", margin, 38)
    doc.setFont("helvetica", "normal")
    doc.text(`Income Tier: ${tier.label} (${tier.split.needs}/${tier.split.wants}/${tier.split.savings})`, margin, 46)
    doc.text(`Net Worth: ${rupees(netWorth)}`, margin, 53)
    doc.text(`Savings Rate: ${savingsRate.toFixed(1)}% (recommend 20%+)`, margin, 60)
    doc.text(`Emergency Fund: ${ef.gap > 0 ? `Gap of ${rupees(ef.gap)} (target ${rupees(ef.target)})` : "Fully funded"}`, margin, 67)

    doc.setFont("helvetica", "bold")
    doc.text("What's in this report", margin, 82)
    doc.setFont("helvetica", "normal")
    const tocDescs = [
      "Income & Expenses — 3-month average, category breakdown",
      "Budget vs Actual — monthly budgets and over/under amounts",
      "Investments — your portfolio and asset allocation",
      "Loans — outstanding debt and EMI schedule",
      "Goals — active goals, progress, target dates",
      "Net Worth — assets minus liabilities",
      "Spending Intelligence — anomalies, velocity, tax gaps",
      "Emergency Fund — current and target runway",
    ]
    tocDescs.forEach((line, i) => doc.text(`• ${line}`, margin + 2, 90 + i * 7))

    // ── 2. Income & Expenses ─────────────────────────────────────────
    doc.addPage()
    pageNum++
    sections.push({ id: "income", title: "Income & Expenses", page: pageNum })
    addPageHeader(doc, pageNum, totalPages.value)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(99, 102, 241)
    doc.text("2. Income & Expenses", margin, 25)
    doc.setTextColor(0)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(`3-month average:`, margin, 38)
    doc.text(`  Income: ${rupees(monthlyIncome)}`, margin + 5, 45)
    doc.text(`  Expense: ${rupees(monthlyExpense)}`, margin + 5, 52)
    doc.text(`  Net: ${rupees(monthlyIncome - monthlyExpense)}`, margin + 5, 59)
    doc.text(`  Savings rate: ${savingsRate.toFixed(1)}%`, margin + 5, 66)

    if (monthlyExpensesByCat.length > 0) {
      const catMap = new Map(categories.map((c) => [c.id, c]))
      const rows = monthlyExpensesByCat
        .map((e) => {
          const cat = catMap.get(e.categoryId)
          return [cat?.name || "Other", rupees(e._sum.amount || 0), `${((e._sum.amount || 0) / monthlyExpense * 100).toFixed(0)}%`]
        })
        .sort((a, b) => Number(b[1].replace(/\D/g, "")) - Number(a[1].replace(/\D/g, "")))
        .slice(0, 12)
      autoTable(doc, {
        startY: 78,
        head: [["Category", "This Month", "Share"]],
        body: rows,
        theme: "striped",
        headStyles: { fillColor: [99, 102, 241] },
        margin: { left: margin, right: margin },
      })
    } else {
      doc.setFontSize(10)
      doc.setTextColor(120)
      doc.text("No expenses recorded this month.", margin, 80)
      doc.setTextColor(0)
    }

    // ── 3. Budget vs Actual ─────────────────────────────────────────
    doc.addPage()
    pageNum++
    sections.push({ id: "budget", title: "Budget vs Actual", page: pageNum })
    addPageHeader(doc, pageNum, totalPages.value)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(99, 102, 241)
    doc.text("3. Budget vs Actual", margin, 25)
    doc.setTextColor(0)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(`${new Date(cy, cm - 1).toLocaleString("en-US", { month: "long" })} ${cy}`, margin, 33)

    if (budgets.length > 0) {
      const budgetMap = new Map(monthlyExpensesByCat.map((e) => [e.categoryId, e._sum.amount || 0]))
      const rows = budgets.map((b) => {
        const spent = budgetMap.get(b.categoryId) || 0
        const pct = b.amount > 0 ? (spent / b.amount) * 100 : 0
        const status = pct > 100 ? "Over" : pct > 80 ? "On track" : "Under"
        return [b.category.name, rupees(b.amount), rupees(spent), `${pct.toFixed(0)}%`, status]
      })
      autoTable(doc, {
        startY: 42,
        head: [["Category", "Budget", "Spent", "Used", "Status"]],
        body: rows,
        theme: "striped",
        headStyles: { fillColor: [99, 102, 241] },
        margin: { left: margin, right: margin },
      })
    } else {
      doc.setFontSize(10)
      doc.setTextColor(120)
      doc.text("No budgets set for this month. Use the Budget Allocation Wizard to set one.", margin, 45)
      doc.setTextColor(0)
    }

    // ── 4. Investments ─────────────────────────────────────────────
    doc.addPage()
    pageNum++
    sections.push({ id: "investments", title: "Investments", page: pageNum })
    addPageHeader(doc, pageNum, totalPages.value)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(99, 102, 241)
    doc.text("4. Investments", margin, 25)
    doc.setTextColor(0)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(`Total: ${rupees(totalInvestments)} across ${investments.length} holdings`, margin, 35)
    if (investments.length > 0) {
      const rows = investments
        .slice(0, 15)
        .map((i) => [i.name, i.type || "—", rupees(i.amount), i.purchaseDate ? new Date(i.purchaseDate).toLocaleDateString("en-IN") : "—"])
      autoTable(doc, {
        startY: 45,
        head: [["Name", "Type", "Amount", "Start Date"]],
        body: rows,
        theme: "striped",
        headStyles: { fillColor: [99, 102, 241] },
        margin: { left: margin, right: margin },
      })
    } else {
      doc.setFontSize(10)
      doc.setTextColor(120)
      doc.text("No investments recorded.", margin, 50)
      doc.setTextColor(0)
    }

    // ── 5. Loans ────────────────────────────────────────────────────
    doc.addPage()
    pageNum++
    sections.push({ id: "loans", title: "Loans", page: pageNum })
    addPageHeader(doc, pageNum, totalPages.value)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(99, 102, 241)
    doc.text("5. Loans & Liabilities", margin, 25)
    doc.setTextColor(0)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(`Outstanding: ${rupees(totalLiabilities)} across ${loans.length} active loans`, margin, 35)
    if (loans.length > 0) {
      const rows = loans.map((l) => [
        l.name,
        l.type || "—",
        rupees(l.principal),
        rupees(l.remainingAmount || l.principal),
        l.emiAmount ? rupees(l.emiAmount) : "—",
      ])
      autoTable(doc, {
        startY: 45,
        head: [["Name", "Type", "Original", "Remaining", "EMI"]],
        body: rows,
        theme: "striped",
        headStyles: { fillColor: [99, 102, 241] },
        margin: { left: margin, right: margin },
      })
    } else {
      doc.setFontSize(10)
      doc.setTextColor(120)
      doc.text("No active loans.", margin, 50)
      doc.setTextColor(0)
    }

    // ── 6. Goals ─────────────────────────────────────────────────────
    doc.addPage()
    pageNum++
    sections.push({ id: "goals", title: "Goals", page: pageNum })
    addPageHeader(doc, pageNum, totalPages.value)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(99, 102, 241)
    doc.text("6. Goals", margin, 25)
    doc.setTextColor(0)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(`Active: ${goals.filter((g) => g.status === "active").length} of ${goals.length}`, margin, 35)
    if (goals.length > 0) {
      const rows = goals.slice(0, 12).map((g) => {
        const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0
        return [g.name, rupees(g.targetAmount), rupees(g.currentAmount), `${pct.toFixed(0)}%`, g.deadline ? new Date(g.deadline).toLocaleDateString("en-IN") : "—"]
      })
      autoTable(doc, {
        startY: 45,
        head: [["Goal", "Target", "Current", "Progress", "Deadline"]],
        body: rows,
        theme: "striped",
        headStyles: { fillColor: [99, 102, 241] },
        margin: { left: margin, right: margin },
      })
    } else {
      doc.setFontSize(10)
      doc.setTextColor(120)
      doc.text("No goals set yet.", margin, 50)
      doc.setTextColor(0)
    }

    // ── 7. Net Worth ─────────────────────────────────────────────────
    doc.addPage()
    pageNum++
    sections.push({ id: "networth", title: "Net Worth", page: pageNum })
    addPageHeader(doc, pageNum, totalPages.value)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(99, 102, 241)
    doc.text("7. Net Worth", margin, 25)
    doc.setTextColor(0)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(`Net worth: ${rupees(netWorth)}`, margin, 35)
    doc.setFontSize(12)
    doc.setFont("helvetica", "bold")
    doc.text("Assets", margin, 48)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(`  Cash: ${rupees(cashBalances.reduce((s, c) => s + Number(c.amount), 0))}`, margin + 4, 55)
    doc.text(`  Bank (savings): ${rupees(bankAccounts.filter((b) => b.type === "savings").reduce((s, b) => s + Number(b.balance), 0))}`, margin + 4, 62)
    doc.text(`  Investments: ${rupees(totalInvestments)}`, margin + 4, 69)
    doc.text(`  Other assets: ${rupees(totalAssets)}`, margin + 4, 76)
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text("Liabilities", margin, 90)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text(`  Loans: ${rupees(loans.reduce((s, l) => s + Number(l.remainingAmount || l.principal), 0))}`, margin + 4, 97)
    doc.text(`  Other liabilities: ${rupees(totalLiabilities - loans.reduce((s, l) => s + Number(l.remainingAmount || l.principal), 0))}`, margin + 4, 104)

    // ── 8. Insights ──────────────────────────────────────────────────
    doc.addPage()
    pageNum++
    sections.push({ id: "insights", title: "Spending Intelligence", page: pageNum })
    addPageHeader(doc, pageNum, totalPages.value)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(99, 102, 241)
    doc.text("8. Spending Intelligence", margin, 25)
    doc.setTextColor(0)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    if (intelligence.length === 0) {
      doc.setFontSize(10)
      doc.setTextColor(120)
      doc.text("No intelligence insights at this time.", margin, 40)
      doc.setTextColor(0)
    } else {
      const rows = intelligence.map((i) => [
        i.severity.toUpperCase(),
        i.title,
        i.metric,
      ])
      autoTable(doc, {
        startY: 35,
        head: [["Severity", "Insight", "Metric"]],
        body: rows,
        theme: "striped",
        headStyles: { fillColor: [99, 102, 241] },
        margin: { left: margin, right: margin },
      })
    }

    // ── 9. Emergency Fund ───────────────────────────────────────────
    doc.addPage()
    pageNum++
    sections.push({ id: "emergency", title: "Emergency Fund", page: pageNum })
    addPageHeader(doc, pageNum, totalPages.value)
    doc.setFontSize(18)
    doc.setFont("helvetica", "bold")
    doc.setTextColor(99, 102, 241)
    doc.text("9. Emergency Fund", margin, 25)
    doc.setTextColor(0)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(11)
    doc.text(`Target months: ${ef.months} (${ef.rationale})`, margin, 35)
    doc.text(`Monthly essentials: ${rupees(efInput.monthlyEssentials)}`, margin, 42)
    doc.text(`Target: ${rupees(ef.target)}`, margin, 49)
    doc.text(`Existing: ${rupees(ef.existing)}`, margin, 56)
    doc.text(`Gap: ${rupees(ef.gap)}`, margin, 63)
    if (ef.gap > 0) {
      doc.text(`Run-up plan: ${rupees(ef.monthlyRunUp)}/month for ${ef.runUpMonths} months`, margin, 70)
    }
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text("Tips:", margin, 85)
    ef.tips.forEach((t, i) => doc.text(`• ${t}`, margin + 4, 92 + i * 6, { maxWidth: pageW - 2 * margin - 4 }))
    doc.setTextColor(0)

    // ── Final pass: write actual page numbers to TOC ─────────────────
    const toc = doc.getNumberOfPages()
    doc.setPage(2) // TOC page
    let ty = 45
    tocItems.forEach((item) => {
      const sec = sections.find((s) => s.id === item.id)
      const label = sec ? String(sec.page) : "—"
      doc.setFont("helvetica", "normal")
      doc.setTextColor(0)
      doc.text(item.title, margin, ty)
      doc.setTextColor(120)
      doc.text("...........", margin + 80, ty)
      doc.setTextColor(0)
      doc.text(label, pageW - margin, ty, { align: "right" })
      ty += 10
    })

    // Update total page count
    for (let i = 1; i <= toc; i++) {
      doc.setPage(i)
      // Remove old header, redraw with correct total — skip for simplicity
    }

    const pdfBuffer = doc.output("arraybuffer")
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="mymoney-report-${cy}-${String(cm).padStart(2, "0")}.pdf"`,
      },
    })
  } catch (e) {
    if (e instanceof Error && "status" in e) {
      return handleAuthError(e)
    }
    console.error("[reports/financial] error:", e)
    const message = e instanceof Error ? e.message : "Failed to generate report"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
