import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateBody } from "@/shared/validate"
import { GoalCreateSchema, GoalUpdateSchema } from "@/shared/validation"

export async function GET() {
  const goals = await prisma.goal.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(goals)
}

export async function POST(req: Request) {
  const { data: body, error } = await validateBody(req, GoalCreateSchema)
  if (error) return error
  const goal = await prisma.goal.create({
    data: {
      name: body.name,
      targetAmount: Number(body.targetAmount),
      currentAmount: Number(body.currentAmount || "0"),
      deadline: body.deadline ? new Date(body.deadline) : null,
      category: body.category || "savings",
      notes: body.notes || null,
      status: body.status || "active",
    },
  })
  return NextResponse.json(goal, { status: 201 })
}

export async function PUT(req: Request) {
  const { data: body, error } = await validateBody(req, GoalUpdateSchema)
  if (error) return error
  const goal = await prisma.goal.update({
    where: { id: Number(body.id) },
    data: {
      name: body.name,
      targetAmount: body.targetAmount !== undefined ? Number(body.targetAmount) : undefined,
      currentAmount: body.currentAmount !== undefined ? Number(body.currentAmount) : undefined,
      deadline: body.deadline !== undefined ? (body.deadline ? new Date(body.deadline) : null) : undefined,
      category: body.category,
      notes: body.notes,
      status: body.status,
    },
  })
  return NextResponse.json(goal)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  await prisma.goal.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
