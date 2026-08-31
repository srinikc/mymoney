import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; fdId: string }> }) {
  try {
    const { fdId } = await params
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
    console.error("FD PUT error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; fdId: string }> }) {
  try {
    const { fdId } = await params
    await prisma.fixedDeposit.delete({ where: { id: Number(fdId) } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("FD DELETE error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
