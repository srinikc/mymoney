import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getStoredToken } from "@/lib/token-store"
import { driveDownloadRaw, refreshAccessToken } from "@/lib/oauth"
import { storeToken } from "@/lib/token-store"
import { parseGpayTakeoutHtml } from "@/shared/gpay-parser"

export async function POST(req: Request) {
  try {
    const token = await getStoredToken()
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { fileId } = await req.json()
    if (!fileId) return NextResponse.json({ error: "fileId required" }, { status: 400 })

    let downloadRes = await driveDownloadRaw(fileId, token.accessToken)
    if (downloadRes.status === 401 && token.refreshToken) {
      try {
        const refreshed = await refreshAccessToken(token.refreshToken)
        token.accessToken = refreshed.access_token
        await storeToken({ ...token, accessToken: refreshed.access_token })
        downloadRes = await driveDownloadRaw(fileId, token.accessToken)
      } catch {
        return NextResponse.json({ error: "Session expired", needsReauth: true }, { status: 401 })
      }
    }

    if (!downloadRes.ok || !downloadRes.buffer) {
      return NextResponse.json({ error: "Download failed", errorDetail: `HTTP ${downloadRes.status}: ${downloadRes.body}` }, { status: 500 })
    }

    const buffer = Buffer.from(downloadRes.buffer)
    let transactions: { date: Date; amount: number; vendor: string; bankAccount?: string }[] = []

    // Try as ZIP
    try {
      const AdmZip = (await import("adm-zip")).default
      const zip = new AdmZip(buffer)
      const allEntries = zip.getEntries() as Array<{ entryName: string; getData: () => Buffer }>
      const htmlEntry = allEntries.find((e) =>
        e.entryName.replaceAll('\\', "/").toLowerCase().includes("my activity")
      )
      if (htmlEntry) {
        const content = htmlEntry.getData().toString("utf-8")
        const htmlTxns = parseGpayTakeoutHtml(content)
        const maxDate = await prisma.expense.aggregate({ _max: { date: true } }).then((r) => r._max.date)
        transactions = maxDate ? htmlTxns.filter((t) => t.date >= maxDate).map((t) => ({ ...t })) : htmlTxns.map((t) => ({ ...t }));
      }
    } catch { /* not a ZIP */ }

    // Try as standalone HTML (not zipped)
    if (transactions.length === 0) {
      try {
        const text = buffer.toString("utf-8")
        const htmlTxns = parseGpayTakeoutHtml(text)
        const maxDate = await prisma.expense.aggregate({ _max: { date: true } }).then((r) => r._max.date)
        transactions = maxDate ? htmlTxns.filter((t) => t.date >= maxDate).map((t) => ({ ...t })) : htmlTxns.map((t) => ({ ...t }));
      } catch { /* not HTML */ }
    }

    if (transactions.length === 0) {
      return NextResponse.json({ error: "No valid GPay transactions found in file." }, { status: 400 })
    }

    // Run stats
    const vendorSet = new Set<string>()
    let willImport = 0
    let willSkip = 0
    let blankVendor = 0

    for (const txn of transactions) {
      if (!txn.vendor) { blankVendor++; willImport++; continue }
      vendorSet.add(txn.vendor.toLowerCase().trim())
      const existing = await prisma.expense.findFirst({
        where: { date: txn.date, amount: txn.amount, vendor: txn.vendor },
      })
      if (existing) willSkip++
      else willImport++
    }

    const sample = transactions.slice(0, 5).map((t) => ({
      date: t.date.toISOString().split("T")[0],
      amount: t.amount,
      vendor: t.vendor || "",
    }))

    return NextResponse.json({
      preview: true,
      total: transactions.length,
      willImport,
      willSkip,
      blankVendor,
      totalVendors: vendorSet.size,
      sample,
    })
  } catch (error) {
    console.error("Drive preview error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
