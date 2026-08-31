import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { validateBody } from "@/shared/validate"
import {
  ProfilePutSchema,
  ProfileUpdateSchema,
  dateOfBirthFromMonthYear,
  calculateAge,
} from "@/shared/profile-validation"

function shape(p: any) {
  return {
    id: p.id,
    name: p.name,
    userId: p.userId,
    isDefault: p.isDefault,
    dateOfBirth: p.dateOfBirth ? p.dateOfBirth.toISOString() : null,
    annualIncome: p.annualIncome ?? null,
    monthlyIncome: p.annualIncome != null ? Math.round((p.annualIncome / 12) * 100) / 100 : null,
    occupation: p.occupation ?? null,
    age: calculateAge(p.dateOfBirth),
    language: p.language ?? "en",
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }
}

async function ensureOwned(profileId: number) {
  const { userId } = await getAuthContext()
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
  })
  if (!profile) return { error: NextResponse.json({ error: "Profile not found" }, { status: 404 }) }
  if (profile.userId !== userId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { profile }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const profileId = Number(id)
    if (!Number.isFinite(profileId)) {
      return NextResponse.json({ error: "Invalid profile id" }, { status: 400 })
    }
    const { profile, error } = await ensureOwned(profileId)
    if (error) return error
    return NextResponse.json(shape(profile))
  } catch (e) {
    return handleAuthError(e)
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const profileId = Number(id)
    if (!Number.isFinite(profileId)) {
      return NextResponse.json({ error: "Invalid profile id" }, { status: 400 })
    }
    const { profile, error } = await ensureOwned(profileId)
    if (error) return error

    const { data: body, error: vErr } = await validateBody(req, ProfilePutSchema)
    if (vErr) return vErr

    const dob = body.dateOfBirth ? dateOfBirthFromMonthYear(body.dateOfBirth) : null
    const updated = await prisma.profile.update({
      where: { id: profileId },
      data: {
        name: body.name,
        isDefault: body.isDefault,
        dateOfBirth: dob,
        annualIncome: body.annualIncome,
        occupation: body.occupation,
        language: body.language,
      },
    })

    if (body.isDefault) {
      await prisma.profile.updateMany({
        where: { userId: profile.userId, id: { not: profileId } },
        data: { isDefault: false },
      })
    }

    return NextResponse.json(shape(updated))
  } catch (e) {
    return handleAuthError(e)
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const profileId = Number(id)
    if (!Number.isFinite(profileId)) {
      return NextResponse.json({ error: "Invalid profile id" }, { status: 400 })
    }
    const { profile, error } = await ensureOwned(profileId)
    if (error) return error

    const { data: body, error: vErr } = await validateBody(req, ProfileUpdateSchema)
    if (vErr) return vErr

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.isDefault !== undefined) data.isDefault = body.isDefault
    if (body.annualIncome !== undefined) data.annualIncome = body.annualIncome
    if (body.occupation !== undefined) data.occupation = body.occupation
    if (body.language !== undefined) data.language = body.language
    if (body.dateOfBirth !== undefined) {
      data.dateOfBirth = body.dateOfBirth ? dateOfBirthFromMonthYear(body.dateOfBirth) : null
    }

    const updated = await prisma.profile.update({
      where: { id: profileId },
      data,
    })

    if (body.isDefault === true) {
      await prisma.profile.updateMany({
        where: { userId: profile.userId, id: { not: profileId } },
        data: { isDefault: false },
      })
    }

    return NextResponse.json(shape(updated))
  } catch (e) {
    return handleAuthError(e)
  }
}
