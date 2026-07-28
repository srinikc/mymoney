import { cookies } from "next/headers"

interface TokenData {
  accessToken: string
  refreshToken: string
  email?: string
  name?: string
}

export async function getStoredToken(): Promise<TokenData | null> {
  const cookieStore = await cookies()
  const data = cookieStore.get("gdrive_token")?.value
  if (!data) return null
  try {
    return JSON.parse(decodeURIComponent(data))
  } catch {
    return null
  }
}

export async function storeToken(token: TokenData) {
  const cookieStore = await cookies()
  cookieStore.set("gdrive_token", encodeURIComponent(JSON.stringify(token)), {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
  })
}

export async function clearToken() {
  const cookieStore = await cookies()
  cookieStore.delete("gdrive_token")
}
