import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/with-auth"

export async function GET() {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth

  const cash = await prisma.cashBalance.findFirst({
    where: profileId ? { profileId } : {},
    orderBy: { updatedAt: "desc" },
  })

  return NextResponse.json({ cash: cash ?? { amount: 0, notes: null } })
}

export async function PUT(req: Request) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth

  const body = await req.json()
  const amount = typeof body.amount === "number" && !isNaN(body.amount) ? body.amount : 0
  const notes = typeof body.notes === "string" ? body.notes : null

  const existing = await prisma.cashBalance.findFirst({
    where: profileId ? { profileId } : {},
    orderBy: { updatedAt: "desc" },
  })

  let cash
  if (existing) {
    cash = await prisma.cashBalance.update({
      where: { id: existing.id },
      data: { amount, notes },
    })
  } else {
    cash = await prisma.cashBalance.create({
      data: { profileId: profileId || undefined, amount, notes },
    })
  }

  return NextResponse.json(cash)
}