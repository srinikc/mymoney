import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const assets = await prisma.asset.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(assets)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const asset = await prisma.asset.create({
      data: {
        name: body.name,
        type: body.type || "other",
        amount: Number.parseFloat(body.amount),
        notes: body.notes || null,
      },
    })
    return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 400 })
  }
}
