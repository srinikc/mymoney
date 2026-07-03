import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateBody } from "@/shared/validate"
import { SubscriptionCreateSchema, SubscriptionUpdateSchema } from "@/shared/validation"

export async function GET() {
  const subscriptions = await prisma.subscription.findMany({
    orderBy: [{ nextDueDate: "asc" }, { createdAt: "desc" }],
  })
  return NextResponse.json(subscriptions)
}

export async function POST(req: Request) {
  const { data: body, error } = await validateBody(req, SubscriptionCreateSchema)
  if (error) return error
  const subscription = await prisma.subscription.create({ data: body })
  return NextResponse.json(subscription, { status: 201 })
}

export async function PUT(req: Request) {
  const { data: body, error } = await validateBody(req, SubscriptionUpdateSchema)
  if (error) return error
  const subscription = await prisma.subscription.update({
    where: { id: Number(body.id) },
    data: body,
  })
  return NextResponse.json(subscription)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  await prisma.subscription.delete({ where: { id: Number.parseInt(id) } })
  return NextResponse.json({ success: true })
}
