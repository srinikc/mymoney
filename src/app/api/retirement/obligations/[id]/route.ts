import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { ObligationUpdateSchema } from "@/shared/validation"

export const runtime = "nodejs"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profileId } = await getAuthContext()
    const { id } = await params
    const obligationId = Number(id)
    if (isNaN(obligationId)) {
      return NextResponse.json({ error: "Invalid obligation id" }, { status: 400 })
    }

    const existing = await prisma.obligation.findFirst({ where: { id: obligationId, profileId } })
    if (!existing) {
      return NextResponse.json({ error: "Obligation not found" }, { status: 404 })
    }

    const body = await req.json()
    const parsed = ObligationUpdateSchema.safeParse({ ...body, id: obligationId })
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 })
    }

    const { id: _id, ...updateData } = parsed.data
    const data: Record<string, unknown> = {}
    if (updateData.type !== undefined) data.type = updateData.type
    if (updateData.description !== undefined) data.description = updateData.description
    if (updateData.monthlyAmount !== undefined) {
      data.monthlyAmount = Number(updateData.monthlyAmount)
      if (updateData.annualAmount === undefined) {
        data.annualAmount = Number(updateData.monthlyAmount) * 12
      }
    }
    if (updateData.annualAmount !== undefined) data.annualAmount = updateData.annualAmount ? Number(updateData.annualAmount) : null
    if (updateData.startDate !== undefined) data.startDate = updateData.startDate ? new Date(updateData.startDate) : null
    if (updateData.endDate !== undefined) data.endDate = updateData.endDate ? new Date(updateData.endDate) : null
    if (updateData.isActive !== undefined) data.isActive = updateData.isActive
    if (updateData.notes !== undefined) data.notes = updateData.notes || null

    const obligation = await prisma.obligation.update({ where: { id: obligationId }, data })
    return NextResponse.json(obligation)
  } catch (e) {
    return handleAuthError(e)
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profileId } = await getAuthContext()
    const { id } = await params
    const obligationId = Number(id)
    if (isNaN(obligationId)) {
      return NextResponse.json({ error: "Invalid obligation id" }, { status: 400 })
    }

    const existing = await prisma.obligation.findFirst({ where: { id: obligationId, profileId } })
    if (!existing) {
      return NextResponse.json({ error: "Obligation not found" }, { status: 404 })
    }

    await prisma.obligation.delete({ where: { id: obligationId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return handleAuthError(e)
  }
}
