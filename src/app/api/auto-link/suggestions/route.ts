import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

interface AutoLinkSuggestion {
  expenseId: number
  expenseDate: string
  expenseAmount: number
  expenseVendor: string
  matchType: "income" | "investment" | "insurance" | "loan"
  matchLabel: string
  targetId?: number
  targetName: string
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const profileId = (session.user as unknown as { profileId?: number }).profileId
    const where = profileId ? { profileId } : {}

    const [
      expenses,
      incomeSources,
      categories,
      insurances,
      loans,
    ] = await Promise.all([
      prisma.expense.findMany({
        where: { ...where, vendor: { not: null } },
        orderBy: { date: "desc" },
        include: { category: true },
      }),
      prisma.incomeSource.findMany({ where }),
      prisma.category.findMany(),
      prisma.insurance.findMany({ where }),
      prisma.loan.findMany({ where }),
    ])

    const suggestions: AutoLinkSuggestion[] = []

    for (const expense of expenses) {
      const vendor = expense.vendor?.toLowerCase()
      if (!vendor) continue

      // Match expense vendor against income source matchMerchant
      for (const source of incomeSources) {
        if (source.matchMerchant && vendor.includes(source.matchMerchant.toLowerCase())) {
          suggestions.push({
            expenseId: expense.id,
            expenseDate: expense.date.toISOString().split("T")[0],
            expenseAmount: expense.amount,
            expenseVendor: expense.vendor || "",
            matchType: "income",
            matchLabel: "Match by merchant name",
            targetId: source.id,
            targetName: source.name,
          })
        }
      }

      // Match expense with insurance provider
      for (const policy of insurances) {
        if (policy.provider && vendor.includes(policy.provider.toLowerCase())) {
          suggestions.push({
            expenseId: expense.id,
            expenseDate: expense.date.toISOString().split("T")[0],
            expenseAmount: expense.amount,
            expenseVendor: expense.vendor || "",
            matchType: "insurance",
            matchLabel: "Match by provider name",
            targetId: policy.id,
            targetName: policy.name,
          })
        }
      }

      // Match expense with loan lender
      for (const loan of loans) {
        if (loan.lender && vendor.includes(loan.lender.toLowerCase())) {
          suggestions.push({
            expenseId: expense.id,
            expenseDate: expense.date.toISOString().split("T")[0],
            expenseAmount: expense.amount,
            expenseVendor: expense.vendor || "",
            matchType: "loan",
            matchLabel: "Match by lender name",
            targetId: loan.id,
            targetName: loan.name,
          })
        }
      }

      // Match expense with "Investment" category
      const investmentCategory = categories.find((c) =>
        c.name.toLowerCase() === "investment" && c.type === "expense"
      )
      if (investmentCategory && expense.categoryId === investmentCategory.id) {
        suggestions.push({
          expenseId: expense.id,
          expenseDate: expense.date.toISOString().split("T")[0],
          expenseAmount: expense.amount,
          expenseVendor: expense.vendor || "",
          matchType: "investment",
          matchLabel: "Expense categorized as Investment",
          targetName: expense.vendor || "Unknown",
        })
      }
    }

    return NextResponse.json({ suggestions })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
