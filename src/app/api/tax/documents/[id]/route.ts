import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { isViewer, type AuthUser } from "@/lib/roles"
import { unlink } from "node:fs/promises"
import path from "node:path"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const profileId = (session.user as unknown as { profileId?: number }).profileId
    const { id } = await params

    const doc = await prisma.taxDocument.findFirst({
      where: { id: Number(id), ...(profileId ? { profileId } : {}) },
    })
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }
    return NextResponse.json(doc)
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (isViewer(session?.user as AuthUser)) {
      return NextResponse.json({ error: "Viewers cannot modify data" }, { status: 403 })
    }
    const profileId = (session.user as unknown as { profileId?: number }).profileId
    const { id } = await params

    const doc = await prisma.taxDocument.findFirst({
      where: { id: Number(id), ...(profileId ? { profileId } : {}) },
    })
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    try {
      const fullPath = path.join(process.cwd(), "public", doc.filePath)
      await unlink(fullPath)
    } catch { /* ignore file cleanup errors */ }

    await prisma.taxDocument.delete({ where: { id: doc.id } })
    return NextResponse.json({ message: "Document deleted" })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
