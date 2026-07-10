import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionFromCookie } from "@/lib/get-session"
import { validateBody } from "@/shared/validate"
import { IncomeSourceUpdateSchema } from "@/shared/income-validation"

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie(req.headers.get("cookie"))
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const source = await prisma.incomeSource.findUnique({
      where: { id: Number.parseInt(id) },
      include: { category: true },
    })
    if (!source) {
      return NextResponse.json({ error: "Income source not found" }, { status: 404 })
    }
    return NextResponse.json(source)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie(req.headers.get("cookie"))
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { data: body, error } = await validateBody(req, IncomeSourceUpdateSchema)
    if (error) return error

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.type !== undefined) data.type = body.type
    if (body.amount !== undefined) data.amount = body.amount
    if (body.categoryId !== undefined) data.categoryId = body.categoryId
    if (body.categoryName !== undefined && !body.categoryId) {
      const cat = await prisma.category.findFirst({ where: { name: body.categoryName, type: "income" } })
      if (cat) {
        data.categoryId = cat.id
      } else {
        const created = await prisma.category.create({ data: { name: body.categoryName, type: "income", icon: "circle", color: "#10b981" } })
        data.categoryId = created.id
      }
    }
    if (body.autoDetect !== undefined) data.autoDetect = body.autoDetect
    if (body.matchMerchant !== undefined) data.matchMerchant = body.matchMerchant
    if (body.matchPerson !== undefined) data.matchPerson = body.matchPerson
    if (body.paymentMode !== undefined) data.paymentMode = body.paymentMode
    if (body.bankAccount !== undefined) data.bankAccount = body.bankAccount
    if (body.businessRevenue !== undefined) data.businessRevenue = body.businessRevenue
    if (body.businessExpenses !== undefined) data.businessExpenses = body.businessExpenses
    if (body.businessOtherExp !== undefined) data.businessOtherExp = body.businessOtherExp
    if (body.businessOtherAmt !== undefined) data.businessOtherAmt = body.businessOtherAmt
    if (body.businessInvestment !== undefined) data.businessInvestment = body.businessInvestment
    if (body.isProfitPostTax !== undefined) data.isProfitPostTax = body.isProfitPostTax
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null
    if (body.endDate !== undefined) data.endDate = body.endDate ? new Date(body.endDate) : null
    if (body.notes !== undefined) data.notes = body.notes

    const source = await prisma.incomeSource.update({
      where: { id: Number.parseInt(id) },
      data,
      include: { category: true },
    })
    return NextResponse.json(source)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie(req.headers.get("cookie"))
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    await prisma.incomeSource.delete({ where: { id: Number.parseInt(id) } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
