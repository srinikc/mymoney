import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"
import { generateCategorySheets } from "@/lib/export-utils"
import { formatIndianCurrency } from "@/lib/format"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const format = searchParams.get("format") || "xlsx"
  const type = searchParams.get("type") || "expenses"
  const month = searchParams.get("month")
  const year = searchParams.get("year")
  const quarter = searchParams.get("quarter")

  if (type === "expenses-enhanced" && format === "xlsx") {
    const now = new Date()
    const currentYear = now.getFullYear()
    const y = year ? Number.parseInt(year) : currentYear

    let dateFilter: Record<string, Date> | undefined
    if (month) {
      const m = Number.parseInt(month)
      dateFilter = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) }
    } else if (quarter) {
      const q = Number.parseInt(quarter)
      dateFilter = { gte: new Date(y, (q - 1) * 3, 1), lt: new Date(y, q * 3, 1) }
    } else {
      dateFilter = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) }
    }

    const expenses = await prisma.expense.findMany({
      where: { date: dateFilter },
      include: { category: true },
      orderBy: [{ categoryId: "asc" }, { date: "desc" }],
    })

    const typedExpenses = expenses.map((e) => ({
      ...e,
      date: e.date.toISOString(),
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      deletedAt: e.deletedAt ? e.deletedAt.toISOString() : null,
    }))

    const sheets = generateCategorySheets(typedExpenses)
    const wb = XLSX.utils.book_new()
    for (const sheet of sheets) {
      const ws = XLSX.utils.json_to_sheet(sheet.data)
      XLSX.utils.book_append_sheet(wb, ws, sheet.name)
    }

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="enhanced-expense-report-${y}.xlsx"`,
      },
    })
  }

  let data: Record<string, unknown>[]
  const sheetName = type

  switch (type) {
    case "expenses": {
      const where: Record<string, unknown> = {}
      if (month && year) {
        const m = Number.parseInt(month)
        const y = Number.parseInt(year)
        where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) }
      }
      const expenses = await prisma.expense.findMany({ where, include: { category: true }, orderBy: { date: "desc" } })
      data = expenses.map((e) => ({
        Date: e.date.toISOString().split("T")[0],
        Amount: formatIndianCurrency(e.amount),
        Category: e.category.name,
        Vendor: e.vendor || "",
        Description: e.description || "",
        "Payment Mode": e.paymentMode,
        Person: e.person || "",
        Notes: e.notes || "",
      }))
      break
    }
    case "budgets": {
      const budgets = await prisma.budget.findMany({ include: { category: true }, orderBy: [{ year: "desc" }, { month: "desc" }] })
      data = budgets.map((b) => ({
        Category: b.category.name,
        Month: b.month,
        Year: b.year,
        "Budget Amount": formatIndianCurrency(b.amount),
      }))
      break
    }
    case "goals": {
      const goals = await prisma.goal.findMany({ orderBy: { createdAt: "desc" } })
      data = goals.map((g) => ({
        Name: g.name,
        "Target Amount": formatIndianCurrency(g.targetAmount),
        "Current Amount": formatIndianCurrency(g.currentAmount),
        Progress: `${g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0}%`,
        Deadline: g.deadline ? g.deadline.toISOString().split("T")[0] : "",
        Category: g.category,
        Status: g.status,
      }))
      break
    }
    case "investments": {
      const investments = await prisma.investment.findMany({ orderBy: { purchaseDate: "desc" } })
      data = investments.map((i) => ({
        Type: i.type,
        Name: i.name,
        "Invested Amount": formatIndianCurrency(i.amount),
        "Current Value": formatIndianCurrency(i.currentValue),
        "Return (%)": i.returnRate ? `${i.returnRate}%` : "",
        "Purchase Date": i.purchaseDate.toISOString().split("T")[0],
        Status: i.status,
      }))
      break
    }
    case "plans": {
      const plans = await prisma.plan.findMany({ orderBy: { createdAt: "desc" } })
      data = plans.map((p) => ({
        Name: p.name,
        Description: p.description || "",
        Category: p.category,
        "Amount Needed": formatIndianCurrency(p.amountNeeded),
        "Amount Saved": formatIndianCurrency(p.amountSaved),
        "Monthly Contribution": p.monthlyContribution ? formatIndianCurrency(p.monthlyContribution) : "",
        Deadline: p.deadline ? p.deadline.toISOString().split("T")[0] : "",
        Status: p.status,
      }))
      break
    }
    default: {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
    }
  }

  if (format === "xlsx") {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${type}-export.xlsx"`,
      },
    })
  }

  return NextResponse.json(data)
}
