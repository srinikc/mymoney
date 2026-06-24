import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateBody } from "@/shared/validate"
import { PlanCreateSchema, PlanUpdateSchema } from "@/shared/validation"

export async function GET() {
  const plans = await prisma.plan.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(plans)
}

export async function POST(req: Request) {
  const { data: body, error } = await validateBody(req, PlanCreateSchema)
  if (error) return error
  const plan = await prisma.plan.create({
    data: {
      name: body.name,
      description: body.description || null,
      category: body.category || "general",
      amountNeeded: Number(body.amountNeeded),
      amountSaved: Number(body.amountSaved || "0"),
      monthlyContribution: body.monthlyContribution ? Number(body.monthlyContribution) : null,
      deadline: body.deadline ? new Date(body.deadline) : null,
      status: body.status || "active",
      notes: body.notes || null,
    },
  })
  return NextResponse.json(plan, { status: 201 })
}

export async function PUT(req: Request) {
  const { data: body, error } = await validateBody(req, PlanUpdateSchema)
  if (error) return error
  const plan = await prisma.plan.update({
    where: { id: Number(body.id) },
    data: {
      name: body.name,
      description: body.description,
      category: body.category,
      amountNeeded: body.amountNeeded !== undefined ? Number(body.amountNeeded) : undefined,
      amountSaved: body.amountSaved !== undefined ? Number(body.amountSaved) : undefined,
      monthlyContribution: body.monthlyContribution !== undefined
        ? (body.monthlyContribution ? Number(body.monthlyContribution) : null)
        : undefined,
      deadline: body.deadline !== undefined ? (body.deadline ? new Date(body.deadline) : null) : undefined,
      status: body.status,
      notes: body.notes,
    },
  })
  return NextResponse.json(plan)
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  await prisma.plan.delete({ where: { id: parseInt(id) } })
  return NextResponse.json({ success: true })
}
