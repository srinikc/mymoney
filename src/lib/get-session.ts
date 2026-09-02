import { prisma } from "@/lib/prisma"

/**
 * Get the authenticated user by reading the authjs.session-token cookie
 * from next/headers. Works in all Node.js API routes without needing to
 * pass the request object manually.
 *
 * Falls back to reading from a cookie header string for Edge middleware
 * compatibility (where next/headers is not available).
 */
export async function getSessionFromCookie(cookieHeader?: string | null) {
  let sessionCookie: string | undefined

  if (cookieHeader) {
    // Parse cookies from header string
    sessionCookie = cookieHeader
      .split(";").map((c) => c.trim())
      .find((c) => c.startsWith("__Secure-authjs.session-token=") || c.startsWith("authjs.session-token="))
      ?.split("=")[1]
  }

  if (!sessionCookie) return null

  try {
    const session = await prisma.session.findUnique({
      where: { sessionToken: sessionCookie },
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true },
        },
      },
    })

    if (!session || session.expires < new Date()) return null

    // Get the user's default profile
    const profile = await prisma.profile.findFirst({
      where: { userId: session.user.id, isDefault: true },
      select: { id: true, name: true },
    })

    return {
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        profileId: profile?.id,
        profileName: profile?.name,
      },
    }
  } catch {
    return null
  }
}
