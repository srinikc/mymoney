import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookie } from "@/lib/get-session"
import { validateBody } from "@/shared/validate"
import { IncomeSourceCreateSchema } from "@/shared/income-validation"

export async function GET() {
  try {
    const session = await getSessionFromCookie()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const profileId = (session.user as unknown as { profileId?: number }).profileId

    const where = profileId ? { profileId } : {}

    const sources = await prisma.incomeSource.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(sources)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionFromCookie()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const profileId = (session.user as unknown as { profileId?: number }).profileId

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
        categoryId,
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
    return NextResponse.json(source, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
