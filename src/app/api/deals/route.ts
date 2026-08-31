import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/with-auth"
import { validateBody } from "@/shared/validate"
import { DealCreateSchema } from "@/shared/validation"

export async function GET() {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  const deals = await prisma.deal.findMany({
    where: { profileId, isActive: true },
    orderBy: { validUntil: "asc" },
    take: 20,
  })
  return NextResponse.json(deals)
}

export async function POST(req: Request) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  const { data: body, error } = await validateBody(req, DealCreateSchema)
  if (error) return error
  const deal = await prisma.deal.create({
    data: {
      profileId,
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
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  try {
    const { id } = await req.json()
    const existing = await prisma.deal.findUnique({ where: { id } })
    if (!existing || existing.profileId !== profileId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    await prisma.deal.delete({ where: { id: existing.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Deal delete error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 400 })
  }
}
