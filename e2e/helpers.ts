import { PrismaClient } from "@prisma/client"
import type { Page } from "@playwright/test"

let prisma: PrismaClient | null = null

function getPrisma(): PrismaClient {
  if (!prisma) prisma = new PrismaClient()
  return prisma
}

/**
 * Seeds an expense with the given vendor directly in the database for the user
 * currently logged into `page` (from its session cookie).
 *
 * Deliberately bypasses POST /api/expenses: that route auto-learns a
 * VendorMapping for any expense with a vendor, which would make the vendor
 * "mapped" and invisible to the Unmapped review list. A row created here has
 * no mapping, so it appears exactly once in Unmapped — which is what the
 * vendor dismiss specs assert against.
 */
export async function seedUnmappedExpense(page: Page, vendor: string, amount = 100): Promise<number> {
  const session = await (await page.request.get("/api/auth/session")).json()
  const userId = session?.user?.id
  const profileId = session?.user?.profileId
  if (!userId || !profileId) {
    throw new Error(`Cannot seed unmapped expense: no active session (userId=${userId}, profileId=${profileId})`)
  }
  const category = await getPrisma().category.findFirst({ select: { id: true } })
  if (!category) throw new Error("Cannot seed unmapped expense: no category exists")
  const expense = await getPrisma().expense.create({
    data: {
      date: new Date("2026-08-17"),
      amount,
      vendor,
      description: "e2e unmapped vendor seed",
      paymentMode: "UPI",
      categoryId: category.id,
      profileId,
    },
  })
  return expense.id
}

export async function deleteExpense(id: number): Promise<void> {
  if (!id) return
  await getPrisma().expense.delete({ where: { id } }).catch(() => {})
}