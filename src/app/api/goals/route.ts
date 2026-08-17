import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/with-auth"
import { validateBody } from "@/shared/validate"
import { GoalCreateSchema } from "@/shared/validation"

export async function GET() {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  // userId auto-checked by getAuthContext

  const goals = await prisma.goal.findMany({
    where: { profileId: profileId },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(goals)
}

export async function POST(req: Request) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  // userId auto-checked by getAuthContext

  const { data: body, error } = await validateBody(req, GoalCreateSchema)
  if (error) return error
  const goal = await prisma.goal.create({
    data: {
      name: body.name,
      targetAmount: Number(body.targetAmount),
      currentAmount: Number(body.currentAmount || "0"),
      deadline: body.deadline ? new Date(body.deadline) : null,
      category: body.category || "savings",
      term: body.term || "medium",
      priority: body.priority || "P1",
      type: body.type || "Other",
      description: body.description || null,
      monthlyContribution: body.monthlyContribution ? Number(body.monthlyContribution) : null,
      notes: body.notes || null,
      status: body.status || "active",
      profileId: profileId,
    },
  })
  return NextResponse.json(goal, { status: 201 })
}
