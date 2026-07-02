import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Resend from "next-auth/providers/resend"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import type { Adapter } from "next-auth/adapters"

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  session: { strategy: "database" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: true,
    }),
    ...(process.env.AUTH_RESEND_KEY
      ? [
          Resend({
            apiKey: process.env.AUTH_RESEND_KEY,
            from: "noreply@mymoney.app",
          }),
        ]
      : []),
  ],
  callbacks: {
    async session({ session, user }) {
      // Attach user ID and profile info to the session
      const sUser = session.user as unknown as {
        id: number
        profileId?: number
        profileName?: string
      }
      if (sUser) {
        sUser.id = Number(user.id)

        // Fetch the user's default profile
        try {
          const profile = await prisma.profile.findFirst({
            where: { userId: Number(user.id), isDefault: true },
            select: { id: true, name: true },
          })
          if (profile) {
            sUser.profileId = profile.id
            sUser.profileName = profile.name
          }
        } catch {
          // Profile may not exist yet during onboarding
        }
      }
      return session
    },
  },
})
