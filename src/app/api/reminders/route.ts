import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateBody } from "@/shared/validate"
import { ReminderCreateSchema, ReminderUpdateSchema } from "@/shared/validation"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type") // "upcoming" | "completed" | "all"

  const where: Record<string, unknown> = {}
  if (type === "upcoming") {
    where.isCompleted = false
    where.dueDate = { not: null }
  } else if (type === "completed") {
    where.isCompleted = true
  }

  const reminders = await prisma.reminder.findMany({
    where,
    orderBy: [{ isCompleted: "asc" }, { dueDate: "asc" }],
    take: 50,
    include: { category: true },
  })

  return NextResponse.json(reminders)
}

export async function POST(req: Request) {
  const { data: body, error } = await validateBody(req, ReminderCreateSchema)
  if (error) return error
  const reminder = await prisma.reminder.create({
    data: {
      title: body.title,
      description: body.description || null,
      type: body.type || "custom",
      priority: body.priority || "normal",
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      amount: body.amount ? Number(body.amount) : null,
      categoryId: body.categoryId ? Number(body.categoryId) : null,
      merchantKey: body.merchantKey || null,
      recurring: body.recurring || "none",
    },
  })
  return NextResponse.json(reminder, { status: 201 })
}

export async function PUT(req: Request) {
  const { data: body, error } = await validateBody(req, ReminderUpdateSchema)
  if (error) return error
  const reminder = await prisma.reminder.update({
    where: { id: Number(body.id) },
    data: {
      title: body.title,
      description: body.description,
      priority: body.priority,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      amount: body.amount !== undefined ? (body.amount ? Number(body.amount) : null) : undefined,
      categoryId: body.categoryId ? Number(body.categoryId) : null,
      recurring: body.recurring,
      isCompleted: body.isCompleted !== undefined ? body.isCompleted : undefined,
      completedAt: body.isCompleted ? new Date() : null,
    },
  })
  return NextResponse.json(reminder)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  await prisma.reminder.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
