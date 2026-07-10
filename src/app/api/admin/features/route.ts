import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireRole } from "@/lib/roles"
import { validateBody } from "@/shared/validate"
import { FeatureFlagCreateSchema } from "@/shared/validation"

/**
 * GET /api/admin/features — List all feature flags (admin-only)
 */
export async function GET(req: Request) {
  const session = await auth()
  const forbid = requireRole(session?.user as any, "admin")
  if (forbid) return forbid

  const features = await prisma.featureFlag.findMany({
    orderBy: { name: "asc" },
  })

  return NextResponse.json(features)
}

/**
 * POST /api/admin/features — Create a new feature flag (admin-only)
 */
export async function POST(req: Request) {
  const session = await auth()
  const forbid = requireRole(session?.user as any, "admin")
  if (forbid) return forbid

  const { data: body, error } = await validateBody(req, FeatureFlagCreateSchema)
  if (error) return error

  // Check for duplicate name
  const existing = await prisma.featureFlag.findUnique({ where: { name: body.name } })
  if (existing) {
    return NextResponse.json({ error: "A feature flag with this name already exists" }, { status: 409 })
  }

  const feature = await prisma.featureFlag.create({
    data: {
      name: body.name,
      enabled: body.enabled ?? false,
      tier: body.tier ?? "free",
    },
  })

  return NextResponse.json(feature, { status: 201 })
}
