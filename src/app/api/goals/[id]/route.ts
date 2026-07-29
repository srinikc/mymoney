import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { validateBody } from "@/shared/validate"
import { GoalUpdateSchema } from "@/shared/validation"

async function getOwnedGoal(id: number, profileId?: number) {
  const goal = await prisma.goal.findUnique({ where: { id } })
  if (!goal) return null
  if (profileId && goal.profileId !== profileId) return null
  return goal
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
    const { profileId, userId, role } = await getAuthContext()
  // userId auto-checked by getAuthContext
  const goal = await getOwnedGoal(Number(id), profileId)
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(goal)
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
    const { profileId, userId, role } = await getAuthContext()
  // userId auto-checked by getAuthContext
  const goal = await getOwnedGoal(Number(id), profileId)
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { data: body, error } = await validateBody(req, GoalUpdateSchema)
  if (error) return error
  const updated = await prisma.goal.update({
    where: { id: Number(id) },
    data: {
      name: body.name,
      targetAmount: body.targetAmount === undefined ? undefined : Number(body.targetAmount),
      currentAmount: body.currentAmount === undefined ? undefined : Number(body.currentAmount),
      deadline: body.deadline === undefined ? undefined : (body.deadline ? new Date(body.deadline) : null),
      category: body.category,
      term: body.term,
      priority: body.priority,
      type: body.type,
      description: body.description,
      monthlyContribution: body.monthlyContribution === undefined
        ? undefined
        : (body.monthlyContribution ? Number(body.monthlyContribution) : null),
      notes: body.notes,
      status: body.status,
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
    const { profileId, userId, role } = await getAuthContext()
  // userId auto-checked by getAuthContext
  const goal = await getOwnedGoal(Number(id), profileId)
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 })
  await prisma.goal.delete({ where: { id: Number(id) } })
  return NextResponse.json({ success: true })
}
