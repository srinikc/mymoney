import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const liability = await prisma.liability.update({
      where: { id: parseInt(id) },
      data: {
        name: body.name,
        type: body.type,
        amount: parseFloat(body.amount),
        interestRate: body.interestRate ? parseFloat(body.interestRate) : null,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        notes: body.notes ?? null,
      },
    })
    return NextResponse.json(liability)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.liability.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
