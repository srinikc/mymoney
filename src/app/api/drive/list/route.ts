import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/with-auth"
import { driveGetRaw } from "@/lib/oauth"

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  createdTime?: string
}

export async function GET() {
  let accessToken: string
  try {
    const { userId } = await getAuthContext()
    const { prisma } = await import("@/lib/prisma")
    const account = await prisma.account.findFirst({
      where: { userId, provider: "google" },
      select: { id: true, access_token: true, refresh_token: true, expires_at: true },
    })
    if (!account?.access_token) {
      return NextResponse.json({ error: "Not authenticated", needsReauth: true }, { status: 401 })
    }
    const { getAccessToken } = await import("@/lib/gmail")
    accessToken = await getAccessToken(userId)
  } catch {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  const queries = [
    `files?q=name contains 'takeout'&orderBy=createdTime desc&pageSize=20&fields=files(id,name,mimeType,size,createdTime)`,
    `files?q=name contains 'Google Pay'&orderBy=createdTime desc&pageSize=20&fields=files(id,name,mimeType,size,createdTime)`,
    `files?q=mimeType='application/zip' or mimeType='application/x-zip-compressed'&orderBy=createdTime desc&pageSize=20&fields=files(id,name,mimeType,size,createdTime)`,
    `files?q=name='MyActivity.html'&orderBy=createdTime desc&pageSize=10&fields=files(id,name,mimeType,size,createdTime)`,
  ]
  const allFiles: DriveFile[] = []
  for (const query of queries) {
    const result = await driveGetRaw(query, accessToken)
    if (!result.ok) {
      if (result.body.includes("insufficient") || result.status === 401) {
        return NextResponse.json({ error: "Insufficient permissions", needsReauth: true }, { status: 401 })
      }
      continue
    }
    try {
      const data = JSON.parse(result.body)
      if (data.files) {
        allFiles.push(...data.files.map((f: DriveFile) => ({
          id: f.id, name: f.name, mimeType: f.mimeType,
          size: f.size, createdTime: f.createdTime,
        })))
      }
    } catch { /* skip */ }
  }
  const seen = new Set<string>()
  const unique = allFiles.filter(f => { if (seen.has(f.id)) return false; seen.add(f.id); return true })
    .sort((a, b) => (b.createdTime || "").localeCompare(a.createdTime || "")).slice(0, 30)
  return NextResponse.json({ files: unique, connected: true })
}
