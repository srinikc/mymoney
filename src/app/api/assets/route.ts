import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateBody } from "@/shared/validate"
import { AssetCreateSchema, AssetUpdateSchema } from "@/shared/validation"
import { withAuth } from "@/lib/with-auth"

export async function GET() {
  const assets = await prisma.asset.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(assets)
}

export async function POST(req: Request) {
  const { data: body, error } = await validateBody(req, AssetCreateSchema)
  if (error) return error
  const asset = await prisma.asset.create({
    data: {
      name: body.name,
      type: body.type || "other",
      currentValue: body.currentValue,
      purchasePrice: body.purchasePrice ?? null,
      purchaseDate: body.purchaseDate ? new Date(body.purchaseDate) : null,
      quantity: body.quantity ?? null,
      unit: body.unit || null,
      location: body.location || null,
      status: body.status || "owned",
      notes: body.notes || null,
    },
  })
  return NextResponse.json(asset, { status: 201 })
}

export async function PUT(req: Request) {
  const { data: body, error } = await validateBody(req, AssetUpdateSchema)
  if (error) return error
  const asset = await prisma.asset.update({
    where: { id: Number(body.id) },
    data: {
      name: body.name,
      type: body.type,
      currentValue: body.currentValue === undefined ? undefined : Number(body.currentValue),
      purchasePrice: body.purchasePrice === undefined ? undefined : (body.purchasePrice ? Number(body.purchasePrice) : null),
      purchaseDate: body.purchaseDate === undefined ? undefined : (body.purchaseDate ? new Date(body.purchaseDate) : null),
      quantity: body.quantity === undefined ? undefined : (body.quantity ? Number(body.quantity) : null),
      unit: body.unit,
      location: body.location,
      status: body.status,
      notes: body.notes,
    },
  })
  return NextResponse.json(asset)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  await prisma.asset.delete({ where: { id: Number.parseInt(id) } })
  return NextResponse.json({ success: true })
}
