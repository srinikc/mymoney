import { NextResponse } from "next/server"
import { withAuth } from "@/lib/with-auth"
import * as fs from "node:fs"
import * as path from "node:path"

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const auth = await withAuth()
  if (auth.error) return auth.error
  const { name } = await params

  // Check private uploads first, then public
  const newPath = path.join(process.cwd(), "data", "uploads", "receipts", name)
  const oldPath = path.join(process.cwd(), "public", "uploads", name)

  let resolvedPath: string | null = null
  if (fs.existsSync(newPath)) resolvedPath = newPath
  else if (fs.existsSync(oldPath)) resolvedPath = oldPath

  if (!resolvedPath) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const buffer = fs.readFileSync(resolvedPath)
  const ext = name.split(".").pop()?.toLowerCase()
  const mimeMap: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": mimeMap[ext || ""] || "application/octet-stream",
      "Cache-Control": "private, max-age=31536000",
    },
  })
}