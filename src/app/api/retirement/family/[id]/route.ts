import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { FamilyMemberUpdateSchema } from "@/shared/validation"

export const runtime = "nodejs"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { profileId } = await getAuthContext()
    const { id } = await params
    const memberId = Number(id)
    if (isNaN(memberId)) {
      return NextResponse.json({ error: "Invalid member id" }, { status: 400 })
    }

    const existing = await prisma.familyMember.findFirst({ where: { id: memberId, profileId } })
    if (!existing) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    const body = await req.json()
    const parsed = FamilyMemberUpdateSchema.safeParse({ ...body, id: memberId })
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 })
    }

    const { id: _id, ...updateData } = parsed.data
    const data: Record<string, unknown> = {}
    if (updateData.relation !== undefined) data.relation = updateData.relation
    if (updateData.name !== undefined) data.name = updateData.name
    if (updateData.dateOfBirth !== undefined) data.dateOfBirth = updateData.dateOfBirth ? new Date(updateData.dateOfBirth) : null
    if (updateData.birthMonth !== undefined) data.birthMonth = updateData.birthMonth ? Number(updateData.birthMonth) : null
    if (updateData.birthYear !== undefined) data.birthYear = updateData.birthYear ? Number(updateData.birthYear) : null
    if (updateData.annualIncome !== undefined) data.annualIncome = updateData.annualIncome ? Number(updateData.annualIncome) : null
    if (updateData.occupation !== undefined) data.occupation = updateData.occupation || null
    if (updateData.educationLevel !== undefined) data.educationLevel = updateData.educationLevel || null
    if (updateData.isDependent !== undefined) data.isDependent = updateData.isDependent
    if (updateData.monthlySupport !== undefined) data.monthlySupport = updateData.monthlySupport ? Number(updateData.monthlySupport) : null
    if (updateData.notes !== undefined) data.notes = updateData.notes || null

    const member = await prisma.familyMember.update({ where: { id: memberId }, data })
    return NextResponse.json(member)
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
    const memberId = Number(id)
    if (isNaN(memberId)) {
      return NextResponse.json({ error: "Invalid member id" }, { status: 400 })
    }

    const existing = await prisma.familyMember.findFirst({ where: { id: memberId, profileId } })
    if (!existing) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    await prisma.familyMember.delete({ where: { id: memberId } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return handleAuthError(e)
  }
}
