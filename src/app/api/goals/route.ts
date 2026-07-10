import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { validateBody } from "@/shared/validate"
import { GoalCreateSchema } from "@/shared/validation"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const goals = await prisma.goal.findMany({
    where: { profileId: session.user.profileId },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(goals)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

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
      profileId: session.user.profileId,
    },
  })
  return NextResponse.json(goal, { status: 201 })
}
