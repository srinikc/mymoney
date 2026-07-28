import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import type { PrismaClient } from "@prisma/client"

interface ImportTransaction {
  type: string
  date: string
  amount: number
  description: string
  vendor?: string
  category?: string
  messageId: string
  metadata?: Record<string, unknown>
}

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { prisma } = await import("@/lib/prisma")
    const profileId = (session.user as unknown as { profileId?: number }).profileId
    const body = await req.json()
    const { transactions } = body as { transactions: ImportTransaction[] }

    let imported = 0

    for (const t of transactions) {
      try {
        switch (t.type) {
          case "expense": {
            const catMap = await getCategoryId(prisma, t.category || "Other")
            if (!catMap) break // skip if no category found
            await prisma.expense.create({
              data: {
                profileId: profileId || undefined,
                date: new Date(t.date),
                amount: t.amount,
                vendor: t.vendor || null,
                description: t.description,
                categoryId: catMap.id,
                paymentMode: "UPI",
                notes: `[Gmail Import] ${t.messageId}`,
              },
            })
            imported++
            break
          }
          case "income":
          case "salary": {
            const existingSource = await prisma.incomeSource.findFirst({
              where: { profileId, name: { contains: t.vendor || t.description } },
            })
            if (!existingSource) {
              const incomeCategory = await getOrCreateCategory(prisma, t.category || "Salary", "income")
              await prisma.incomeSource.create({
                data: {
                  profileId: profileId || undefined,
                  name: t.vendor || t.description,
                  type: "monthly",
                  amount: t.amount,
                  categoryId: incomeCategory.id,
                  paymentMode: "Bank Transfer",
                  startDate: new Date(t.date),
                  notes: `[Gmail Import] ${t.messageId}`,
                },
              })
              imported++
            }
            break
          }
          case "investment": {
            await prisma.investment.create({
              data: {
                profileId: profileId || undefined,
                name: t.vendor || t.description,
                type: "stocks",
                amount: t.amount,
                purchaseDate: new Date(t.date),
                currentValue: t.amount,
                notes: `[Gmail Import] ${t.messageId}`,
              },
            })
            imported++
            break
          }
          case "insurance": {
            const existingPolicy = await prisma.insurance.findFirst({
              where: { profileId, provider: { contains: t.vendor } },
            })
            if (!existingPolicy) {
              await prisma.insurance.create({
                data: {
                  profileId: profileId || undefined,
                  name: t.description,
                  type: "health",
                  provider: t.vendor || null,
                  premium: t.amount,
                  premiumFrequency: "yearly",
                  startDate: new Date(t.date),
                  notes: `[Gmail Import] ${t.messageId}`,
                },
              })
              imported++
            }
            break
          }
          case "subscription": {
            await prisma.subscription.create({
              data: {
                profileId: profileId || undefined,
                name: t.vendor || t.description,
                provider: t.vendor || t.description,
                amount: t.amount,
                billingCycle: "monthly",
                nextDueDate: new Date(t.date),
                status: "active",
                category: "entertainment",
                notes: `[Gmail Import] ${t.messageId}`,
              },
            })
            imported++
            break
          }
          case "asset": {
            await prisma.asset.create({
              data: {
                profileId: profileId || undefined,
                name: t.description,
                type: t.category === "Gold" ? "gold" : "silver",
                currentValue: t.amount,
                purchasePrice: t.amount,
                purchaseDate: new Date(t.date),
                notes: `[Gmail Import] ${t.messageId}`,
              },
            })
            imported++
            break
          }
          case "tax_document": {
            await prisma.taxDocument.create({
              data: {
                profileId: profileId || undefined,
                type: "other",
                fy: `${new Date(t.date).getFullYear()}-${(new Date(t.date).getFullYear() + 1).toString().slice(-2)}`,
                label: t.description,
                fileName: `gmail-${t.messageId}`,
                filePath: "",
                mimeType: "message/rfc822",
                fileSize: 0,
                notes: `Source: ${t.vendor}`,
              },
            })
            imported++
            break
          }
        }
      } catch {
        // skip individual failures
      }
    }

    return NextResponse.json({ imported, total: transactions.length })
  } catch (error) {
    console.error("Gmail import error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

async function getCategoryId(prisma: PrismaClient, name: string) {
  const existing = await prisma.category.findFirst({ where: { name, type: "expense" } })
  if (existing) return existing
  return prisma.category.findFirst({ where: { name: "Other", type: "expense" } }) || { id: 13 }
}

async function getOrCreateCategory(prisma: PrismaClient, name: string, type: string) {
  const existing = await prisma.category.findFirst({ where: { name, type } })
  if (existing) return existing
  return prisma.category.create({ data: { name, type, icon: type === "income" ? "wallet" : "circle", color: "#6366f1" } })
}
