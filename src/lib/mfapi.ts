// ── mfapi.in wrapper ────────────────────────────────────────────────────
// Free public API for Indian mutual fund NAVs. No auth, no rate limit (be respectful).
// Docs: https://www.mfapi.in/

export interface MfApiMeta {
  fund_house: string
  scheme_type: string
  scheme_category: string
  scheme_code: number
  scheme_name: string
}

export interface MfApiNav {
  date: string
  nav: string
}

export interface MfApiSchemeResponse {
  meta: MfApiMeta
  data: MfApiNav[]
  status: string
}

export async function fetchScheme(schemeCode: number, signal?: AbortSignal): Promise<MfApiSchemeResponse | null> {
  try {
    const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, { signal, cache: "no-store" })
    if (!res.ok) return null
    const json = (await res.json()) as MfApiSchemeResponse
    if (json.status !== "SUCCESS") return null
    return json
  } catch {
    return null
  }
}

export function computeRollingReturn(navs: MfApiNav[], years: number): number | null {
  if (navs.length < 2) return null
  const sorted = [...navs].sort((a, b) => parseNavDate(a.date).getTime() - parseNavDate(b.date).getTime())
  const latest = Number(sorted[sorted.length - 1]?.nav)
  const target = new Date(parseNavDate(sorted[sorted.length - 1]?.date ?? ""))
  target.setFullYear(target.getFullYear() - years)
  const targetStr = formatNavDate(target)
  let startIdx = sorted.findIndex((n) => parseNavDate(n.date) >= parseNavDate(targetStr))
  if (startIdx < 0) startIdx = 0
  const start = Number(sorted[startIdx]?.nav)
  if (!start || !latest) return null
  const yearsActual = (parseNavDate(sorted[sorted.length - 1]?.date ?? "").getTime() - parseNavDate(sorted[startIdx]?.date ?? "").getTime()) / (365.25 * 24 * 3600 * 1000)
  if (yearsActual <= 0) return null
  return (Math.pow(latest / start, 1 / yearsActual) - 1) * 100
}

export function computeConsistency(navs: MfApiNav[]): number | null {
  if (navs.length < 12) return null
  const sorted = [...navs].sort((a, b) => parseNavDate(a.date).getTime() - parseNavDate(b.date).getTime())
  const last12 = sorted.slice(-12)
  let positiveMonths = 0
  for (let i = 1; i < last12.length; i++) {
    const prev = Number(last12[i - 1]?.nav)
    const curr = Number(last12[i]?.nav)
    if (prev && curr > prev) positiveMonths++
  }
  return (positiveMonths / (last12.length - 1)) * 100
}

export function computeMaxDrawdown(navs: MfApiNav[]): number | null {
  if (navs.length < 2) return null
  const sorted = [...navs].sort((a, b) => parseNavDate(a.date).getTime() - parseNavDate(b.date).getTime())
  let peak = Number(sorted[0]?.nav)
  let maxDd = 0
  for (const n of sorted) {
    const v = Number(n.nav)
    if (v > peak) peak = v
    const dd = ((v - peak) / peak) * 100
    if (dd < maxDd) maxDd = dd
  }
  return maxDd
}

// mfapi.in returns dates in "DD-MM-YYYY" format
function parseNavDate(s: string): Date {
  if (!s) return new Date(NaN)
  const parts = s.split("-")
  if (parts.length === 3) {
    const [a, b, c] = parts
    // DD-MM-YYYY
    if (a && b && c && Number(a) > 12) {
      return new Date(Number(c), Number(b) - 1, Number(a))
    }
    // YYYY-MM-DD
    if (Number(a) > 1900) {
      return new Date(Number(a), Number(b) - 1, Number(c))
    }
  }
  return new Date(s)
}

function formatNavDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${day}-${m}-${y}`
}
