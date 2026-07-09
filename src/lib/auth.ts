import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Resend from "next-auth/providers/resend"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import type { Adapter } from "next-auth/adapters"
import bcrypt from "bcryptjs"
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
    Credentials({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = String(credentials.email)
        const password = String(credentials.password)

        const user = await prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            hashedPassword: true,
          },
        })

        if (!user || !user.hashedPassword) {
          return null
        }

        const isValid = await bcrypt.compare(password, user.hashedPassword)
        if (!isValid) {
          return null
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          image: user.image,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      // Attach user ID and profile info to the session
      const sUser = session.user as unknown as {
        id: number
        role?: string
        profileId?: number
        profileName?: string
      }
      if (sUser) {
        sUser.id = Number(user.id)
        ;(sUser as Record<string, unknown>).role = (user as unknown as Record<string, unknown>).role as string || "user"

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

// Re-export so all API routes can use it instead of the broken NextAuth auth()
export { getSessionFromCookie } from "@/lib/get-session"
