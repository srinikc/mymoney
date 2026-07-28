import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const profileId = (session.user as unknown as { profileId?: number }).profileId
    const { searchParams } = new URL(req.url)
    const fy = searchParams.get("fy") || "2025-26"

    const where = profileId ? { profileId } : {}

    const incomeSources = await prisma.incomeSource.findMany({ where })
    const totalMonthly = incomeSources
      .filter((s) => s.type === "monthly")
      .reduce((sum, s) => sum + s.amount, 0)
    const totalYearly = incomeSources
      .filter((s) => s.type === "yearly")
      .reduce((sum, s) => sum + s.amount, 0)
    const totalOneTime = incomeSources
      .filter((s) => s.type === "onetime")
      .reduce((sum, s) => sum + s.amount, 0)
    const totalVariable = incomeSources
      .filter((s) => s.type === "variable")
      .reduce((sum, s) => sum + (s.amount || 0) * 12, 0)

    const grossTotalIncome = totalMonthly * 12 + totalYearly + totalOneTime + totalVariable

    const documents = await prisma.taxDocument.findMany({ where: { ...where, fy } })
    const form16 = documents.find((d) => d.type === "form16")
    const form26as = documents.find((d) => d.type === "form26as")

    return NextResponse.json({
      fy,
      grossTotalIncome,
      incomeSources: { monthly: totalMonthly, yearly: totalYearly, oneTime: totalOneTime, variable: totalVariable },
      salaryIncome: form16?.metadata ? (form16.metadata as Record<string, unknown>).grossSalary || 0 : 0,
      tdsFromForm16: form16?.metadata ? (form16.metadata as Record<string, unknown>).tds || 0 : 0,
      tdsFrom26AS: form26as?.metadata ? (form26as.metadata as Record<string, unknown>).tdsDeducted || 0 : 0,
      documentsCount: documents.length,
    })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
