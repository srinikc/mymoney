import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/with-auth"

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth
  const { id } = await params
  const asset = await prisma.asset.findUnique({ where: { id: Number.parseInt(id) } })
  if (!asset || asset.profileId !== profileId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  await prisma.asset.delete({ where: { id: asset.id } })
  return NextResponse.json({ success: true })
}
