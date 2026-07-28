import { PrismaClient } from "@prisma/client"
import { getDbMode, getTestDatabaseUrl } from "./db-config"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaMode: "production" | "test" | undefined
}

function createClient(url: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  })
}

function getClient(): PrismaClient {
  const mode = getDbMode()
  if (globalForPrisma.prisma && globalForPrisma.prismaMode === mode) {
    return globalForPrisma.prisma
  }

  if (globalForPrisma.prisma) {
    globalForPrisma.prisma.$disconnect().catch(() => {})
  }

  const url = mode === "test" ? getTestDatabaseUrl() : process.env.DATABASE_URL
  globalForPrisma.prisma = createClient(url || "")
  globalForPrisma.prismaMode = mode
  return globalForPrisma.prisma
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    if (prop === "then") return
    return (getClient() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

export function getPrismaClient(): PrismaClient {
  return getClient()
}
