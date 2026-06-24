import { NextResponse } from "next/server"
import { getStoredToken, storeToken } from "@/lib/token-store"
import { driveGetRaw, refreshAccessToken } from "@/lib/oauth"

interface DriveFile {
  id: string
  name: string
  mimeType: string
  size?: string
  createdTime?: string
}

async function fetchWithRefresh(path: string, token: { accessToken: string; refreshToken: string }) {
  let res = await driveGetRaw(path, token.accessToken)

  if ((res.status === 401 || res.status === 403) && token.refreshToken) {
    try {
      const refreshed = await refreshAccessToken(token.refreshToken)
      token.accessToken = refreshed.access_token
      await storeToken({ ...token, accessToken: refreshed.access_token })
      res = await driveGetRaw(path, token.accessToken)
    } catch {
      return { ok: false, needsReauth: true, body: "Session expired", status: 401 }
    }
  }

  if (!res.ok) {
    const isScope = res.body.includes("insufficient")
    return { ok: false, needsReauth: isScope, body: res.body, status: res.status }
  }

  return { ok: true, body: res.body, status: res.status }
}

export async function GET() {
  const token = await getStoredToken()
  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  // Search with multiple strategies to find Takeout/GPay files
  const queries = [
    // Strategy 1: Files with "takeout" in name (no mime filter)
    `files?q=name contains 'takeout'&orderBy=createdTime desc&pageSize=20&fields=files(id,name,mimeType,size,createdTime)`,
    // Strategy 2: Files with "Google Pay" in name
    `files?q=name contains 'Google Pay'&orderBy=createdTime desc&pageSize=20&fields=files(id,name,mimeType,size,createdTime)`,
    // Strategy 3: Recent ZIP files (fallback)
    `files?q=mimeType='application/zip' or mimeType='application/x-zip-compressed'&orderBy=createdTime desc&pageSize=20&fields=files(id,name,mimeType,size,createdTime)`,
  ]

  const allFiles: DriveFile[] = []

  for (const query of queries) {
    const result = await fetchWithRefresh(query, { accessToken: token.accessToken, refreshToken: token.refreshToken })
    if (!result.ok) {
      if (result.needsReauth) {
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
    } catch { /* skip unparseable */ }
  }

  // Deduplicate by id
  const seen = new Set<string>()
  const unique = allFiles.filter(f => {
    if (seen.has(f.id)) return false
    seen.add(f.id)
    return true
  }).slice(0, 30)

  return NextResponse.json({ files: unique, connected: true, email: token.email })
}
