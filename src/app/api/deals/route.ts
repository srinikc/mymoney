import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateBody } from "@/shared/validate"
import { DealCreateSchema } from "@/shared/validation"
import { withAuth } from "@/lib/with-auth"

export async function GET() {
  const deals = await prisma.deal.findMany({
    where: { isActive: true },
    orderBy: { validUntil: "asc" },
    take: 20,
  })
  return NextResponse.json(deals)
}

export async function POST(req: Request) {
  const { data: body, error } = await validateBody(req, DealCreateSchema)
  if (error) return error
  const deal = await prisma.deal.create({
    data: {
      merchant: body.merchant,
      title: body.title,
      description: body.description || null,
      discount: body.discount || null,
      couponCode: body.couponCode || null,
      url: body.url || null,
      validUntil: body.validUntil ? new Date(body.validUntil) : null,
      category: body.category || null,
      isActive: body.isActive !== false,
    },
  })
  return NextResponse.json(deal, { status: 201 })
}

export async function DELETE(req: Request) {
  try {
    const { id } = await req.json()
    await prisma.deal.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Deal delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 400 })
  }
}
