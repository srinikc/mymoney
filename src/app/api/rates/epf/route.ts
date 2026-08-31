import { NextResponse } from "next/server"
import { withAuth } from "@/lib/with-auth"

// Curated EPF interest rate history (per FY). Rates are announced by EPFO.
const EPF_RATES_BY_FY: Record<string, number> = {
  "2018-19": 8.65,
  "2019-20": 8.5,
  "2020-21": 8.5,
  "2021-22": 8.1,
  "2022-23": 8.15,
  "2023-24": 8.25,
  "2024-25": 8.25,
  "2025-26": 8.25,
}

export async function GET() {
  const auth = await withAuth()
  if (auth.error) return auth.error

  const currentFy = fyFromDate(new Date())
  const latest = EPF_RATES_BY_FY[currentFy] ?? EPF_RATES_BY_FY["2025-26"] ?? 8.25

  // Try to refresh the latest rate from the web; fall back to the curated value.
  let fetched: number | null = null
  try {
    const res = await fetch("https://cleartax.in/s/epf-interest-rate", {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0" },
    })
    const html = await res.text()
    const match = html.match(/(\d{1,2}\.\d{2})\s*%/i)
    const parsed = match ? Number.parseFloat(match[1]) : NaN
    if (!Number.isNaN(parsed) && parsed > 0 && parsed < 20) {
      fetched = parsed
    }
  } catch {
    // network unavailable — use curated value
  }

  return NextResponse.json({
    currentFy,
    rate: fetched ?? latest,
    source: fetched !== null ? "web" : "curated",
    history: EPF_RATES_BY_FY,
  })
}

function fyFromDate(d: Date): string {
  const year = d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear()
  return `${year}-${String((year + 1) % 100).padStart(2, "0")}`
}