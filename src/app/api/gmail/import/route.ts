import { NextResponse } from "next/server"
import { getAuthContext } from "@/lib/with-auth"
import type { PrismaClient } from "@prisma/client"
import { loadExistingData, alreadyInAppData } from "@/lib/gmail-scan"

interface ImportTransaction {
  type: string
  date: string
  amount: number
  description: string
  vendor?: string
  category?: string
  messageId: string
  emailSubject?: string
  emailSnippet?: string
  emailFrom?: string
  source?: "upi" | "bank" | "purchase" | "salary" | "insurance" | "subscription" | "investment" | "asset" | "tax"
  metadata?: Record<string, unknown>
}

export async function POST(req: Request) {
  try {
    const { profileId, userId } = await getAuthContext()
    // userId auto-checked by getAuthContext

    const { prisma } = await import("@/lib/prisma")
    // profileId from getAuthContext
    const body = await req.json()
    const { transactions, scanId } = body as { transactions: ImportTransaction[]; scanId?: number }

    let imported = 0
    let skippedExisting = 0
    let skippedAlreadyImported = 0
    const results: Record<string, unknown>[] = []

    // Load existing app data once so we skip anything already in the app
    const existing = await loadExistingData(prisma, profileId)

    // Guard against re-importing the same email (e.g. when a scan was still
    // running while an earlier batch was already imported).
    const existingLogs = await prisma.gmailImportLog.findMany({
      where: { userId, messageId: { in: transactions.map((t) => t.messageId) } },
      select: { messageId: true },
    })
    const alreadyImported = new Set(existingLogs.map((l) => l.messageId))

    const importedByType: Record<string, number> = {}
    const skippedExistingByType: Record<string, number> = {}

    for (const t of transactions) {
      if (alreadyImported.has(t.messageId)) {
        skippedAlreadyImported++
        continue
      }
      // Skip if an equivalent record already exists in the app (same day +
      // amount + vendor), e.g. a transaction that arrived via bank-statement
      // upload too, or a repeat monthly premium.
      if (alreadyInAppData(existing, t)) {
        skippedExisting++
        skippedExistingByType[t.type] = (skippedExistingByType[t.type] || 0) + 1
        // Still record the email as handled so future scans ignore it.
        await prisma.gmailImportLog.upsert({
          where: { userId_messageId: { userId, messageId: t.messageId } },
          update: {},
          create: { userId, messageId: t.messageId },
        }).catch(() => {})
        continue
      }
      try {
        let createdId: number | null = null
        switch (t.type) {
          case "expense": {
            const catMap = await getCategoryId(prisma, t.category || "Other")
            if (!catMap) break // skip if no category found
            const created = await prisma.expense.create({
              data: {
                profileId: profileId || undefined,
                date: new Date(t.date),
                amount: t.amount,
                vendor: t.vendor || null,
                description: t.description,
                categoryId: catMap.id,
                paymentMode: t.source === "bank" ? "Bank Transfer" : "UPI",
                notes: `[Gmail Import] ${t.messageId}`,
              },
            })
            createdId = created.id
            imported++
            break
          }
          case "income":
          case "salary": {
            const existingSource = await prisma.incomeSource.findFirst({
              where: { profileId, name: { contains: t.vendor || t.description, mode: "insensitive" } },
            })
            if (!existingSource) {
              const incomeCategory = await getOrCreateCategory(prisma, t.category || "Salary", "income")
              const created = await prisma.incomeSource.create({
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
              createdId = created.id
              imported++
            }
            break
          }
          case "investment": {
            const created = await prisma.investment.create({
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
            createdId = created.id
            imported++
            break
          }
          case "insurance": {
            const existingPolicy = await prisma.insurance.findFirst({
              where: { profileId, provider: { contains: t.vendor, mode: "insensitive" } },
            })
            if (!existingPolicy) {
              const created = await prisma.insurance.create({
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
              createdId = created.id
              imported++
            }
            break
          }
          case "subscription": {
            const created = await prisma.subscription.create({
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
            createdId = created.id
            imported++
            break
          }
          case "asset": {
            const created = await prisma.asset.create({
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
            createdId = created.id
            imported++
            break
          }
          case "tax_document": {
            const created = await prisma.taxDocument.create({
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
            createdId = created.id
            imported++
            break
          }
        }
        if (createdId) {
          results.push({
            id: createdId,
            type: t.type,
            amount: t.amount,
            date: t.date,
            description: t.description,
            vendor: t.vendor,
            category: t.category,
            emailSubject: t.emailSubject,
            emailSnippet: t.emailSnippet,
          })
          importedByType[t.type] = (importedByType[t.type] || 0) + 1
          await prisma.gmailImportLog.upsert({
            where: { userId_messageId: { userId, messageId: t.messageId } },
            update: {},
            create: { userId, messageId: t.messageId },
          })
        }
      } catch {
        // skip individual failures
      }
    }

    // Update the scan's journal so the UI can show "last scan imported X in
    // category Y, skipped Z (already existed)".
    if (scanId) {
      try {
        const scan = await prisma.gmailScan.findUnique({
          where: { id: scanId },
          select: { journal: true },
        })
        const journal = (scan?.journal || {}) as Record<string, { matched: number; alreadyExists: number; imported: number }>
        for (const [type, count] of Object.entries(importedByType)) {
          if (!journal[type]) journal[type] = { matched: 0, alreadyExists: 0, imported: 0 }
          journal[type].imported += count
        }
        for (const [type, count] of Object.entries(skippedExistingByType)) {
          if (!journal[type]) journal[type] = { matched: 0, alreadyExists: 0, imported: 0 }
          journal[type].alreadyExists += count
        }
        await prisma.gmailScan.update({ where: { id: scanId }, data: { journal: journal as object } })
      } catch {
        // journal update is best-effort
      }
    }

    return NextResponse.json({
      imported,
      skippedExisting,
      skippedAlreadyImported,
      total: transactions.length,
      results,
    })
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
