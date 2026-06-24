import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const format = searchParams.get("format") || "xlsx"
  const type = searchParams.get("type") || "expenses"
  const month = searchParams.get("month")
  const year = searchParams.get("year")

  let data: Record<string, unknown>[]
  const sheetName = type

  switch (type) {
    case "expenses": {
      const where: Record<string, unknown> = {}
      if (month && year) {
        const m = parseInt(month)
        const y = parseInt(year)
        where.date = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) }
      }
      const expenses = await prisma.expense.findMany({ where, include: { category: true }, orderBy: { date: "desc" } })
      data = expenses.map((e) => ({
        Date: e.date.toISOString().split("T")[0],
        Amount: e.amount,
        Category: e.category.name,
        Vendor: e.vendor || "",
        Description: e.description || "",
        "Payment Mode": e.paymentMode,
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
        "Budget Amount": b.amount,
      }))
      break
    }
    case "goals": {
      const goals = await prisma.goal.findMany({ orderBy: { createdAt: "desc" } })
      data = goals.map((g) => ({
        Name: g.name,
        "Target Amount": g.targetAmount,
        "Current Amount": g.currentAmount,
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
        "Invested Amount": i.amount,
        "Current Value": i.currentValue,
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
        "Amount Needed": p.amountNeeded,
        "Amount Saved": p.amountSaved,
        "Monthly Contribution": p.monthlyContribution || "",
        Deadline: p.deadline ? p.deadline.toISOString().split("T")[0] : "",
        Status: p.status,
      }))
      break
    }
    default:
      return NextResponse.json({ error: "Invalid type" }, { status: 400 })
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
