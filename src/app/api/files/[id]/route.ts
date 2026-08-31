import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { withAuth } from "@/lib/with-auth"
import * as fs from "node:fs"
import * as path from "node:path"

function resolveFilePath(dbPath: string): string | null {
  // New format: "tax/safeName" — stored in data/uploads/
  const newPath = path.join(process.cwd(), "data", "uploads", dbPath)
  if (fs.existsSync(newPath)) return newPath

  // Old format: "/uploads/tax/safeName" — stored in public/uploads/
  const oldPath = path.join(process.cwd(), "public", dbPath)
  if (fs.existsSync(oldPath)) return oldPath

  return null
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { profileId } = auth

  const { id } = await params

  const doc = await prisma.taxDocument.findFirst({
    where: { id: Number(id), profileId },
  })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const resolvedPath = resolveFilePath(doc.filePath)
  if (!resolvedPath) return NextResponse.json({ error: "File not found on disk" }, { status: 404 })

  const buffer = fs.readFileSync(resolvedPath)
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${doc.fileName}"`,
      "Content-Length": String(buffer.length),
    },
  })
}