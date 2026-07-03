import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const body = await req.json()
    const asset = await prisma.asset.update({
      where: { id: Number.parseInt(id) },
      data: {
        name: body.name,
        type: body.type,
        amount: Number.parseFloat(body.amount),
        notes: body.notes ?? null,
      },
    })
    return NextResponse.json(asset)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.asset.delete({ where: { id: Number.parseInt(id) } })
  return NextResponse.json({ success: true })
}
