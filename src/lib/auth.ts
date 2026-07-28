import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Resend from "next-auth/providers/resend"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import type { Adapter } from "next-auth/adapters"
import bcrypt from "bcryptjs"
import { logAudit } from "@/shared/middleware/audit"
export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours — session expires after this from login
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID || process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET || process.env.GOOGLE_CLIENT_SECRET || "",
      allowDangerousEmailAccountLinking: false,
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
          // Log failed login attempt (user not found or no password set)
          try {
            const foundUser = user // user exists but no hashedPassword
            if (foundUser) {
              const profile = await prisma.profile.findFirst({ where: { userId: foundUser.id, isDefault: true }, select: { id: true } })
              if (profile) await logAudit(profile.id, "login_failed", "user", foundUser.id, `Failed login attempt for ${email} (no password set)`)
            }
          } catch { /* ignore */ }
          return null
        }

        const isValid = await bcrypt.compare(password, user.hashedPassword)
        if (!isValid) {
          // Log failed login attempt (wrong password)
          try {
            const profile = await prisma.profile.findFirst({ where: { userId: user.id, isDefault: true }, select: { id: true } })
            if (profile) await logAudit(profile.id, "login_failed", "user", user.id, `Failed login attempt for ${email} (wrong password)`)
          } catch { /* ignore */ }
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
  events: {
    async signIn({ user }) {
      try {
        const profile = await prisma.profile.findFirst({
          where: { userId: Number(user.id), isDefault: true },
          select: { id: true },
        })
        if (profile) {
          await logAudit(profile.id, "login", "user", Number(user.id), `User ${user.email} logged in`)
        }
      } catch { /* ignore */ }
    },
    async signOut(message: { session?: unknown; token?: unknown }) {
      const t = message.token as { id?: number; profileId?: number } | undefined
      const profileId = t?.profileId
      if (profileId) {
        try {
          await logAudit(profileId, "logout", "user", t?.id, "User logged out")
        } catch { /* ignore */ }
      }
    },
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Idle timeout: if token has a lastActivity and trigger is not "signIn", check idle
      if (token.lastActivity && trigger !== "signIn") {
        const idleMs = Date.now() - (token.lastActivity as number)
        const idleMinutes = Math.floor(idleMs / 60_000)
        // Auto-logout after 2 hours of inactivity
        if (idleMinutes >= 120) {
          return {}
        }
      }

      // Update last activity timestamp
      token.lastActivity = Date.now()

      if (user) {
        token.id = Number(user.id)
        token.role = (user as unknown as Record<string, unknown>).role as string || "user"
        try {
          const profile = await prisma.profile.findFirst({
            where: { userId: Number(user.id), isDefault: true },
            select: { id: true, name: true },
          })
          if (profile) {
            token.profileId = profile.id
            token.profileName = profile.name
          }
        } catch (e) {
          console.error("Profile lookup during JWT callback failed:", e)
        }
      }
      return token
    },
    async session({ session, token }) {
      if (!token.id) {
        // Token expired or invalid — return empty session (forces re-login on client)
        return { ...session, user: { ...session.user, id: undefined as unknown as number } }
      }
      const sUser = session.user as unknown as {
        id: number
        role?: string
        profileId?: number
        profileName?: string
      }
      if (sUser) {
        sUser.id = token.id as number
        sUser.role = token.role as string || "user"
        sUser.profileId = token.profileId as number | undefined
        sUser.profileName = token.profileName as string | undefined
      }
      return session
    },
  },
})

// Re-export so all API routes can use it instead of the broken NextAuth auth()
export { getSessionFromCookie } from "@/lib/get-session"
