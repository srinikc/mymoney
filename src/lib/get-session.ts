import { prisma } from "@/lib/prisma"

/**
 * Get the authenticated user from the request headers by reading the
 * authjs.session-token cookie directly. This works in both Edge middleware
 * and Node.js API routes, unlike next-auth's auth() which has issues with
 * PrismaAdapter in Edge runtime and request context in API routes.
 */
export async function getSessionFromCookie(cookieHeader: string | null) {
  if (!cookieHeader) return null

  // Parse cookies to find authjs.session-token
  const cookies = cookieHeader.split(";").map((c) => c.trim())
  const sessionCookie = cookies
    .find((c) => c.startsWith("authjs.session-token="))
    ?.split("=")[1]

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
