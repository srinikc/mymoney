import { NextResponse } from "next/server"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { prisma } from "@/lib/prisma"

export async function POST() {
    const { profileId, userId } = await getAuthContext()

    const { getAccessToken, listMessages, getMessage, parseMessage } = await import("@/lib/gmail")
    const { parseEmail } = await import("@/lib/gmail-parser")

    const accessToken = await getAccessToken(Number(userId))

    // Fetch recent bank alert emails
    const queries = [
      "(available balance OR avl bal OR closing balance) after:2026-06-01",
      "(debited OR credited) (balance) after:2026-06-01",
      "subject:(debited OR credited) (balance) after:2026-06-01",
    ]

    const allMessages = new Map<string, unknown>()
    for (const query of queries) {
      const msgs = await listMessages(accessToken, query, 15)
      for (const m of msgs) {
        if (!allMessages.has(m.id)) allMessages.set(m.id, m)
      }
    }

    // Parse and extract balances
    const balanceUpdates: { accountNumber: string; balance: number; emailDate: Date }[] = []

    for (const [id] of allMessages) {
      try {
        const raw = await getMessage(accessToken, id)
        const parsed = parseMessage(raw)
        const result = parseEmail(parsed)
        if (result?.balance && result?.accountNumber) {
          balanceUpdates.push({
            accountNumber: result.accountNumber,
            balance: result.balance,
            emailDate: result.date,
          })
        }
      } catch { /* skip */ }
    }

    // Match extracted balances to saved bank accounts
    const accounts = await prisma.bankAccount.findMany({
      where: profileId ? { profileId } : {},
    })

    let updated = 0
    let skipped = 0

    for (const update of balanceUpdates) {
      // Match by last 4 digits of account number
      const suffix = update.accountNumber.replaceAll(/\D/g, "").slice(-4)
      const match = accounts.find((a) => a.accountNumber?.endsWith(suffix))
      if (match) {
        await prisma.bankAccount.update({
          where: { id: match.id },
          data: { balance: update.balance, lastSynced: update.emailDate },
        })
        updated++
      } else {
        skipped++
      }
    }

    return NextResponse.json({
      updated,
      skipped,
      totalEmails: allMessages.size,
      matchesFound: balanceUpdates.length,
      message: `Updated ${updated} account(s), ${skipped} unmatched (add those accounts in Settings first)`,
    })
}
