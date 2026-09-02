import { describe, it, expect } from "vitest"
import { CURATED_FUNDS, UNIQUE_CURATED, CATEGORY_LABEL, SUB_CATEGORY_LABEL } from "../lib/curated-funds"

describe("curated-funds config", () => {
  it("exports more than 10 funds", () => {
    expect(CURATED_FUNDS.length).toBeGreaterThan(10)
  })

  it("has no duplicate scheme codes after dedup", () => {
    expect(UNIQUE_CURATED.length).toBeGreaterThan(20)
    const codes = UNIQUE_CURATED.map((f) => f.schemeCode)
    const uniqueCodes = new Set(codes)
    expect(uniqueCodes.size).toBe(codes.length)
  })

  it("every fund has required fields", () => {
    for (const f of UNIQUE_CURATED) {
      expect(f.schemeCode).toBeGreaterThan(0)
      expect(f.schemeName).toBeTruthy()
      expect(f.fundHouse).toBeTruthy()
      expect(["equity", "debt", "hybrid", "tax-saver", "index"]).toContain(f.category)
      expect(["kuvera", "groww", "zerodha"]).toContain(f.affiliatePlatform)
    }
  })

  it("covers all 5 categories", () => {
    const categories = new Set(UNIQUE_CURATED.map((f) => f.category))
    expect(categories.size).toBe(5)
  })

  it("category labels map exists", () => {
    expect(CATEGORY_LABEL.equity).toBe("Equity")
    expect(CATEGORY_LABEL.debt).toBe("Debt")
  })

  it("sub-category labels map exists", () => {
    expect(SUB_CATEGORY_LABEL["large-cap"]).toBe("Large Cap")
    expect(SUB_CATEGORY_LABEL["mid-cap"]).toBe("Mid Cap")
  })
})
