import { NextResponse } from "next/server"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import type { ParserKeywords } from "@/lib/gmail-parser"

export async function POST() {
  try {
    const { profileId, userId, role } = await getAuthContext()
    // userId auto-checked by getAuthContext

    const { getAccessToken, listMessages, getMessage, parseMessage } = await import("@/lib/gmail")
    const { parseEmail, DEFAULT_KEYWORDS } = await import("@/lib/gmail-parser")
    const { prisma } = await import("@/lib/prisma")
    const accessToken = await getAccessToken(userId)

    // Load custom keywords if configured
    const setting = await prisma.userSetting.findUnique({
      where: { userId_key: { userId: userId, key: "gmail_parser_keywords" } },
      select: { value: true },
    })
    const kw = (setting?.value || DEFAULT_KEYWORDS) as ParserKeywords

    const queries = [
      `(${kw.upi?.join(" OR ") || "UPI OR payment OR paid"}) after:2024-01-01`,
      `(${kw.bank?.join(" OR ") || "credited OR debited OR transaction OR salary OR deposit"}) after:2024-01-01`,
      `(${kw.insurance?.join(" OR ") || "insurance OR premium OR policy"}) after:2024-01-01`,
      `(${kw.subscription?.join(" OR ") || "subscription OR renewal OR billed"}) after:2024-01-01`,
      `(${kw.tax?.join(" OR ") || "form 16 OR ITR OR income tax OR 26AS"}) after:2024-01-01`,
      `(${kw.trade?.join(" OR ") || "zerodha OR groww"}) (trade OR buy OR sell) after:2024-01-01`,
      `(${kw.mutualFund?.join(" OR ") || "cams OR kfintech"}) after:2024-01-01`,
      `(${kw.purchase?.join(" OR ") || "order OR purchase OR invoice OR receipt"}) after:2024-01-01`,
      `(${kw.gold?.join(" OR ") || "gold OR tanishq OR mmtc"}) after:2024-01-01`,
      `(${kw.silver?.join(" OR ") || "silver"}) after:2024-01-01`,
    ]

    const allMessages = new Map<string, unknown>()
    for (const query of queries) {
      const msgs = await listMessages(accessToken, query, 10)
      for (const m of msgs) {
        if (!allMessages.has(m.id)) allMessages.set(m.id, m)
      }
    }

    const transactions: Record<string, unknown>[] = []
    const errors: string[] = []

    for (const [id] of allMessages) {
      try {
        const raw = await getMessage(accessToken, id)
        const parsed = parseMessage(raw)
        const result = parseEmail(parsed, kw)
        if (result) {
          transactions.push({ ...result, messageId: id })
        }
      } catch {
        errors.push(`Failed to parse message ${id}`)
      }
    }

    return NextResponse.json({
      sessionId: Date.now(),
      totalEmails: allMessages.size,
      parsed: transactions.length,
      errors: errors.length,
      transactions,
      errorDetails: errors.slice(0, 5),
    })
  } catch (error) {
    console.error("Gmail scan error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
