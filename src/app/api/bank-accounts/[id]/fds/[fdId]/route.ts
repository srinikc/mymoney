import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; fdId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id, fdId } = await params
    const body = await req.json()

    if (body.maturityDate && body.startDate && new Date(body.maturityDate) <= new Date(body.startDate)) {
      return NextResponse.json({ error: "Maturity date must be after start date" }, { status: 400 })
    }

    const fd = await prisma.fixedDeposit.update({
      where: { id: Number(fdId) },
      data: {
        fdNumber: body.fdNumber,
        principal: body.principal,
        interestRate: body.interestRate,
        startDate: body.startDate ? new Date(body.startDate) : null,
        maturityDate: body.maturityDate ? new Date(body.maturityDate) : null,
        maturityAmount: body.maturityAmount,
        status: body.status,
        notes: body.notes,
      },
    })
    return NextResponse.json(fd)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; fdId: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id, fdId } = await params
    await prisma.fixedDeposit.delete({ where: { id: Number(fdId) } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
