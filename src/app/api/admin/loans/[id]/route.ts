import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireRole, type AuthUser } from "@/lib/roles"

export const runtime = "nodejs"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const forbid = requireRole(session?.user as AuthUser, "admin")
  if (forbid) return forbid

  const { id } = await params
  const productId = Number(id)
  if (!Number.isFinite(productId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }

  await prisma.loanProduct.delete({ where: { id: productId } })
  return NextResponse.json({ ok: true })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const forbid = requireRole(session?.user as AuthUser, "admin")
  if (forbid) return forbid

  const { id } = await params
  const productId = Number(id)
  if (!Number.isFinite(productId)) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 })
  }

  const body = (await req.json()) as Partial<{
    bankName: string
    productName: string
    loanType: string
    interestRateMin: number
    interestRateMax: number
    maxAmount: number
    tenureMonths: number
    processingFee: string
    features: string[]
    affiliateUrl: string
    affiliateNetwork: string
    isSponsored: boolean
    isActive: boolean
    displayOrder: number
  }>

  const updated = await prisma.loanProduct.update({
    where: { id: productId },
    data: {
      ...body,
      features: body.features ? JSON.stringify(body.features) : undefined,
    },
  })
  return NextResponse.json({ ok: true, product: updated })
}
