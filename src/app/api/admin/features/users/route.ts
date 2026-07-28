import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireRole, type AuthUser } from "@/lib/roles"

const TIER_ORDER: Record<string, number> = { free: 0, pro: 1, premium: 2 }

export async function GET() {
  const session = await auth()
  const forbid = requireRole(session?.user as AuthUser, "admin")
  if (forbid) return forbid

  const [users, features, overrides] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        tier: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.featureFlag.findMany({ orderBy: { name: "asc" } }),
    prisma.userSetting.findMany({
      where: { key: { startsWith: "feature.override." } },
      select: { userId: true, key: true, value: true },
    }),
  ])

  const overrideMap = new Map<string, boolean>()
  for (const o of overrides) {
    const featureName = o.key.replace("feature.override.", "")
    const val = typeof o.value === "object" && o.value !== null
      ? (o.value as Record<string, unknown>).enabled as boolean
      : o.value === true
    overrideMap.set(`${o.userId}:${featureName}`, val)
  }

  const result = users.map((user) => {
    const userTierOrder = TIER_ORDER[user.tier] ?? 0
    const userFeatures = features.map((f) => {
      const overrideKey = `${user.id}:${f.name}`
      const hasOverride = overrideMap.has(overrideKey)
      const overrideEnabled = overrideMap.get(overrideKey) ?? false
      const tierAccess = userTierOrder >= (TIER_ORDER[f.tier] ?? 0)
      const effective = hasOverride ? overrideEnabled : (tierAccess && f.enabled)
      return {
        name: f.name,
        tier: f.tier,
        globallyEnabled: f.enabled,
        tierAccess,
        overrideEnabled: hasOverride ? overrideEnabled : null,
        effective,
      }
    })
    return { ...user, features: userFeatures }
  })

  return NextResponse.json({ users: result, features })
}

export async function PUT(req: Request) {
  const session = await auth()
  const forbid = requireRole(session?.user as AuthUser, "admin")
  if (forbid) return forbid

  const body = await req.json()
  const { userId, featureName, enabled } = body
  if (!userId || !featureName || enabled === undefined) {
    return NextResponse.json({ error: "userId, featureName, and enabled are required" }, { status: 400 })
  }

  const key = `feature.override.${featureName}`
  const existing = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key } },
  })

  if (existing) {
    await prisma.userSetting.update({
      where: { userId_key: { userId, key } },
      data: { value: { enabled } },
    })
  } else {
    await prisma.userSetting.create({
      data: { userId, key, value: { enabled } },
    })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  const session = await auth()
  const forbid = requireRole(session?.user as AuthUser, "admin")
  if (forbid) return forbid

  const body = await req.json()
  const { userId, featureName } = body
  if (!userId || !featureName) {
    return NextResponse.json({ error: "userId and featureName are required" }, { status: 400 })
  }

  const key = `feature.override.${featureName}`
  await prisma.userSetting.deleteMany({
    where: { userId, key },
  })

  return NextResponse.json({ ok: true })
}
