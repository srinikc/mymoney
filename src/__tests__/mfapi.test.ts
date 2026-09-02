import { describe, it, expect } from "vitest"
import { computeConsistency, computeMaxDrawdown, computeRollingReturn, type MfApiNav } from "../lib/mfapi"

const sampleNavs: MfApiNav[] = [
  { date: "01-01-2022", nav: "100" },
  { date: "01-06-2022", nav: "105" },
  { date: "01-01-2023", nav: "110" },
  { date: "01-06-2023", nav: "108" },
  { date: "01-01-2024", nav: "115" },
  { date: "01-06-2024", nav: "120" },
  { date: "01-01-2025", nav: "125" },
  { date: "01-06-2025", nav: "130" },
  { date: "01-01-2026", nav: "135" },
]

describe("mfapi date parsing", () => {
  it("parseNavDate handles DD-MM-YYYY", () => {
    const result = computeRollingReturn(sampleNavs, 1)
    expect(result).toBeGreaterThan(0)
  })

  it("parseNavDate handles YYYY-MM-DD", () => {
    const altNavs: MfApiNav[] = sampleNavs.map((n) => {
      const [d, m, y] = n.date.split("-")
      return { date: `${y}-${m}-${d}`, nav: n.nav }
    })
    const result = computeRollingReturn(altNavs, 1)
    expect(result).toBeGreaterThan(0)
  })
})

describe("computeRollingReturn", () => {
  it("returns null for insufficient data", () => {
    expect(computeRollingReturn([], 1)).toBe(null)
    expect(computeRollingReturn([sampleNavs[0]!], 1)).toBe(null)
  })

  it("returns positive return for rising NAVs", () => {
    const result = computeRollingReturn(sampleNavs, 1)
    expect(result).toBeGreaterThan(0)
  })
})

describe("computeConsistency", () => {
  it("returns null for insufficient data", () => {
    expect(computeConsistency([])).toBe(null)
  })

  it("returns 100 for strictly increasing NAVs", () => {
    const increasing: MfApiNav[] = Array.from({ length: 13 }, (_, i) => ({
      date: `01-${String(i + 1).padStart(2, "0")}-2024`,
      nav: String(100 + i),
    }))
    expect(computeConsistency(increasing)).toBe(100)
  })
})

describe("computeMaxDrawdown", () => {
  it("returns null for insufficient data", () => {
    expect(computeMaxDrawdown([])).toBe(null)
  })

  it("returns 0 for strictly increasing NAVs", () => {
    const increasing: MfApiNav[] = Array.from({ length: 10 }, (_, i) => ({
      date: `01-${String(i + 1).padStart(2, "0")}-2024`,
      nav: String(100 + i),
    }))
    expect(computeMaxDrawdown(increasing)).toBe(0)
  })

  it("returns negative drawdown for falling NAVs", () => {
    const falling: MfApiNav[] = [
      { date: "01-01-2024", nav: "200" },
      { date: "01-02-2024", nav: "180" },
      { date: "01-03-2024", nav: "150" },
      { date: "01-04-2024", nav: "160" },
    ]
    const dd = computeMaxDrawdown(falling)
    expect(dd).toBeLessThan(0)
  })
})
