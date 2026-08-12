import { PrismaClient } from "@prisma/client"
const prisma = new PrismaClient()
try {
  const accounts = await prisma.account.findMany({ where: { provider: "google" } })
  console.log(JSON.stringify(accounts.map(a => ({
    id: a.id, userId: a.userId, providerAccountId: a.providerAccountId,
    hasAccessToken: !!a.access_token, hasRefreshToken: !!a.refresh_token,
    expiresAt: a.expires_at
  })), null, 2))
} finally {
  await prisma.$disconnect()
}
