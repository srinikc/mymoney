import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/with-auth"

async function getOwnedLiability(id: number, profileId: number) {
  return prisma.liability.findUnique({ where: { id } }).then((l) =>
    l && l.profileId === profileId ? l : null
  )
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  const { id } = await params
  try {
    const existing = await getOwnedLiability(Number.parseInt(id), profileId)
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const body = await req.json()
    const liability = await prisma.liability.update({
      where: { id: existing.id },
      data: {
        name: body.name,
        type: body.type,
        amount: Number.parseFloat(body.amount),
        interestRate: body.interestRate ? Number.parseFloat(body.interestRate) : null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes ?? null,
      },
    })
    return NextResponse.json(liability)
  } catch (error) {
    console.error("Liability update error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  const { id } = await params
  const existing = await getOwnedLiability(Number.parseInt(id), profileId)
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })
  await prisma.liability.delete({ where: { id: existing.id } })
  return NextResponse.json({ success: true })
}
