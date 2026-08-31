export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error("Token refresh failed: " + text)
  }
  return res.json()
}

export async function driveGetRaw(path: string, accessToken: string): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const body = await res.text()
  return { ok: res.ok, status: res.status, body }
}

export async function driveDownloadRaw(fileId: string, accessToken: string): Promise<{ ok: boolean; status: number; buffer: ArrayBuffer | null; body: string }> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const body = await res.text()
    return { ok: false, status: res.status, buffer: null, body }
  }
  return { ok: true, status: res.status, buffer: await res.arrayBuffer(), body: "" }
}
