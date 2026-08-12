import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { parseStatementCsv, parseStatementXlsx, parseStatementPdf, type BankName } from "@/shared/bank-statement"
import { buildEnrichSuggestions, type BankEnrichExpense, type EnrichSuggestion } from "@/shared/bank-enrich"

const ALLOWED_BANKS = new Set<BankName>(["yesbank", "axis", "hdfc", "icici", "sbi", "generic"])

// Upload a bank statement CSV/PDF/XLSX → returns a preview of description
// enrichments suggested for existing GPay-imported expenses (profile-scoped).
export async function POST(req: Request) {
  let profileId: number
  try {
    const ctx = await getAuthContext()
    profileId = ctx.profileId
  } catch (e) {
    return handleAuthError(e)
  }

  try {
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const bankHintRaw = String(formData.get("bank") || "").trim()
    const bankHint: BankName | undefined = ALLOWED_BANKS.has(bankHintRaw as BankName)
      ? (bankHintRaw as BankName)
      : undefined

    const buffer = Buffer.from(await file.arrayBuffer())
    const ext = file.name.toLowerCase().split(".").pop() || ""

    let statement
    switch (ext) {
      case "csv":
        statement = parseStatementCsv(buffer.toString("utf-8"), bankHint)
        break
      case "xlsx":
      case "xls":
        statement = await parseStatementXlsx(buffer, bankHint, file.name)
        break
      case "pdf":
        statement = await parseStatementPdf(buffer, bankHint)
        break
      default:
        return NextResponse.json({ error: "Only .csv, .xlsx/.xls, and .pdf statements are supported" }, { status: 400 })
    }

    if (!statement || statement.rows.length === 0) {
      return NextResponse.json({
        error: statement?.notes || "No transactions found in the statement.",
        detectedBank: statement?.bank ?? "unknown",
      }, { status: 400 })
    }

    const debitCount = statement.rows.filter((r) => r.type === "debit").length
    const dateFrom = statement.rows[0]?.date
    const dateTo = statement.rows.at(-1)?.date ?? statement.rows[0]?.date

    // Fetch candidate expenses for this profile: GPay-imported rows.
    const sessions = await prisma.importSession.findMany({
      where: { source: { startsWith: "gpay" } },
      select: { id: true },
    })
    const sessionIds = sessions.map((s) => s.id)

    const candidates = await prisma.expense.findMany({
      where: {
        profileId,
        deletedAt: null,
        OR: [
          { importSessionId: { in: sessionIds } },
          { paymentMode: "UPI", bankAccount: { not: null } },
        ],
      },
      select: { id: true, date: true, amount: true, vendor: true, description: true, bankAccount: true },
      orderBy: { date: "desc" },
      take: 2000,
    })

    const enrichExpenses: BankEnrichExpense[] = candidates.map((c) => ({
      id: c.id,
      date: new Date(c.date),
      amount: c.amount,
      vendor: c.vendor,
      description: c.description,
      bankAccount: c.bankAccount,
    }))

    const suggestions = buildEnrichSuggestions(enrichExpenses, statement.bank, statement.rows)

    const actionable = suggestions.filter((s: EnrichSuggestion) =>
      s.reason === "context_appended" || s.reason === "merchant_only" || s.reason === "self_transfer"
    )

    const sample = actionable.slice(0, 10).map((s) => ({
      expenseId: s.expenseId,
      reason: s.reason,
      merchant: s.merchant,
      context: s.context,
      bankAccount: candidates.find((c) => c.id === s.expenseId)?.bankAccount ?? null,
      currentDescription: s.currentDescription,
      proposedDescription: s.proposedDescription,
      bankDate: s.bankDate,
      bankNarration: s.bankNarration.slice(0, 120),
    }))

    // Full set of enrichments (not just the preview sample) so the UI can apply
    // every matched expense in one go.
    const updates = actionable
      .map((s) => ({
        expenseId: s.expenseId,
        description: s.proposedDescription,
      }))
      .filter((u): u is { expenseId: number; description: string } => Boolean(u.description))

    return NextResponse.json({
      success: true,
      format: statement.bank,
      bank: statement.bank,
      totalRows: statement.rows.length,
      debitCount,
      dateRange: { from: dateFrom, to: dateTo },
      candidateCount: candidates.length,
      matchedCount: actionable.length,
      alreadyCount: suggestions.filter((s) => s.reason === "no").length,
      unmatched: suggestions.filter((s) => s.reason === "none").length,
      notes: statement.notes || null,
      sample,
      updates,
    })
  } catch (error) {
    console.error("Bank analysis preview error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}