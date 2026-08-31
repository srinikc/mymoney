import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext } from "@/lib/with-auth"
import { validateBody } from "@/shared/validate"
import { IncomeSourceCreateSchema } from "@/shared/income-validation"
import { syncProfileAnnualIncome } from "@/shared/income-sync"

export async function GET(_req: Request) {
    const { profileId } = await getAuthContext()

    const where = profileId ? { profileId } : {}

    const sources = await prisma.incomeSource.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(sources)
}

export async function POST(req: Request) {
    const { profileId, role } = await getAuthContext()
    if (role === "viewer") {
      return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 })
    }

    const { data: body, error } = await validateBody(req, IncomeSourceCreateSchema)
    if (error) return error

    // Resolve categoryId from categoryName if needed
    let categoryId = body.categoryId
    if (!categoryId && body.categoryName) {
      const cat = await prisma.category.findFirst({
        where: { name: body.categoryName, type: "income" },
      })
      if (cat) {
        categoryId = cat.id
      } else {
        const created = await prisma.category.create({
          data: { name: body.categoryName, type: "income", icon: "circle", color: "#10b981" },
        })
        categoryId = created.id
      }
    }

    const source = await prisma.incomeSource.create({
      data: {
        profileId: profileId ?? null,
        name: body.name,
        type: body.type || "monthly",
        amount: body.amount,
        categoryId: categoryId ?? 1,
        autoDetect: body.autoDetect ?? false,
        matchMerchant: body.matchMerchant ?? null,
        matchPerson: body.matchPerson ?? null,
        paymentMode: body.paymentMode ?? null,
        bankAccount: body.bankAccount ?? null,
        businessRevenue: body.businessRevenue ?? null,
        businessExpenses: body.businessExpenses ?? null,
        businessOtherExp: body.businessOtherExp ?? null,
        businessOtherAmt: body.businessOtherAmt ?? null,
        businessInvestment: body.businessInvestment ?? null,
        isProfitPostTax: body.isProfitPostTax ?? false,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        notes: body.notes ?? null,
      },
      include: { category: true },
    })
    if (profileId) {
      try {
        await syncProfileAnnualIncome(profileId)
      } catch {
        // best-effort sync
      }
    }
    return NextResponse.json(source, { status: 201 })
}
