import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireRole, type AuthUser } from "@/lib/roles"

export const runtime = "nodejs"

const KEY = "ad.globalKillSwitch"

export async function GET() {
  const session = await auth()
  const forbid = requireRole(session?.user as AuthUser, "admin")
  if (forbid) return forbid

  const row = await prisma.systemConfig.findUnique({ where: { key: KEY } })
  return NextResponse.json({ killSwitch: row?.value ?? { value: false } })
}

export async function PUT(req: Request) {
  const session = await auth()
  const forbid = requireRole(session?.user as AuthUser, "admin")
  if (forbid) return forbid

  const body = (await req.json()) as { enabled: boolean; reason?: string }
  const value = { value: body.enabled, reason: body.reason ?? null, updatedAt: new Date().toISOString() }
  await prisma.systemConfig.upsert({
    where: { key: KEY },
    update: { value: value as object as object },
    create: { key: KEY, value: value as object as object },
  })
  return NextResponse.json({ ok: true, enabled: body.enabled })
}
