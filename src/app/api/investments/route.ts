import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/with-auth"
import { validateBody } from "@/shared/validate"
import { InvestmentCreateSchema, InvestmentUpdateSchema } from "@/shared/validation"

export async function GET() {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  const investments = await prisma.investment.findMany({ where: { profileId }, orderBy: { purchaseDate: "desc" } })
  return NextResponse.json(investments)
}

export async function POST(req: Request) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  const { data: body, error } = await validateBody(req, InvestmentCreateSchema)
  if (error) return error
  const investment = await prisma.investment.create({
    data: {
      profileId,
      type: body.type,
      name: body.name,
      symbol: body.symbol || null,
      quantity: body.quantity ? Number(body.quantity) : null,
      buyPrice: body.buyPrice ? Number(body.buyPrice) : null,
      amount: Number(body.amount),
      currentValue: Number(body.currentValue || body.amount),
      purchaseDate: new Date(body.purchaseDate),
      returnRate: body.returnRate ? Number(body.returnRate) : null,
      purpose: body.purpose || null,
      linkedGoalId: body.linkedGoalId ? Number(body.linkedGoalId) : null,
      notes: body.notes || null,
      status: body.status || "active",
      employeeContribution: body.employeeContribution === undefined || body.employeeContribution === null || body.employeeContribution === "" ? null : Number(body.employeeContribution),
      employerContribution: body.employerContribution === undefined || body.employerContribution === null || body.employerContribution === "" ? null : Number(body.employerContribution),
      passbookUrl: body.passbookUrl || null,
      projectionYears: body.projectionYears === undefined || body.projectionYears === null || body.projectionYears === "" ? null : Number(body.projectionYears),
      fdNumber: body.fdNumber || null,
      bankName: body.bankName || null,
      maturityDate: body.maturityDate ? new Date(body.maturityDate) : null,
      paymentMode: body.paymentMode || null,
      monthlyContribution: body.monthlyContribution === undefined || body.monthlyContribution === null || body.monthlyContribution === "" ? null : Number(body.monthlyContribution),
      totalMonths: body.totalMonths === undefined || body.totalMonths === null || body.totalMonths === "" ? null : Number(body.totalMonths),
      completedMonths: body.completedMonths === undefined || body.completedMonths === null || body.completedMonths === "" ? null : Number(body.completedMonths),
    },
  })
  return NextResponse.json(investment, { status: 201 })
}

export async function PUT(req: Request) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  const { data: body, error } = await validateBody(req, InvestmentUpdateSchema)
  if (error) return error
  const existing = await prisma.investment.findUnique({ where: { id: Number(body.id) } })
  if (!existing || existing.profileId !== profileId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  const investment = await prisma.investment.update({
    where: { id: existing.id },
    data: {
      type: body.type,
      name: body.name,
      symbol: body.symbol,
      quantity: body.quantity === undefined ? undefined : (body.quantity ? Number(body.quantity) : null),
      buyPrice: body.buyPrice === undefined ? undefined : (body.buyPrice ? Number(body.buyPrice) : null),
      amount: body.amount === undefined ? undefined : Number(body.amount),
      currentValue: body.currentValue === undefined ? undefined : Number(body.currentValue),
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : undefined,
      returnRate: body.returnRate === undefined ? undefined : (body.returnRate ? Number(body.returnRate) : null),
      purpose: body.purpose,
      linkedGoalId: body.linkedGoalId === undefined ? undefined : (body.linkedGoalId ? Number(body.linkedGoalId) : null),
      notes: body.notes,
      status: body.status,
      employeeContribution: body.employeeContribution === undefined ? undefined : (body.employeeContribution === null || body.employeeContribution === "" ? null : Number(body.employeeContribution)),
      employerContribution: body.employerContribution === undefined ? undefined : (body.employerContribution === null || body.employerContribution === "" ? null : Number(body.employerContribution)),
      passbookUrl: body.passbookUrl === undefined ? undefined : (body.passbookUrl || null),
      projectionYears: body.projectionYears === undefined ? undefined : (body.projectionYears === null || body.projectionYears === "" ? null : Number(body.projectionYears)),
      fdNumber: body.fdNumber === undefined ? undefined : (body.fdNumber || null),
      bankName: body.bankName === undefined ? undefined : (body.bankName || null),
      maturityDate: body.maturityDate === undefined ? undefined : (body.maturityDate ? new Date(body.maturityDate) : null),
      paymentMode: body.paymentMode === undefined ? undefined : (body.paymentMode || null),
      monthlyContribution: body.monthlyContribution === undefined ? undefined : (body.monthlyContribution === null || body.monthlyContribution === "" ? null : Number(body.monthlyContribution)),
      totalMonths: body.totalMonths === undefined ? undefined : (body.totalMonths === null || body.totalMonths === "" ? null : Number(body.totalMonths)),
      completedMonths: body.completedMonths === undefined ? undefined : (body.completedMonths === null || body.completedMonths === "" ? null : Number(body.completedMonths)),
    },
  })
  return NextResponse.json(investment)
}

export async function DELETE(req: Request) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  const existing = await prisma.investment.findUnique({ where: { id: Number.parseInt(id) } })
  if (!existing || existing.profileId !== profileId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  await prisma.investment.delete({ where: { id: existing.id } })
  return NextResponse.json({ success: true })
}
