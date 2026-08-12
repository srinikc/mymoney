import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { driveDownloadRaw, refreshAccessToken } from "@/lib/oauth"
import { parseGpayTakeoutHtml } from "@/shared/gpay-parser"

export async function POST(req: Request) {
  let profileId: number
  let userId: number
  try {
    const ctx = await getAuthContext()
    profileId = ctx.profileId
    userId = ctx.userId
  } catch (e) {
    return handleAuthError(e)
  }

  try {
    const account = await prisma.account.findFirst({
      where: { userId, provider: "google" },
      select: { id: true, access_token: true, refresh_token: true, expires_at: true },
    })
    if (!account?.access_token) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const { getAccessToken } = await import("@/lib/gmail")
    let accessToken = await getAccessToken(userId)
    const refreshToken = account.refresh_token || ""
    const { fileId } = await req.json()
    if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 })

    let downloadRes = await driveDownloadRaw(fileId, accessToken)
    if (downloadRes.status === 401 && refreshToken) {
      try {
        const refreshed = await refreshAccessToken(refreshToken)
        accessToken = refreshed.access_token
        await prisma.account.update({
          where: { id: account.id },
          data: { access_token: refreshed.access_token },
        })
        downloadRes = await driveDownloadRaw(fileId, accessToken)
      } catch {
        return NextResponse.json({ error: "Session expired", needsReauth: true }, { status: 401 })
      }
    }
    if (!downloadRes.ok || !downloadRes.buffer) {
      return NextResponse.json({ error: "Download failed", errorDetail: `HTTP ${downloadRes.status}: ${downloadRes.body}` }, { status: 500 })
    }

    const buffer = Buffer.from(downloadRes.buffer)
    let transactions: { date: Date; amount: number; vendor: string; bankAccount?: string }[] = []
    try {
      const AdmZip = (await import("adm-zip")).default
      const zip = new AdmZip(buffer)
      const allEntries = zip.getEntries() as Array<{ entryName: string; getData: () => Buffer }>
      const htmlEntry = allEntries.find((e) => e.entryName.replaceAll('\\', "/").toLowerCase().includes("my activity"))
      if (htmlEntry) {
        const content = htmlEntry.getData().toString("utf-8")
        const htmlTxns = parseGpayTakeoutHtml(content)
        const maxDate = await prisma.expense.aggregate({ where: { profileId }, _max: { date: true } }).then((r) => r._max.date)
        transactions = maxDate ? htmlTxns.filter((t) => t.date >= maxDate).map((t) => ({ ...t })) : htmlTxns.map((t) => ({ ...t }))
      }
    } catch { /* not a ZIP */ }

    if (transactions.length === 0) {
      try {
        const text = buffer.toString("utf-8")
        const htmlTxns = parseGpayTakeoutHtml(text)
        const maxDate = await prisma.expense.aggregate({ where: { profileId }, _max: { date: true } }).then((r) => r._max.date)
        transactions = maxDate ? htmlTxns.filter((t) => t.date >= maxDate).map((t) => ({ ...t })) : htmlTxns.map((t) => ({ ...t }))
      } catch { /* not HTML */ }
    }
    if (transactions.length === 0) return NextResponse.json({ error: "No valid GPay transactions found in file." }, { status: 400 })

    const vendorSet = new Set<string>()
    let willImport = 0, willSkip = 0, blankVendor = 0
    for (const txn of transactions) {
      if (!txn.vendor) { blankVendor++; willImport++; continue }
      vendorSet.add(txn.vendor.toLowerCase().trim())
      const existing = await prisma.expense.findFirst({ where: { date: txn.date, amount: txn.amount, vendor: txn.vendor, profileId } })
      if (existing) willSkip++; else willImport++
    }
    const sample = transactions.slice(0, 5).map((t) => ({ date: t.date.toISOString().split("T")[0], amount: t.amount, vendor: t.vendor || "" }))
    return NextResponse.json({ preview: true, total: transactions.length, willImport, willSkip, blankVendor, totalVendors: vendorSet.size, sample })
  } catch (error) {
    console.error("Drive preview error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
