import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { validateBody } from "@/shared/validate"
import { FeatureFlagUpdateSchema } from "@/shared/validation"

/**
 * PUT /api/admin/features/:id — Update feature flag (admin-only)
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: { role: true },
  })
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  const { id } = await params
  const featureId = Number(id)
  if (Number.isNaN(featureId)) {
    return NextResponse.json({ error: "Invalid feature ID" }, { status: 400 })
  }

  const existing = await prisma.featureFlag.findUnique({ where: { id: featureId } })
  if (!existing) {
    return NextResponse.json({ error: "Feature flag not found" }, { status: 404 })
  }

  const { data: body, error } = await validateBody(req, FeatureFlagUpdateSchema)
  if (error) return error

  const updated = await prisma.featureFlag.update({
    where: { id: featureId },
    data: {
      ...(body.enabled !== undefined && { enabled: body.enabled }),
      ...(body.tier !== undefined && { tier: body.tier }),
    },
  })

  return NextResponse.json(updated)
}

/**
 * DELETE /api/admin/features/:id — Delete feature flag (admin-only)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: Number(session.user.id) },
    select: { role: true },
  })
  if (!currentUser || currentUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 })
  }

  const { id } = await params
  const featureId = Number(id)
  if (Number.isNaN(featureId)) {
    return NextResponse.json({ error: "Invalid feature ID" }, { status: 400 })
  }

  const existing = await prisma.featureFlag.findUnique({ where: { id: featureId } })
  if (!existing) {
    return NextResponse.json({ error: "Feature flag not found" }, { status: 404 })
  }

  await prisma.featureFlag.delete({ where: { id: featureId } })

  return NextResponse.json({ success: true, deletedFeatureId: featureId })
}
