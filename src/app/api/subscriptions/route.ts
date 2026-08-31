import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/with-auth"
import { validateBody } from "@/shared/validate"
import { SubscriptionCreateSchema, SubscriptionUpdateSchema } from "@/shared/validation"

export async function GET() {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  const subscriptions = await prisma.subscription.findMany({
    where: { profileId },
    orderBy: [{ nextDueDate: "asc" }, { createdAt: "desc" }],
  })
  return NextResponse.json(subscriptions)
}

export async function POST(req: Request) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  const { data: body, error } = await validateBody(req, SubscriptionCreateSchema)
  if (error) return error
  const subscription = await prisma.subscription.create({
    data: {
      profileId,
      name: body.name,
      provider: body.provider,
      amount: body.amount,
      billingCycle: body.billingCycle,
      nextDueDate: body.nextDueDate ?? null,
      category: body.category,
      status: body.status,
      notes: body.notes ?? null,
    },
  })
  return NextResponse.json(subscription, { status: 201 })
}

export async function PUT(req: Request) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  const { data: body, error } = await validateBody(req, SubscriptionUpdateSchema)
  if (error) return error
  const existing = await prisma.subscription.findUnique({ where: { id: Number(body.id) } })
  if (!existing || existing.profileId !== profileId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  const subscription = await prisma.subscription.update({
    where: { id: existing.id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.provider !== undefined && { provider: body.provider }),
      ...(body.amount !== undefined && { amount: body.amount }),
      ...(body.billingCycle !== undefined && { billingCycle: body.billingCycle }),
      ...(body.nextDueDate !== undefined && { nextDueDate: body.nextDueDate }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.status !== undefined && { status: body.status }),
      ...(body.notes !== undefined && { notes: body.notes }),
    },
  })
  return NextResponse.json(subscription)
}

export async function DELETE(req: Request) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  const existing = await prisma.subscription.findUnique({ where: { id: Number.parseInt(id) } })
  if (!existing || existing.profileId !== profileId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  await prisma.subscription.delete({ where: { id: existing.id } })
  return NextResponse.json({ success: true })
}
