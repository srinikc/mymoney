import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { FamilyMemberCreateSchema } from "@/shared/validation"

export const runtime = "nodejs"

export async function GET() {
  try {
    const { profileId } = await getAuthContext()
    const members = await prisma.familyMember.findMany({
      where: { profileId },
      orderBy: [{ relation: "asc" }, { name: "asc" }],
    })
    return NextResponse.json(members)
  } catch (e) {
    return handleAuthError(e)
  }
}

export async function POST(req: Request) {
  try {
    const { profileId } = await getAuthContext()
    const body = await req.json()
    const parsed = FamilyMemberCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 })
    }
    const data = parsed.data
    const member = await prisma.familyMember.create({
      data: {
        profileId,
        relation: data.relation,
        name: data.name,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        birthMonth: data.birthMonth ? Number(data.birthMonth) : null,
        birthYear: data.birthYear ? Number(data.birthYear) : null,
        annualIncome: data.annualIncome ? Number(data.annualIncome) : null,
        occupation: data.occupation || null,
        educationLevel: data.educationLevel || null,
        isDependent: data.isDependent ?? false,
        monthlySupport: data.monthlySupport ? Number(data.monthlySupport) : null,
        notes: data.notes || null,
      },
    })
    return NextResponse.json(member, { status: 201 })
  } catch (e) {
    return handleAuthError(e)
  }
}
