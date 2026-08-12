import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateBody } from "@/shared/validate"
import { InvestmentCreateSchema, InvestmentUpdateSchema } from "@/shared/validation"
import { withAuth } from "@/lib/with-auth"

export async function GET() {
  const investments = await prisma.investment.findMany({ orderBy: { purchaseDate: "desc" } })
  return NextResponse.json(investments)
}

export async function POST(req: Request) {
  const { data: body, error } = await validateBody(req, InvestmentCreateSchema)
  if (error) return error
  const investment = await prisma.investment.create({
    data: {
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
    },
  })
  return NextResponse.json(investment, { status: 201 })
}

export async function PUT(req: Request) {
  const { data: body, error } = await validateBody(req, InvestmentUpdateSchema)
  if (error) return error
  const investment = await prisma.investment.update({
    where: { id: Number(body.id) },
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
    },
  })
  return NextResponse.json(investment)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  await prisma.investment.delete({ where: { id: Number.parseInt(id) } })
  return NextResponse.json({ success: true })
}
