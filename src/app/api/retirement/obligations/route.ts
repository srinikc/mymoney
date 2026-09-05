import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { ObligationCreateSchema } from "@/shared/validation"

export const runtime = "nodejs"

export async function GET() {
  try {
    const { profileId } = await getAuthContext()
    const obligations = await prisma.obligation.findMany({
      where: { profileId },
      orderBy: [{ type: "asc" }, { description: "asc" }],
    })
    return NextResponse.json(obligations)
  } catch (e) {
    return handleAuthError(e)
  }
}

export async function POST(req: Request) {
  try {
    const { profileId } = await getAuthContext()
    const body = await req.json()
    const parsed = ObligationCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 })
    }
    const data = parsed.data
    const obligation = await prisma.obligation.create({
      data: {
        profileId,
        type: data.type,
        description: data.description,
        monthlyAmount: Number(data.monthlyAmount),
        annualAmount: data.annualAmount ? Number(data.annualAmount) : Number(data.monthlyAmount) * 12,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        isActive: data.isActive ?? true,
        notes: data.notes || null,
      },
    })
    return NextResponse.json(obligation, { status: 201 })
  } catch (e) {
    return handleAuthError(e)
  }
}
