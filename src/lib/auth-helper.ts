import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export async function getSession() {
  // Try web auth first (reads authjs.session-token cookie)
  const session = await auth()
  if (session?.user?.id) return session

  // Try mobile auth (reads x-mobile-user header set by middleware)
  try {
    const headersList = await headers()
    const mobileUser = headersList.get("x-mobile-user")
    if (mobileUser) {
      const user = JSON.parse(mobileUser)
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          profileId: user.profileId,
          profileName: user.profileName,
        },
      }
    }
  } catch { /* mobile header not present */ }

  return null
}
